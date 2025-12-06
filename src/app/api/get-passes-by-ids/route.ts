import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { client } from '@/sanity/lib/client';
import { EmployeePass } from '@/app/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { passIds, category, year } = body;

    console.log(`\n--- DEBUG FETCH REQUEST ---`);
    console.log(`Looking for: Year [${year}], Category [${category}], IDs [${passIds}]`);

    if (!Array.isArray(passIds) || passIds.length === 0 || !category || !year) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Prepare IDs (Handle both Number 1 and String "0001")
    const numericIds = passIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    const stringIds = passIds; // Keep original strings too, just in case

    // 2. BROAD QUERY: Fetch ALL passes with these IDs (Ignore Year/Category for now)
    // We will filter in JavaScript. This ensures we don't miss data due to syntax errors.
    const query = `*[_type == "employeePass" && (passId in $numericIds || passId in $stringIds)] {
      _id,
      passId,
      name,
      designation,
      organization,
      idNumber,
      cnic,
      dateOfExpiry,
      dateOfEntry,
      category,
      "photo": photo.asset->url,
      areaAllowed
    }`;

    const rawEmployees = await client.fetch<EmployeePass[]>(query, { numericIds, stringIds });

    console.log(`> Raw Database Results: Found ${rawEmployees.length} total records for these IDs.`);

    // 3. JAVASCRIPT FILTERING (Strict & Debuggable)
    const validEmployees = rawEmployees.filter(emp => {
      // A. Normalize Data
      const empId = String(emp.passId); // Convert DB ID to string "1"
      const empCategory = (emp.category || '').toLowerCase().trim(); // "cargo"
      const targetCategory = category.toLowerCase().trim(); // "cargo"
      const empExpiry = emp.dateOfExpiry || ''; // "2026-12-31"

      // B. Debug Logs for each record
      const isIdMatch = passIds.some(reqId => parseInt(reqId) === parseInt(empId));
      const isCatMatch = empCategory === targetCategory;
      const isYearMatch = empExpiry.startsWith(year);

      if (!isIdMatch) return false; // Should not happen given the query

      if (!isCatMatch) {
        console.log(`  X Skipping Pass [${empId}]: Category mismatch (DB: '${empCategory}' vs Req: '${targetCategory}')`);
        return false;
      }

      if (!isYearMatch) {
        console.log(`  X Skipping Pass [${empId}]: Year mismatch (DB Expiry: '${empExpiry}' vs Req Year: '${year}')`);
        return false;
      }

      console.log(`  ✓ MATCH: Pass [${empId}] for ${year}`);
      return true;
    });

    // 4. Map Data for Response
    const mappedEmployees = validEmployees.map(employee => ({
      ...employee,
      cnic: employee.cnic || employee.idNumber || 'N/A'
    }));

    // 5. Calculate Missing IDs
    const foundDbIds = new Set(mappedEmployees.map(e => String(e.passId)));
    
    // Check original inputs against found results
    const notFoundIds = passIds.filter(rawInputId => {
        const normalizedInput = String(parseInt(rawInputId, 10));
        return !foundDbIds.has(normalizedInput);
    });

    if (notFoundIds.length > 0) {
      console.log(`> WARNING: Could not find IDs: ${notFoundIds.join(', ')}`);
    }

    return NextResponse.json({
      employees: mappedEmployees,
      notFoundIds,
      totalFound: mappedEmployees.length
    });

  } catch (error) {
    console.error('Error in /api/get-passes-by-ids:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}