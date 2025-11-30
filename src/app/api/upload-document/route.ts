// app/api/upload-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverWriteClient as client } from "@/sanity/lib/serverClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export const runtime = "nodejs";

/**
 * POST: Upload a document/file to Sanity
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Determine file type (image or document)
    const fileType = file.type.startsWith("image/") ? "image" : "file";

    // Upload to Sanity
    const uploadedAsset = await client.assets.upload(fileType, file, {
      filename: file.name,
    });

    return NextResponse.json(
      {
        success: true,
        message: "File uploaded successfully",
        asset: {
          _type: fileType,
          asset: {
            _type: "reference",
            _ref: uploadedAsset._id,
          },
        },
        assetId: uploadedAsset._id,
        url: uploadedAsset.url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to upload document:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to upload: ${message}` },
      { status: 500 }
    );
  }
}