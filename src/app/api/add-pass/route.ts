// /app/api/add-pass/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import { getNextPassId } from '../passes/logic';
import { EmployeePass } from '@/app/types';

// --- UPDATED: Zod schema now includes all new fields from your form ---
const addPassSchema = z.object({
  // Personal Details
  name: z.string().min(3, "Name must be at least 3 characters."),
  fatherName: z.string().optional(),
  idNumber: z.string().min(1, "ID Number is required."), // Replaces cnic
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
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected."),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),

  // Security
  securityClearance: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    
    // Create an object from formData to validate with Zod
    const dataToValidate = {
      name: formData.get('name'),
      fatherName: formData.get('fatherName'),
      idNumber: formData.get('idNumber'),
      dateOfBirth: formData.get('dateOfBirth'),
      placeOfBirth: formData.get('placeOfBirth'),
      nationality: formData.get('nationality'),
      mobileNumber: formData.get('mobileNumber'),
      permanentAddress: formData.get('permanentAddress'),
      presentAddress: formData.get('presentAddress'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      category: formData.get('category'),
      areaAllowed: formData.getAll('areaAllowed'),
      dateOfEntry: formData.get('dateOfEntry'),
      dateOfExpiry: formData.get('dateOfExpiry'),
      securityClearance: formData.get('securityClearance'),
    };
    
    const validationResult = addPassSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
    }

    const { data: validatedData } = validationResult;
    const photoFile = formData.get('photo') as File | null;
    
    // --- UPDATED: Date overlap check now uses 'idNumber' ---
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
      return NextResponse.json({ error: "A pass for this ID Number already exists for an overlapping time period." }, { status: 400 });
    }

    const passYear = new Date(validatedData.dateOfEntry).getFullYear().toString();
    const newPassId = await getNextPassId(validatedData.category, passYear);

    const existingPassId = await writeClient.fetch(
      `*[_type == "employeePass" && category == $category && passId == $passId && string::startsWith(dateOfEntry, $year)][0]._id`,
      { category: validatedData.category, passId: newPassId, year: passYear }
    );

    if (existingPassId) {
      return NextResponse.json({ error: `A race condition occurred. Please try again.` }, { status: 409 });
    }

    let photoAsset = null;
    if (photoFile && photoFile.size > 0) {
      photoAsset = await writeClient.assets.upload('image', photoFile, { filename: photoFile.name });
    }

    // --- UPDATED: The document now includes all new validated fields ---
    const passDocument = {
      _type: 'employeePass',
      ...validatedData, // Spread all validated fields
      passId: newPassId,
      author: { _type: 'reference', _ref: session.user.id },
      ...(photoAsset && { photo: { _type: 'image', asset: { _type: 'reference', _ref: photoAsset._id } } }),
    };

    const createdDocument = await writeClient.create(passDocument);

    return NextResponse.json({ message: "Pass created successfully.", pass: createdDocument }, { status: 201 });

  } catch (error) {
    console.error("Error in /api/add-pass:", error);
    // Safely check for a 'responseBody' property, typical of Sanity client errors
    if (typeof error === 'object' && error !== null && 'responseBody' in error) {
        console.error("Sanity response body:", (error as { responseBody: unknown }).responseBody);
    }
    // Safely get the error message, falling back to a default
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}