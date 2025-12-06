// /app/api/security-clearance/route.ts
// API to create new reusable security clearance certificates

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { writeClient } from '@/sanity/lib/client';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    
    const certificateNumber = formData.get('certificateNumber') as string;
    const organization = formData.get('organization') as string;
    const clearanceType = formData.get('clearanceType') as string;
    const issueDate = formData.get('issueDate') as string;
    const expiryDate = formData.get('expiryDate') as string | null;
    const numberOfEmployees = parseInt(formData.get('numberOfEmployees') as string);
    const issuingAuthority = formData.get('issuingAuthority') as string | null;
    const remarks = formData.get('remarks') as string | null;
    const documentFile = formData.get('document') as File;

    // Validation
    if (!certificateNumber || !organization || !clearanceType || !issueDate || !numberOfEmployees) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!documentFile || documentFile.size === 0) {
      return NextResponse.json({ error: 'Certificate document is required' }, { status: 400 });
    }

    // Upload document
    const documentAsset = await writeClient.assets.upload('file', documentFile, {
      filename: `security_cert_${certificateNumber}_${Date.now()}_${documentFile.name}`,
    });

    // Create security clearance document
    const clearanceDoc = await writeClient.create({
      _type: 'securityClearance',
      certificateNumber,
      organization,
      clearanceType,
      issueDate,
      expiryDate: expiryDate || undefined,
      numberOfEmployees,
      issuingAuthority: issuingAuthority || undefined,
      remarks: remarks || undefined,
      document: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: documentAsset._id,
        },
      },
      isActive: true,
      createdBy: {
        _type: 'reference',
        _ref: session.user.id,
      },
    });

    return NextResponse.json({
      message: 'Security clearance created successfully',
      clearance: clearanceDoc,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating security clearance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create security clearance' },
      { status: 500 }
    );
  }
}