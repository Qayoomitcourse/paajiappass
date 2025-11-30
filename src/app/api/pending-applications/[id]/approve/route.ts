// app/api/pending-applications/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverWriteClient as client } from "@/sanity/lib/serverClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import type { Image } from "sanity";

export const runtime = "nodejs";

// --- Types ---
interface PendingApplication {
  _id: string;
  organization: {
    passCategory?: string;
    organizationName?: string;
  };
  employees: {
    name?: string;
    fatherName?: string;
    idNumber?: string;
    cnic?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
    mobileNumber?: string;
    presentAddress?: string;
    permanentAddress?: string;
    designation?: string;
    areaRequired?: string[];
    areaAllowed?: string[];
    dateOfExpiry?: string;
    securityClearance?: string;
    securityDocuments?: string[];
    photo?: Image | null;
  }[];
}

interface EmployeePass {
  _type: "employeePass";
  passId: number;
  category: "landside" | "cargo";
  name?: string;
  fatherName?: string;
  idNumber: string;
  dateOfBirth: string | null;
  placeOfBirth: string;
  nationality: string;
  mobileNumber: string;
  presentAddress: string;
  permanentAddress: string;
  designation: string;
  organization: string;
  areaAllowed: string[];
  dateOfEntry: string;
  dateOfExpiry: string | null;
  securityClearance: string;
  securityDocuments: string[];
  photo: Image | null;
}

interface SanityTransactionResult {
  id: string;
}

interface SanityReference {
  _type: "reference";
  _ref: string;
}

// --- API Route ---
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: pendingId } = await params;
    if (!pendingId) {
      return NextResponse.json(
        { error: "Pending application id is required" },
        { status: 400 }
      );
    }

    const pending = await client.fetch<PendingApplication | null>(
      `*[_type == "pendingPass" && _id == $id][0]`,
      { id: pendingId }
    );

    if (!pending) {
      return NextResponse.json(
        { error: "Pending application not found" },
        { status: 404 }
      );
    }

    const employees = pending.employees || [];

    const last = await client.fetch<{ passId: number } | null>(
      `*[_type == "employeePass"] | order(passId desc)[0]{passId}`
    );

    const startPassId = (last?.passId ?? 0) + 1;

    const tx = client.transaction();
    const createdPasses: EmployeePass[] = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      const pass: EmployeePass = {
        _type: "employeePass",
        passId: startPassId + i,
        category: pending.organization?.passCategory
          ?.toLowerCase()
          ?.includes("lands")
          ? "landside"
          : "cargo",
        name: emp.name,
        fatherName: emp.fatherName,
        idNumber: emp.idNumber || emp.cnic || "",
        dateOfBirth: emp.dateOfBirth || null,
        placeOfBirth: emp.placeOfBirth || "",
        nationality: emp.nationality || "Pakistani",
        mobileNumber: emp.mobileNumber || "",
        presentAddress: emp.presentAddress || "",
        permanentAddress: emp.permanentAddress || "",
        designation: emp.designation || "",
        organization: pending.organization?.organizationName || "",
        areaAllowed: emp.areaRequired || emp.areaAllowed || [],
        dateOfEntry: new Date().toISOString(),
        dateOfExpiry: emp.dateOfExpiry || null,
        securityClearance: emp.securityClearance || "na",
        securityDocuments: emp.securityDocuments || [],
        photo: emp.photo || null,
      };

      tx.create(pass);
      createdPasses.push(pass);
    }

    // Patch pending application to mark approved
    tx.patch(pending._id, {
      set: {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: session.user.email || session.user.id,
      },
    });

    const res = await tx.commit({ autoGenerateArrayKeys: true });
   
    // Extract created IDs safely
    const createdIds: string[] = (res?.results || [])
      .map((r: SanityTransactionResult) => r.id)
      .filter(Boolean);

    // Create references
    const refs: SanityReference[] = createdIds.map((id) => ({
      _type: "reference",
      _ref: id,
    }));

    // Update pending application with approved pass references
    await client.patch(pending._id).set({ approvedPassRefs: refs }).commit();

    return NextResponse.json(
      { message: "Application approved", createdIds },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to approve pending application:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to approve: ${message}` },
      { status: 500 }
    );
  }
}