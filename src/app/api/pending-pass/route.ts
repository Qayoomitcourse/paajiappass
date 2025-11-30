// app/api/pending-pass/route.ts
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { v4 as uuidv4 } from "uuid";

// --- Interface Definitions ---

interface SanityAssetPayload {
  _type: "image" | "file";
  asset: { _type: "reference"; _ref: string };
}

interface OrganizationData {
  organizationName?: string;
  organizationHead?: string;
  headDesignation?: string;
  companyContact?: string;
  passCategory?: string;
}

// Represents the initial employee data from the form
interface EmployeeFormData {
  // Add other employee properties from your form if needed for type safety
  [key: string]: unknown; // Allows for spreading while maintaining some type safety
}

// Represents the employee data after processing and adding system fields
interface ProcessedEmployee extends EmployeeFormData {
  photo?: SanityAssetPayload;
  cnicFront?: SanityAssetPayload;
  cnicBack?: SanityAssetPayload;
  companyCardFront?: SanityAssetPayload;
  companyCardBack?: SanityAssetPayload;
  policeClearance?: SanityAssetPayload;
  localPoliceVerification?: SanityAssetPayload;
  employeeStatus: "pending";
  employeeId: string;
}

/**
 * GET method for fetching pending passes (for admin panel)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = '*[_type == "pendingPass"]';
    // Use a more specific type for query parameters
    let params: Record<string, string> = {};

    if (status && status !== "all") {
      query += "[status == $status]";
      params = { status };
    }

    query += " | order(submittedAt desc)";

    const pendingPasses = await client.fetch(query, params);

    return NextResponse.json({
      pending: pendingPasses,
      count: pendingPasses.length,
    });
  } catch (error) {
    console.error("Error fetching pending passes:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending passes" },
      { status: 500 }
    );
  }
}

/**
 * POST method for creating new pending pass applications
 * Accepts either multipart/form-data (preferred) or JSON (fallback).
 */
export async function POST(request: NextRequest) {
  try {
    // Apply the defined types to variables
    let organizationData: OrganizationData = {};
    let employeesData: EmployeeFormData[] = [];
    let feeReceiptAsset: SanityAssetPayload | null = null;
    let processedEmployees: ProcessedEmployee[] = [];

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const orgStr = formData.get("organizationData") as string;
      organizationData = orgStr ? JSON.parse(orgStr) : {};

      const empStr = formData.get("employees") as string;
      employeesData = empStr ? JSON.parse(empStr) : [];

      processedEmployees = await Promise.all(
        // The 'employee' parameter is now correctly inferred as EmployeeFormData
        employeesData.map(async (employee, index) => {
          // Initialize with the final, correct type
          const processedEmployee: ProcessedEmployee = {
            ...employee,
            employeeStatus: "pending",
            employeeId: `emp-${uuidv4()}`,
          };

          // Use a typed array for file keys to ensure type safety
          const fileTypes: (keyof ProcessedEmployee)[] = [
            "photo",
            "cnicFront",
            "cnicBack",
            "companyCardFront",
            "companyCardBack",
            "policeClearance",
            "localPoliceVerification",
          ];

          for (const fileType of fileTypes) {
            const file = formData.get(`${fileType}-${index}`) as File | null;
            if (file) {
              try {
                const asset = await client.assets.upload("image", file);
                processedEmployee[fileType] = {
                  _type: "image",
                  asset: { _type: "reference", _ref: asset._id },
                };
              } catch (err) {
                console.warn(
                  `Failed to upload ${fileType} for employee ${index}:`,
                  err
                );
              }
            }
          }
          return processedEmployee;
        })
      );

      const feeReceiptFile = formData.get("feeReceipt") as File | null;
      if (feeReceiptFile) {
        try {
          const asset = await client.assets.upload("file", feeReceiptFile);
          feeReceiptAsset = {
            _type: "file",
            asset: { _type: "reference", _ref: asset._id },
          };
        } catch (err) {
          console.warn("Failed to upload fee receipt:", err);
        }
      }
    } else {
      const body = await request.json();
      organizationData = body.organizationData || {};
      employeesData = body.employees || [];
      // Remove unused 'i' parameter and let 'emp' be inferred
      processedEmployees = employeesData.map((emp) => ({
        ...emp,
        employeeStatus: "pending",
        employeeId: `emp-${uuidv4()}`,
      }));
    }

    const pendingPassData = {
      _type: "pendingPass",
      status: "pending",
      submittedBy: "applicant",
      organization: {
        organizationName: organizationData.organizationName,
        organizationHead: organizationData.organizationHead,
        headDesignation: organizationData.headDesignation,
        companyContact: organizationData.companyContact,
        passCategory: organizationData.passCategory,
      },
      employees: processedEmployees,
      ...(feeReceiptAsset && { feeReceipt: feeReceiptAsset }),
      submittedAt: new Date().toISOString(),
      totalEmployees: processedEmployees.length,
      employeesProcessed: 0,
      processingStatus: `0 of ${processedEmployees.length} employees processed`,
      approvedPassRefs: [],
    };

    const result = await client.create(pendingPassData);

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      pending: result,
    });
  } catch (error) {
    console.error("Error creating pending pass:", error);
    return NextResponse.json(
      { error: "Failed to create pending pass application" },
      { status: 500 }
    );
  }
}