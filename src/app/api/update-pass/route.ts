// /app/api/update-pass/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { PassCategory } from '@/app/types';
import { getNextPassId } from '../passes/logic';

const updatePassSchema = z.object({
  id: z.string().min(1, "Document ID is required."),
  name: z.string().min(3, "Name must be at least 3 characters."),
  category: z.enum(['cargo', 'landside']),
  designation: z.string().min(2, "Designation is required."),
  organization: z.string().min(2, "Organization is required."),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "Invalid CNIC format."),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected."),
});

interface PassPatchPayload {
  name?: string;
  category?: PassCategory;
  designation?: string;
  organization?: string;
  cnic?: string;
  dateOfEntry?: string;
  dateOfExpiry?: string;
  areaAllowed?: string[];
  passId?: number;
  photo?: { _type: 'image'; asset: { _type: 'reference'; _ref: string; }; };
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const validationResult = updatePassSchema.safeParse({
      id: formData.get('id'),
      name: formData.get('name'),
      category: formData.get('category'),
      designation: formData.get('designation'),
      organization: formData.get('organization'),
      cnic: formData.get('cnic'),
      dateOfEntry: formData.get('dateOfEntry'),
      dateOfExpiry: formData.get('dateOfExpiry'),
      areaAllowed: formData.getAll('areaAllowed'),
    });

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
    }

    const { data: validatedData } = validationResult;
    const { id, ...dataToPatch } = validatedData;
    
    const existingPass = await client.fetch<{ category: PassCategory, cnic: string } | null>(
      `*[_type == "employeePass" && _id == $id][0]{category, cnic}`, { id }
    );

    if (!existingPass) return NextResponse.json({ error: 'Pass not found' }, { status: 404 });

    if (existingPass.cnic !== validatedData.cnic) {
      const cnicExists = await client.fetch(`*[_type == "employeePass" && cnic == $cnic && _id != $id][0]._id`, { cnic: validatedData.cnic, id });
      if (cnicExists) return NextResponse.json({ error: `CNIC ${validatedData.cnic} is already in use.` }, { status: 409 });
    }
    
    const patchPayload: PassPatchPayload = { ...dataToPatch };

    // THE CORE LOGIC: Regenerate passId only if the category has changed.
    if (existingPass.category !== validatedData.category) {
      // Fix: Pass both category and year as string as required by getNextPassId
      const currentYear = new Date().getFullYear().toString();
      patchPayload.passId = await getNextPassId(validatedData.category, currentYear);
    }

    const photo = formData.get('photo') as File | null;
    if (photo) {
      const photoAsset = await client.assets.upload('image', photo);
      patchPayload.photo = { _type: 'image', asset: { _type: 'reference', _ref: photoAsset._id } };
    }

    const updatedPass = await client.patch(id).set(patchPayload).commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ message: 'Pass updated successfully', pass: updatedPass }, { status: 200 });

  } catch (error) {
    console.error('Error updating pass:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to update pass', details: errorMessage }, { status: 500 });
  }
}