// app/api/qr-scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { client } from "@/sanity/lib/client";
import imageUrlBuilder from "@sanity/image-url";
import { SanityImageSource } from "@sanity/image-url/lib/types/types";

// --- Type Definitions ---

interface EmployeePass {
  _id: string;
  _createdAt: string;
  passId: number;
  name?: string;
  fatherName?: string;
  designation?: string;
  organization?: string;
  cnic?: string;
  idNumber?: string;
  category?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  securityClearance?: string;
  areaAllowed?: string[];
  dateOfEntry?: string;
  dateOfExpiry?: string;
  photo?: SanityImageSource;
  photoUrl?: string;
  author?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface QueryParams {
  passIdStr: string;
  passIdNum: number;
  category?: string;
}

// Configure image builder
const builder = imageUrlBuilder(client);

// Use a specific type for the image source
function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export async function GET(req: NextRequest) {
  try {
    const headers = {
      "Cache-Control": "no-store, max-age=0",
    };

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers }
      );
    }

    const { searchParams } = new URL(req.url);
    let code = searchParams.get("qrCode") || searchParams.get("idNumber");

    if (!code) {
      return NextResponse.json(
        { error: "QR Code or ID Number parameter is required" },
        { status: 400, headers }
      );
    }

    code = code.trim();

    let passId: string = code;
    let year: string | null = null;
    let category: string | null = null;

    try {
      const url = new URL(code);
      const pathSegments = url.pathname.split("/").filter(Boolean);

      if (pathSegments.length >= 2) {
        if (pathSegments[0].includes("cargo")) {
          category = "cargo";
        } else if (pathSegments[0].includes("landside")) {
          category = "landside";
        }

        passId = pathSegments[1];

        const yearParam = url.searchParams.get("year");
        if (yearParam) {
          year = yearParam;
        } else if (pathSegments.length >= 3) {
          year = pathSegments[2];
        }
      }
    } catch {
      // Removed unused '(e)' variable
      console.log("Not a URL, treating as direct identifier:", code);
    }

    console.log("🔍 QR Scan Request:", { passId, category, year });

    if (passId.length < 1) {
      return NextResponse.json(
        { error: "Invalid pass identifier" },
        { status: 400, headers }
      );
    }

    let query = `*[_type == "employeePass" && (
      passId == $passIdNum || 
      passId == $passIdStr ||
      cnic == $passIdStr || 
      idNumber == $passIdStr
    )`;

    if (category) {
      query += ` && category == $category`;
    }

    query += `]{
      _id, _createdAt, passId, name, fatherName, designation, organization,
      cnic, idNumber, category, dateOfBirth, placeOfBirth, nationality,
      mobileNumber, permanentAddress, presentAddress, securityClearance,
      areaAllowed, dateOfEntry, dateOfExpiry, photo,
      "photoUrl": photo.asset->url,
      "author": author->{ _id, name, email }
    }`;

    // Use the specific QueryParams type
    const params: QueryParams = {
      passIdStr: passId,
      passIdNum: parseInt(passId) || 0,
    };
    if (category) params.category = category;

    console.log("📊 Executing Query with params:", params);

    // Type the fetch result as an array of EmployeePass
    const passes = await client.fetch<EmployeePass[]>(query, params);

    console.log(`✅ Found ${passes.length} matching pass(es)`);

    if (!passes || passes.length === 0) {
      return NextResponse.json(
        {
          message: `No pass found for ID: ${passId}${
            category ? ` (${category})` : ""
          }${year ? ` in year ${year}` : ""}`,
          pass: null,
          searchDetails: {
            passId,
            category,
            requestedYear: year,
            totalFound: 0,
          },
        },
        { status: 200, headers }
      );
    }

    let selectedPass = passes[0];

    if (year && passes.length > 1) {
      console.log(`🔎 Multiple passes found, filtering by year ${year}`);
      
      // 'p' is now correctly inferred as type EmployeePass
      const yearMatch = passes.find((p) => {
        const entryYear = p.dateOfEntry
          ? new Date(p.dateOfEntry).getFullYear().toString()
          : null;
        const expiryYear = p.dateOfExpiry
          ? new Date(p.dateOfExpiry).getFullYear().toString()
          : null;

        return entryYear === year || expiryYear === year;
      });

      if (yearMatch) {
        selectedPass = yearMatch;
        console.log(`✅ Found year match for ${year}`);
      } else {
        console.log(`⚠️ No exact year match for ${year}, using first result`);
      }
    }

    let photoUrl = selectedPass.photoUrl;
    if (!photoUrl && selectedPass.photo) {
      try {
        photoUrl = urlFor(selectedPass.photo).url();
      } catch (e) {
        console.error("Error building photo URL:", e);
      }
    }

    console.log("📷 Photo URL:", photoUrl);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = selectedPass.dateOfExpiry
      ? new Date(selectedPass.dateOfExpiry)
      : null;

    const isExpired = expiryDate ? expiryDate < today : false;

    const daysUntilExpiry = expiryDate
      ? Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    const entryYear = selectedPass.dateOfEntry
      ? new Date(selectedPass.dateOfEntry).getFullYear().toString()
      : null;

    const expiryYear = selectedPass.dateOfExpiry
      ? new Date(selectedPass.dateOfExpiry).getFullYear().toString()
      : null;

    const yearMatches = year ? entryYear === year || expiryYear === year : true;

    const hasRequiredFields = !!(
      selectedPass.name &&
      selectedPass.passId &&
      selectedPass.category &&
      selectedPass.organization
    );

    const hasIdNumber = !!(selectedPass.idNumber || selectedPass.cnic);

    console.log("✅ Validation complete:", {
      isExpired,
      daysUntilExpiry,
      yearMatches,
      hasRequiredFields,
      hasIdNumber,
      hasPhoto: !!photoUrl,
    });

    return NextResponse.json(
      {
        message: "Pass found successfully",
        pass: {
          ...selectedPass,
          photo: photoUrl || selectedPass.photo,
          year: entryYear,
          _validation: {
            isExpired,
            daysUntilExpiry,
            isValid: !isExpired && hasRequiredFields && hasIdNumber,
            hasPhoto: !!photoUrl,
            hasRequiredFields,
            hasIdNumber,
            yearMatch: yearMatches,
            entryYear,
            expiryYear,
            scannedYear: year,
            warningMessage: !yearMatches
              ? `QR year (${year}) doesn't match pass year (${
                  entryYear || expiryYear
                })`
              : null,
          },
        },
        searchDetails: {
          passId,
          category,
          requestedYear: year,
          foundYear: entryYear,
          expiryYear: expiryYear,
          totalMatches: passes.length,
          selectedIndex: passes.indexOf(selectedPass),
        },
      },
      { headers }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    console.error("❌ QR Scanner API error:", err);

    return NextResponse.json(
      {
        error: errorMessage,
        details: err instanceof Error ? err.stack : undefined,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}