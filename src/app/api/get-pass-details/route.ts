// /app/api/get-pass-details/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // The 'id' parameter from the URL is the Sanity document _id.
  const pass_id = searchParams.get('id'); 
  
  const year = searchParams.get('year');
  const category = searchParams.get('category');

  if (!pass_id || !year || !category) {
    return NextResponse.json({ error: 'Pass Document ID, Year, and Category are required' }, { status: 400 });
  }

  try {
    // Step 1: Find the initial "anchor" pass using its unique document _id.
    const anchorPassQuery = `*[_type == "employeePass" && _id == $pass_id][0]`;
    const anchorPass = await client.fetch<EmployeePass>(anchorPassQuery, { pass_id });

    if (!anchorPass) {
      return NextResponse.json({ error: 'Pass not found for the specified ID' }, { status: 404 });
    }

    // Step 2: Use a unique identifier from the anchor pass to find the complete history.
    const personIdentifier = anchorPass.idNumber || anchorPass.cnic;
    
    if (!personIdentifier) {
        return NextResponse.json({ error: 'Could not find a unique identifier (CNIC or ID Number) on the pass record.' }, { status: 404 });
    }

    const allPassesQuery = `*[_type == "employeePass" && (idNumber == $personIdentifier || cnic == $personIdentifier)] {
        _id, _createdAt, passId, name, fatherName, designation, organization,
        idNumber, cnic, mobileNumber, dateOfBirth, placeOfBirth, nationality,
        permanentAddress, presentAddress, securityClearance, securityClearanceCertificate,
        category, areaAllowed, dateOfEntry, dateOfExpiry, photo,
        author->{_id, name}
      } | order(dateOfEntry desc)`;
      
    const passHistory = await client.fetch<EmployeePass[]>(allPassesQuery, { personIdentifier });

    if (!passHistory || passHistory.length === 0) {
      return NextResponse.json({ error: 'Could not find pass history' }, { status: 404 });
    }
    
    const latestPass = passHistory[0];
    
    // Fixed: Type-safe way to find the most recent photo
    const mostRecentPhoto = passHistory.find(p => {
      if (!p.photo) return false;
      
      // Check if photo is a Sanity image object with asset
      if (typeof p.photo === 'object' && p.photo !== null && 'asset' in p.photo) {
        return p.photo.asset !== null && p.photo.asset !== undefined;
      }
      
      // Check if photo is a string URL
      if (typeof p.photo === 'string') {
        return p.photo.length > 0;
      }
      
      return false;
    })?.photo || null;

    const responseData = {
      personDetails: { ...latestPass, photo: mostRecentPhoto },
      passHistory: passHistory,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching pass details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}