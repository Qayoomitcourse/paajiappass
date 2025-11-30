// app/api/pending-applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { serverWriteClient as client } from "@/sanity/lib/serverClient";

export const runtime = "nodejs";

interface UploadedAsset {
  _type: "image" | "file";
  asset: {
    _type: "reference";
    _ref: string;
  };
}

/**
 * POST: Create a new pending application
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Parse organization and employee data
    const organizationData = JSON.parse(formData.get('organizationData') as string);
    const employeesData = JSON.parse(formData.get('employees') as string);

    // Helper function to upload asset to Sanity
    const uploadAsset = async (file: File | null, assetType: 'image' | 'file' = 'file'): Promise<UploadedAsset | null> => {
      if (!file) return null;
      
      try {
        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer], { type: file.type });
        
        const asset = await client.assets.upload(assetType, blob, {
          filename: file.name,
        });

        return {
          _type: assetType,
          asset: {
            _type: "reference",
            _ref: asset._id,
          },
        };
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        return null;
      }
    };

    // Upload fee receipt if provided
    const feeReceiptFile = formData.get('feeReceipt') as File | null;
    const feeReceipt = await uploadAsset(feeReceiptFile, 'file');

    // Process each employee
    const processedEmployees = [];
    
    for (let i = 0; i < employeesData.length; i++) {
      const empData = employeesData[i];
      
      // Upload employee documents
      const photo = await uploadAsset(formData.get(`photo-${i}`) as File | null, 'image');
      const cnicFront = await uploadAsset(formData.get(`cnicFront-${i}`) as File | null, 'image');
      const cnicBack = await uploadAsset(formData.get(`cnicBack-${i}`) as File | null, 'image');
      const companyCardFront = await uploadAsset(formData.get(`companyCardFront-${i}`) as File | null, 'image');
      const companyCardBack = await uploadAsset(formData.get(`companyCardBack-${i}`) as File | null, 'image');
      const policeClearance = await uploadAsset(formData.get(`policeClearance-${i}`) as File | null, 'file');
      const localPoliceVerification = await uploadAsset(formData.get(`localPoliceVerification-${i}`) as File | null, 'file');

      // Build employee object
      const employee: {
        _type: "employee";
        name: string;
        fatherName: string;
        designation: string;
        payScale?: string;
        serviceNo?: string;
        nationality: string;
        idNumber: string;
        dateOfBirth: string;
        placeOfBirth: string;
        presentAddress: string;
        permanentAddress: string;
        mobileNumber: string;
        email?: string;
        areaRequired: string[];
        justification: string;
        securityClearanceNo: string;
        securityClearanceDate: string;
        previousPassNo: string;
        photo?: UploadedAsset;
        cnicFront?: UploadedAsset;
        cnicBack?: UploadedAsset;
        companyCardFront?: UploadedAsset;
        companyCardBack?: UploadedAsset;
        policeClearance?: UploadedAsset;
        localPoliceVerification?: UploadedAsset;
      } = {
        _type: "employee",
        name: empData.name,
        fatherName: empData.fatherName,
        designation: empData.designation,
        payScale: empData.payScale || undefined,
        serviceNo: empData.serviceNo || undefined,
        nationality: empData.nationality,
        idNumber: empData.idNumber,
        dateOfBirth: empData.dateOfBirth,
        placeOfBirth: empData.placeOfBirth,
        presentAddress: empData.presentAddress,
        permanentAddress: empData.permanentAddress,
        mobileNumber: empData.mobileNumber,
        email: empData.email || undefined,
        areaRequired: empData.areaRequired || [],
        justification: empData.justification,
        securityClearanceNo: empData.securityClearanceNo,
        securityClearanceDate: empData.securityClearanceDate,
        previousPassNo: empData.previousPassNo,
      };

      // Add uploaded assets to employee
      if (photo) employee.photo = photo;
      if (cnicFront) employee.cnicFront = cnicFront;
      if (cnicBack) employee.cnicBack = cnicBack;
      if (companyCardFront) employee.companyCardFront = companyCardFront;
      if (companyCardBack) employee.companyCardBack = companyCardBack;
      if (policeClearance) employee.policeClearance = policeClearance;
      if (localPoliceVerification) employee.localPoliceVerification = localPoliceVerification;

      processedEmployees.push(employee);
    }

    // Create the pending application document
    const pendingApplication = {
      _type: "pendingPass",
      organization: {
        organizationName: organizationData.organizationName,
        organizationHead: organizationData.organizationHead,
        headDesignation: organizationData.headDesignation,
        headCnic: organizationData.headCnic,
        supervisorName: organizationData.supervisorName,
        supervisorDesignation: organizationData.supervisorDesignation,
        supervisorCnic: organizationData.supervisorCnic,
        companyContact: organizationData.companyContact,
        passCategory: organizationData.passCategory,
      },
      employees: processedEmployees,
      feeReceipt: feeReceipt || undefined,
      status: "pending",
      totalEmployees: processedEmployees.length,
      employeesProcessed: 0,
      submittedAt: new Date().toISOString(),
    };

    // Create document in Sanity
    const result = await client.create(pendingApplication);

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully",
        pending: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create pending application:", error);
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        error: `Failed to submit application: ${message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Fetch all pending applications
 */
export async function GET() {
  try {
    const applications = await client.fetch(
      `*[_type == "pendingPass"] | order(submittedAt desc) {
        _id,
        _type,
        organization,
        status,
        totalEmployees,
        employeesProcessed,
        submittedAt,
        adminRemarks,
        reviewedAt,
        reviewedBy,
        approvedAt,
        approvedBy
      }`
    );

    return NextResponse.json(
      {
        applications,
        count: applications.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch pending applications:", error);
    const message = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      {
        error: `Failed to fetch applications: ${message}`,
      },
      { status: 500 }
    );
  }
}