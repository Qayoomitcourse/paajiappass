// /app/api/passes/route.ts

import { NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// GROQ query to fetch all employee passes with all fields
const PASSES_QUERY = `*[_type == "employeePass"] | order(_createdAt desc) {
  _id,
  _createdAt,
  _updatedAt,
  passId,
  category,
  name,
  fatherName,
  dateOfBirth,
  placeOfBirth,
  nationality,
  idNumber,
  mobileNumber,
  permanentAddress,
  presentAddress,
  photo,
  designation,
  organization,
  areaAllowed,
  dateOfEntry,
  dateOfExpiry,
  securityClearance,
  author->{
    _id,
    name
  }
}`;

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch passes from Sanity
    const passes = await client.fetch(PASSES_QUERY);
    
    return NextResponse.json(passes);
  } catch (error) {
    console.error('Error fetching passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}