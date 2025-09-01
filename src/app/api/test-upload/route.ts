// Create this file: /app/api/test-upload/route.ts
// This will help you test if Sanity uploads work independently

import { NextRequest, NextResponse } from 'next/server';
import { writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  try {
    console.log("Testing Sanity upload...");
    
    const formData = await req.formData();
    const file = formData.get('testFile') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    console.log("File received:", file.name, file.size, file.type);
    
    // Test basic upload
    const asset = await writeClient.assets.upload('image', file, { 
      filename: `test_${Date.now()}_${file.name}`,
    });
    
    console.log("Upload successful:", asset._id);
    
    // Test document creation with file
    const testDoc = await writeClient.create({
      _type: 'employeePass', // Use your existing schema
      name: 'Test Upload',
      designation: 'Test',
      organization: 'Test Org',
      category: 'cargo',
      areaAllowed: ['Import'],
      dateOfEntry: '2025-01-01',
      dateOfExpiry: '2025-12-31',
      idNumber: 'TEST-' + Date.now(),
      isExempt: true,
      exemptionRemarks: 'Test upload',
      photo: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id }
      }
    });
    
    console.log("Test document created:", testDoc._id);
    
    return NextResponse.json({ 
      success: true, 
      assetId: asset._id,
      documentId: testDoc._id,
      message: "Sanity upload test successful" 
    });
    
  } catch (error) {
    console.error("Sanity upload test failed:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Upload test failed" 
    }, { status: 500 });
  }
}