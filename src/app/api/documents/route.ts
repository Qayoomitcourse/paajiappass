// /app/api/documents/route.ts
// API to fetch available security clearances and payment receipts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import { client } from '@/sanity/lib/client';

// GET: Fetch all active documents
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'security' or 'payment'
    const organization = searchParams.get('organization');

    if (type === 'security') {
      // Fetch active security clearances
      const query = organization
        ? `*[_type == "securityClearance" && isActive == true && organization == $organization] | order(_createdAt desc)`
        : `*[_type == "securityClearance" && isActive == true] | order(_createdAt desc)`;

      const clearances = await client.fetch(
        query,
        organization ? { organization } : {}
      );

      return NextResponse.json({ clearances }, { status: 200 });
    } 
    
    else if (type === 'payment') {
      // Fetch active payment receipts
      const query = organization
        ? `*[_type == "paymentReceipt" && isActive == true && organization == $organization] | order(_createdAt desc)`
        : `*[_type == "paymentReceipt" && isActive == true] | order(_createdAt desc)`;

      const receipts = await client.fetch(
        query,
        organization ? { organization } : {}
      );

      return NextResponse.json({ receipts }, { status: 200 });
    }
    
    else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}