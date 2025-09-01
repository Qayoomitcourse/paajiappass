import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { client } from '@/sanity/lib/client';


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('API: No session found');
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idNumber = searchParams.get('idNumber');

    console.log('API: Received ID Number:', idNumber);

    if (!idNumber) {
      return NextResponse.json({ error: "ID Number parameter is required" }, { status: 400 });
    }

    const trimmedId = idNumber.trim();
    
    if (trimmedId.length < 8) {
      return NextResponse.json({ 
        error: "ID number too short. Minimum 8 characters required." 
      }, { status: 400 });
    }

    // Step 1: Check what's actually in the database first
    console.log('=== DEBUGGING DATABASE CONTENT ===');
    const allDocsQuery = `*[_type == "employeePass"] {
      _id,
      passId,
      cnic,
      idNumber,
      name
    }`;
    const allDocs = await client.fetch(allDocsQuery);
    console.log('API: ALL documents in database:', JSON.stringify(allDocs, null, 2));
    console.log('API: Total documents found:', allDocs.length);

    // Step 2: Try exact match first (both fields)
    console.log('=== TRYING EXACT MATCHES ===');
    console.log('Searching for exact CNIC match:', trimmedId);
    
    const exactCnicQuery = `*[_type == "employeePass" && cnic == $searchId][0]`;
    const exactCnicMatch = await client.fetch(exactCnicQuery, { searchId: trimmedId });
    console.log('Exact CNIC match result:', exactCnicMatch);

    if (exactCnicMatch) {
      const normalizedPass = {
        ...exactCnicMatch,
        idNumber: exactCnicMatch.idNumber || exactCnicMatch.cnic || trimmedId,
        author: undefined
      };

      return NextResponse.json({ 
        message: "Pass found successfully (CNIC exact match)",
        pass: normalizedPass
      }, { status: 200 });
    }

    // Step 3: Try exact idNumber match
    const exactIdQuery = `*[_type == "employeePass" && idNumber == $searchId][0]`;
    const exactIdMatch = await client.fetch(exactIdQuery, { searchId: trimmedId });
    console.log('Exact idNumber match result:', exactIdMatch);

    if (exactIdMatch) {
      const normalizedPass = {
        ...exactIdMatch,
        author: undefined
      };

      return NextResponse.json({ 
        message: "Pass found successfully (idNumber exact match)",
        pass: normalizedPass
      }, { status: 200 });
    }

    // Step 4: Try without dashes for CNIC
    const noDashesId = trimmedId.replace(/[-\s]/g, '');
    console.log('Trying without dashes:', noDashesId);
    
    const noDashCnicQuery = `*[_type == "employeePass" && cnic == $searchId][0]`;
    const noDashCnicMatch = await client.fetch(noDashCnicQuery, { searchId: noDashesId });
    console.log('No-dash CNIC match result:', noDashCnicMatch);

    if (noDashCnicMatch) {
      const normalizedPass = {
        ...noDashCnicMatch,
        idNumber: noDashCnicMatch.idNumber || noDashCnicMatch.cnic || trimmedId,
        author: undefined
      };

      return NextResponse.json({ 
        message: "Pass found successfully (CNIC no-dash match)",
        pass: normalizedPass
      }, { status: 200 });
    }

    // Step 5: Try case-insensitive search
    const lowerCaseQuery = `*[_type == "employeePass" && lower(cnic) == lower($searchId)][0]`;
    const lowerCaseMatch = await client.fetch(lowerCaseQuery, { searchId: trimmedId });
    console.log('Case-insensitive CNIC match result:', lowerCaseMatch);

    if (lowerCaseMatch) {
      const normalizedPass = {
        ...lowerCaseMatch,
        idNumber: lowerCaseMatch.idNumber || lowerCaseMatch.cnic || trimmedId,
        author: undefined
      };

      return NextResponse.json({ 
        message: "Pass found successfully (case-insensitive match)",
        pass: normalizedPass
      }, { status: 200 });
    }

    console.log('=== NO MATCHES FOUND ===');
    return NextResponse.json({ 
      message: "No pass found for this ID number",
      pass: null 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("API Error in /api/find-pass-by-id:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}