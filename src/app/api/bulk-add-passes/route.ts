// /app/api/bulk-add-passes/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import { getNextPassId } from '../passes/logic';
import { EmployeePass } from '@/app/types';

// Updated schema to match the new field structure
const bulkPassSchema = z.object({
  // Personal Details
  name: z.string().min(3, "Name must be at least 3 characters."),
  fatherName: z.string().optional(),
  idNumber: z.string().min(1, "ID Number is required."), // Updated from cnic
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  
  // Contact Details
  mobileNumber: z.string().optional(),
  permanentAddress: z.string().optional(),
  presentAddress: z.string().optional(),
  
  // Employment Details
  designation: z.string().min(2, "Designation is required."),
  organization: z.string().min(2, "Organization is required."),

  // Pass Specifics
  category: z.enum(['cargo', 'landside']),
  areaAllowed: z.string().transform((str) => {
    // Handle both comma-separated strings and arrays
    if (typeof str === 'string') {
      return str.split(',').map(area => area.trim()).filter(Boolean);
    }
    return [];
  }).pipe(z.array(z.string()).min(1, "At least one area must be selected.")),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),

  // Security
  securityClearance: z.string().optional(),
});

interface ImportResult {
  row: number;
  status: 'Success' | 'Error';
  message: string | object;
  passId?: number;
  name?: string;
}



export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { passes } = await req.json();

    if (!Array.isArray(passes) || passes.length === 0) {
      return NextResponse.json({ 
        error: "Invalid request. Expected an array of passes." 
      }, { status: 400 });
    }

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each pass individually
    for (let i = 0; i < passes.length; i++) {
      const rowNumber = i + 2; // +2 because Excel starts from row 1 and we skip header
      const passData = passes[i];

      try {
        // Validate the pass data
        const validationResult = bulkPassSchema.safeParse({
          ...passData,
          nationality: passData.nationality || 'Pakistani',
          securityClearance: passData.securityClearance || 'na',
        });

        if (!validationResult.success) {
          results.push({
            row: rowNumber,
            status: 'Error',
            message: validationResult.error.flatten().fieldErrors,
          });
          errorCount++;
          continue;
        }

        const validatedData = validationResult.data;

        // Check for existing passes with overlapping dates for the same ID
        const existingPasses = await writeClient.fetch<EmployeePass[]>(
          `*[_type == "employeePass" && idNumber == $idNumber]`,
          { idNumber: validatedData.idNumber }
        );

        const newEntryDate = new Date(validatedData.dateOfEntry);
        const newExpiryDate = new Date(validatedData.dateOfExpiry);
        
        const hasOverlap = existingPasses.some(pass => {
          if (!pass.dateOfEntry || !pass.dateOfExpiry) return false;
          const existingEntryDate = new Date(pass.dateOfEntry);
          const existingExpiryDate = new Date(pass.dateOfExpiry);
          return newEntryDate <= existingExpiryDate && newExpiryDate >= existingEntryDate;
        });

        if (hasOverlap) {
          results.push({
            row: rowNumber,
            status: 'Error',
            message: `A pass for ID ${validatedData.idNumber} already exists for an overlapping time period.`,
            name: validatedData.name,
          });
          errorCount++;
          continue;
        }

        // Generate new pass ID
        const passYear = new Date(validatedData.dateOfEntry).getFullYear().toString();
        const newPassId = await getNextPassId(validatedData.category, passYear);

        // Double-check for race condition
        const existingPassId = await writeClient.fetch(
          `*[_type == "employeePass" && category == $category && passId == $passId && string::startsWith(dateOfEntry, $year)][0]._id`,
          { 
            category: validatedData.category, 
            passId: newPassId, 
            year: passYear 
          }
        );

        if (existingPassId) {
          results.push({
            row: rowNumber,
            status: 'Error',
            message: `Race condition detected for pass ID ${newPassId}. Please retry this row.`,
            name: validatedData.name,
          });
          errorCount++;
          continue;
        }

        // Create the pass document
        const passDocument = {
          _type: 'employeePass',
          ...validatedData,
          passId: newPassId,
          author: { _type: 'reference', _ref: session.user.id },
          // No photo for bulk import - can be added later if needed
        };

        // Fix: Remove unused variable by using the creation result
        await writeClient.create(passDocument);

        results.push({
          row: rowNumber,
          status: 'Success',
          message: `Pass created successfully for ${validatedData.name}`,
          passId: newPassId,
          name: validatedData.name,
        });
        successCount++;

      } catch (error: unknown) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred during pass creation.";
        results.push({
          row: rowNumber,
          status: 'Error',
          message: errorMessage,
          name: passData.name || 'Unknown',
        });
        errorCount++;
      }
    }

    // Return comprehensive results
    return NextResponse.json({ 
      message: `Bulk import completed. ${successCount} passes created successfully, ${errorCount} failed.`,
      summary: {
        total: passes.length,
        successful: successCount,
        failed: errorCount,
      },
      results 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error in /api/bulk-add-passes:", error);
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}