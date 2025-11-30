// app/api/pending-applications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export const runtime = 'nodejs';

// --- Type Definitions for Sanity Documents ---

interface SanityAsset {
  asset: {
    _ref: string;
    _type: "reference";
  };
  _type?: "image" | "file";
}

interface Employee {
  _type?: "employee";
  name?: string;
  photo?: SanityAsset | string;
  cnicFront?: SanityAsset | string;
  cnicBack?: SanityAsset | string;
  companyCardFront?: SanityAsset | string;
  companyCardBack?: SanityAsset | string;
  policeClearance?: SanityAsset | string;
  localPoliceVerification?: SanityAsset | string;
}

interface PendingApplication {
  _id: string;
  _type: "pendingPass";
  organization?: {
    organizationName?: string;
    passCategory?: string;
  };
  employees?: Employee[];
  feeReceipt?: SanityAsset | string;
  status?: string;
  totalEmployees?: number;
  employeesProcessed?: number;
  submittedAt?: string;
  adminRemarks?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

/**
 * GET: Fetch a single pending application by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: pendingId } = await params;
    
    if (!pendingId) {
      return NextResponse.json({ error: 'Application id is required' }, { status: 400 });
    }

    // Use the defined interface for the fetched data
    const pending = await client.fetch<PendingApplication | null>(
      `*[_type == "pendingPass" && _id == $id][0]`,
      { id: pendingId }
    );
    
    if (!pending) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ pending }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch pending application:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: `Failed to fetch application: ${message}` 
    }, { status: 500 });
  }
}

/**
 * DELETE: Delete a pending application by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: pendingId } = await params;
    
    if (!pendingId) {
      return NextResponse.json({ error: 'Pending application id is required' }, { status: 400 });
    }

    const pending = await client.fetch<PendingApplication | null>(
      `*[_type == "pendingPass" && _id == $id][0]`,
      { id: pendingId }
    );
    
    if (!pending) {
      return NextResponse.json({ error: 'Pending application not found' }, { status: 404 });
    }

    const employees = pending.employees || [];
    const assetRefs: string[] = [];
    
    // Define the keys to check in a type-safe way
    const assetFields: (keyof Employee)[] = [
      'photo', 'cnicFront', 'cnicBack', 'companyCardFront', 'companyCardBack', 
      'policeClearance', 'localPoliceVerification'
    ];

    // Collect asset references from all employees
    employees.forEach((emp) => {
      assetFields.forEach((field) => {
        const document = emp[field];
        // Type guard: check if it's an object with asset property
        if (
          document &&
          typeof document === 'object' &&
          'asset' in document &&
          document.asset &&
          typeof document.asset === 'object' &&
          '_ref' in document.asset
        ) {
          assetRefs.push(document.asset._ref);
        }
      });
    });

    // Collect fee receipt asset reference if exists
    const feeReceipt = pending.feeReceipt;
    if (
      feeReceipt &&
      typeof feeReceipt === 'object' &&
      'asset' in feeReceipt &&
      feeReceipt.asset &&
      typeof feeReceipt.asset === 'object' &&
      '_ref' in feeReceipt.asset
    ) {
      assetRefs.push(feeReceipt.asset._ref);
    }

    // Delete the pending application document
    await client.delete(pendingId);

    // Optionally delete associated assets
    // Uncomment below to enable physical asset deletion from Sanity
    // for (const assetRef of assetRefs) {
    //   try {
    //     await client.delete(assetRef);
    //   } catch (assetError) {
    //     console.warn('Failed to delete asset:', assetRef, assetError);
    //   }
    // }

    return NextResponse.json({ 
      message: 'Application deleted successfully',
      deletedId: pendingId,
      assetsFound: assetRefs.length
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete pending application:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: `Failed to delete application: ${message}` 
    }, { status: 500 });
  }
}

/**
 * PATCH: Update a pending application by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate that we're updating a pending application
    const exists = await client.fetch<boolean>(
      `count(*[_type == "pendingPass" && _id == $id]) > 0`,
      { id }
    );

    if (!exists) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update the application
    const result = await client
      .patch(id)
      .set({
        ...body,
        updatedAt: new Date().toISOString(),
        updatedBy: session.user.email || session.user.id
      })
      .commit();

    return NextResponse.json(
      { 
        success: true,
        message: 'Application updated successfully', 
        application: result 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update pending application:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to update: ${message}` },
      { status: 500 }
    );
  }
}