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
    const stringIds = passIds;

    // 2. BROAD QUERY: Fetch ALL passes with these IDs
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

    // 3. JAVASCRIPT FILTERING (Fixed Year Logic)
    const validEmployees = rawEmployees.filter(emp => {
      // A. Normalize Data
      const empId = String(emp.passId);
      const empCategory = (emp.category || '').toLowerCase().trim();
      const targetCategory = category.toLowerCase().trim();
      const empEntry = emp.dateOfEntry || '';
      const empExpiry = emp.dateOfExpiry || '';

      // B. Year Matching Logic (FIXED)
      // Check if the requested year falls within the pass validity period
      const entryYear = empEntry ? new Date(empEntry).getFullYear() : null;
      const expiryYear = empExpiry ? new Date(empExpiry).getFullYear() : null;
      const requestedYear = parseInt(year, 10);

      // Pass is valid for the year if:
      // - Entry year matches the requested year, OR
      // - Expiry year matches the requested year, OR
      // - The requested year falls between entry and expiry years
      let isYearMatch = false;
      if (entryYear && expiryYear) {
        isYearMatch = requestedYear >= entryYear && requestedYear <= expiryYear;
      } else if (entryYear) {
        isYearMatch = requestedYear === entryYear;
      } else if (expiryYear) {
        isYearMatch = requestedYear === expiryYear;
      }

      // C. Debug Logs
      const isIdMatch = passIds.some(reqId => parseInt(reqId, 10) === parseInt(empId));
      const isCatMatch = empCategory === targetCategory;

      if (!isIdMatch) return false;

      if (!isCatMatch) {
        console.log(`  X Skipping Pass [${empId}]: Category mismatch (DB: '${empCategory}' vs Req: '${targetCategory}')`);
        return false;
      }

      if (!isYearMatch) {
        console.log(`  X Skipping Pass [${empId}]: Year mismatch (Entry: ${entryYear}, Expiry: ${expiryYear}, Requested: ${requestedYear})`);
        return false;
      }

      console.log(`  ✓ MATCH: Pass [${empId}] for ${year} (Entry: ${entryYear}, Expiry: ${expiryYear})`);
      return true;
    });

    // 4. Map Data for Response
    const mappedEmployees = validEmployees.map(employee => ({
      ...employee,
      cnic: employee.cnic || employee.idNumber || 'N/A'
    }));

    // 5. Calculate Missing IDs
    const foundDbIds = new Set(mappedEmployees.map(e => String(e.passId)));
    const notFoundIds = passIds.filter(rawInputId => {
      const normalizedInput = String(parseInt(rawInputId, 10));
      return !foundDbIds.has(normalizedInput);
    });

    if (notFoundIds.length > 0) {
      console.log(`> WARNING: Could not find IDs: ${notFoundIds.join(', ')}`);
    }

    console.log(`\n--- FINAL RESULTS ---`);
    console.log(`Total Found: ${mappedEmployees.length}`);
    console.log(`Not Found: ${notFoundIds.join(', ') || 'None'}`);

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