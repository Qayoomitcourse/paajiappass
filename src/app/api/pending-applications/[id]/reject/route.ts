// app/api/pending-applications/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverWriteClient as client } from "@/sanity/lib/serverClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export const runtime = "nodejs";

interface RejectRequestBody {
  remarks?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: pendingId } = await params;
    if (!pendingId)
      return NextResponse.json(
        { error: "Pending application id is required" },
        { status: 400 }
      );

    const body: RejectRequestBody = await request.json().catch(() => ({}));
    const remarks = body.remarks || "";

    const result = await client
      .patch(pendingId)
      .set({
        status: "rejected",
        adminRemarks: remarks,
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.user.email || session.user.id,
      })
      .commit();

    return NextResponse.json(
      { message: "Application rejected", pending: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to reject pending application:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to reject: ${message}` },
      { status: 500 }
    );
  }
}