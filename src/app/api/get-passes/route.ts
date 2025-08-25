// /app/api/get-passes/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // --- THIS IS THE CRITICAL FIX ---
    // This query is now explicit, listing every field to ensure it is fetched.
    // It includes both 'idNumber' and the old 'cnic' for backwards compatibility.
    const query = `*[_type == "employeePass"]{
      _id, _createdAt, passId, name, fatherName, designation, organization,
      idNumber, cnic, mobileNumber, dateOfBirth, placeOfBirth, nationality,
      permanentAddress, presentAddress, securityClearance, category, areaAllowed,
      dateOfEntry, dateOfExpiry, photo,
      author->{_id, name}
    } | order(_createdAt desc)`;

    const passes = await client.fetch<EmployeePass[]>(query);
    
    return NextResponse.json(passes);

  } catch (error) {
    console.error('Failed to fetch passes:', error);
    return NextResponse.json({ error: 'Failed to fetch data from the database.' }, { status: 500 });
  }
}