// /app/api/get-passes-by-ids/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Add authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { passIds, category, year } = body;

    // Validate that all required parameters were sent from the print page.
    if (!Array.isArray(passIds) || passIds.length === 0 || !category || !year) {
      return NextResponse.json({ error: 'Pass IDs, category, and year are required parameters' }, { status: 400 });
    }

    // Sanitize the input to ensure we only query for numbers.
    const numericPassIds = passIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericPassIds.length === 0) {
        return NextResponse.json({ error: 'No valid numeric Pass IDs were provided' }, { status: 400 });
    }

    // The query to find the exact passes for a specific year and category.
    // Updated to use the same field mapping as the other API route
    const query = `*[_type == "employeePass" && 
      category == $category && 
      string::startsWith(dateOfEntry, $year) &&
      passId in $numericPassIds
    ] {
      _id,
      passId,
      name,
      designation,
      organization,
      idNumber,
      cnic,
      dateOfExpiry,
      category,
      "photo": photo.asset->url,
      areaAllowed
    }`;
    
    const params = {
      category,
      year,
      numericPassIds
    };

    const employees = await client.fetch<EmployeePass[]>(query, params);

    // Map the data to ensure CNIC is properly handled (use idNumber as fallback)
    const mappedEmployees = employees.map(employee => ({
      ...employee,
      cnic: employee.cnic || employee.idNumber || null
    }));

    // Determine which IDs were found vs. not found and return all the data.
    const foundIds = new Set(mappedEmployees.map(e => e.passId.toString()));
    const notFoundIds = passIds.filter(id => !foundIds.has(id));

    return NextResponse.json({
      employees: mappedEmployees,
      notFoundIds,
      totalFound: mappedEmployees.length
    });

  } catch (error) {
    console.error('Error in /api/get-passes-by-ids:', error);
    return NextResponse.json(
        { 
          error: 'Internal Server Error', 
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        }, 
        { status: 500 }
    );
  }
}