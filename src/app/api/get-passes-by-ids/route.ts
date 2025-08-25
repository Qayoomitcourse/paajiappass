// /app/api/get-passes-by-ids/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export async function POST(request: NextRequest) {
  // The entire logic is wrapped in a try...catch block to guarantee a response.
  try {
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
      cnic,
      dateOfExpiry,
      category,
      "photo": photo.asset->url, // Fetch the direct image URL
      areaAllowed
    }`;
    
    const params = {
      category,
      year,
      numericPassIds
    };

    const employees = await client.fetch<EmployeePass[]>(query, params);

    // Determine which IDs were found vs. not found and return all the data.
    const foundIds = new Set(employees.map(e => e.passId.toString()));
    const notFoundIds = passIds.filter(id => !foundIds.has(id));

    return NextResponse.json({
      employees,
      notFoundIds,
      totalFound: employees.length
    });

  } catch (error) {
    // This catch block ensures that if ANY error occurs above, a response is still sent.
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