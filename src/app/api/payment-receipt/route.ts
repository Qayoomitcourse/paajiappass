// /app/api/payment-receipt/route.ts
// API to create new reusable payment receipts

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
    
    const receiptNumber = formData.get('receiptNumber') as string;
    const organization = formData.get('organization') as string;
    const totalAmount = formData.get('totalAmount') as string;
    const dateOfPayment = formData.get('dateOfPayment') as string;
    const bank = formData.get('bank') as string;
    const otherBankName = formData.get('otherBankName') as string | null;
    const paymentMethod = formData.get('paymentMethod') as string;
    const chequeNumber = formData.get('chequeNumber') as string | null;
    const numberOfEmployees = parseInt(formData.get('numberOfEmployees') as string);
    const amountPerEmployee = formData.get('amountPerEmployee') as string | null;
    const remarks = formData.get('remarks') as string | null;
    const receiptImageFile = formData.get('receiptImage') as File;

    // Validation
    if (!receiptNumber || !organization || !totalAmount || !dateOfPayment || !bank || !paymentMethod || !numberOfEmployees) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!receiptImageFile || receiptImageFile.size === 0) {
      return NextResponse.json({ error: 'Receipt image is required' }, { status: 400 });
    }

    // Upload receipt image
    const receiptAsset = await writeClient.assets.upload('image', receiptImageFile, {
      filename: `receipt_${receiptNumber}_${Date.now()}_${receiptImageFile.name}`,
    });

    // Create payment receipt document
    const receiptDoc = await writeClient.create({
      _type: 'paymentReceipt',
      receiptNumber,
      organization,
      totalAmount,
      dateOfPayment,
      bank,
      otherBankName: otherBankName || undefined,
      paymentMethod,
      chequeNumber: chequeNumber || undefined,
      numberOfEmployees,
      amountPerEmployee: amountPerEmployee || undefined,
      remarks: remarks || undefined,
      receiptImage: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: receiptAsset._id,
        },
      },
      isActive: true,
      createdBy: {
        _type: 'reference',
        _ref: session.user.id,
      },
    });

    return NextResponse.json({
      message: 'Payment receipt created successfully',
      receipt: receiptDoc,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payment receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment receipt' },
      { status: 500 }
    );
  }
}