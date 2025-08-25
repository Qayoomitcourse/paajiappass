// /app/api/find-pass-by-id/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idNumber = searchParams.get('idNumber');

    if (!idNumber) {
      return NextResponse.json({ error: "ID Number parameter is required" }, { status: 400 });
    }

    // Validate ID number format
    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/; // CNIC format: 12345-1234567-1
    const cnicSimplePattern = /^\d{13}$/; // Simple CNIC: 1234512345671
    const passportPattern = /^[A-Z]{2}\d{7}$/i; // Passport format: AB1234567 (case insensitive)

    if (!cnicPattern.test(idNumber) && !cnicSimplePattern.test(idNumber) && !passportPattern.test(idNumber)) {
      return NextResponse.json({ 
        error: "Invalid ID format. Use CNIC (12345-1234567-1) or Passport (AB1234567) format." 
      }, { status: 400 });
    }

    // Query to find the most recent pass for this ID number
    // We'll sort by _createdAt to get the latest entry
    const query = `
      *[_type == "employeePass" && idNumber == $idNumber] | order(_createdAt desc)[0] {
        _id,
        _createdAt,
        passId,
        name,
        fatherName,
        idNumber,
        dateOfBirth,
        placeOfBirth,
        nationality,
        mobileNumber,
        permanentAddress,
        presentAddress,
        designation,
        organization,
        category,
        areaAllowed,
        dateOfEntry,
        dateOfExpiry,
        securityClearance,
        photo,
        author
      }
    `;

    const pass = await client.fetch<EmployeePass | null>(query, { idNumber });

    if (!pass) {
      return NextResponse.json({ 
        message: "No pass found for this ID number",
        pass: null 
      }, { status: 200 });
    }

    // Return the pass data (excluding sensitive information if needed)
    return NextResponse.json({ 
      message: "Pass found successfully",
      pass: {
        ...pass,
        // You can exclude certain fields if needed for security
        // For example, you might want to exclude the author field
        author: undefined
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error in /api/find-pass-by-id:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}