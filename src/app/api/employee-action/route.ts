import { NextRequest, NextResponse } from "next/server";
import { serverWriteClient as client } from "@/sanity/lib/serverClient";
import { v4 as uuidv4 } from "uuid";

// ------------------ Interface Definitions ------------------

interface EmployeeActionRequest {
  applicationId: string;
  employeeId: string;
  action: "approved" | "rejected";
  remarks?: string;
  reviewedAt?: string;
  dateOfExpiry?: string;
  dateOfEntry?: string;
}

interface SanityAssetReference {
  asset: {
    _ref: string;
  };
}

interface SanityEmployee {
  _key: string;
  employeeId?: string;
  name?: string;
  fatherName?: string;
  idNumber?: string;
  cnicNo?: string; // Fallback
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  designation?: string;
  areaRequired?: string | string[];
  photo?: SanityAssetReference;
  cnicFront?: SanityAssetReference;
  cnicBack?: SanityAssetReference;
  policeClearance?: SanityAssetReference;
  localPoliceVerification?: SanityAssetReference;
  securityClearanceNo?: string;
  securityClearanceDate?: string;
  payScale?: string;
  serviceNo?: string;
  email?: string;
  justification?: string;
  employeeStatus?: "pending" | "approved" | "rejected";
  employeeRemarks?: string; // Added this field
  reviewedAt?: string; // Added this field
  dateOfExpiry?: string; // Added this field
  dateOfEntry?: string; // Added this field
  passId?: number;
}

interface SanityApplication {
  _id: string;
  organization: {
    passCategory?: string;
    organizationName?: string;
  };
  employees: SanityEmployee[];
  submittedBy?: string;
  feeReceipt?: SanityAssetReference;
}

interface SecurityDocument {
  _key: string;
  docType: "special_branch" | "local_police";
  issueDate: string;
  document: SanityAssetReference;
}

interface EmployeeWithStatus {
    employeeStatus?: "pending" | "approved" | "rejected";
}


// ------------------ API Route Handler ------------------

export async function POST(request: NextRequest) {
  try {
    const body: EmployeeActionRequest = await request.json();
    
    console.log('API received body:', JSON.stringify(body, null, 2));
    
    const { applicationId, employeeId, action, remarks, reviewedAt, dateOfExpiry, dateOfEntry } = body;

    if (!applicationId || !employeeId || !action) {
      console.error('Missing required fields:', { applicationId, employeeId, action });
      return NextResponse.json(
        { error: "Missing required fields: applicationId, employeeId, action" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(action)) {
      console.error('Invalid action:', action);
      return NextResponse.json(
        { error: 'Invalid action. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    if (action === "approved") {
      if (!dateOfExpiry || !dateOfEntry) {
        const missing = !dateOfExpiry ? "dateOfExpiry" : "dateOfEntry";
        console.error(`Missing ${missing} for approval`);
        return NextResponse.json(
          { error: `${missing} is required for approval` },
          { status: 400 }
        );
      }
    }

    const application: SanityApplication = await client.fetch(
      `*[_type == "pendingPass" && _id == $applicationId][0]{
        ...,
        organization,
        employees[]{..., "employeeId": _key, ...},
        feeReceipt{asset->{_id, url}}
      }`,
      { applicationId }
    );

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    let employeeIndex = application.employees.findIndex(
      (emp: SanityEmployee) => emp.employeeId === employeeId || emp._key === employeeId
    );
    
    if (employeeIndex === -1) {
       // Fallback for older data that might use numeric index as string
       const numericEmployeeId = parseInt(employeeId, 10);
       if (!isNaN(numericEmployeeId) && application.employees[numericEmployeeId]) {
           employeeIndex = numericEmployeeId;
       }
    }

    if (employeeIndex < 0 || employeeIndex >= application.employees.length) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 });
    }

    const employee = application.employees[employeeIndex];

    let createdPass: { _id: string; passId: number } | null = null;
    if (action === "approved") {
      if (!dateOfExpiry || !dateOfEntry) {
        // This check is redundant due to the earlier check, but good for type safety
        throw new Error("Date of expiry and entry are required for approval.");
      }
      createdPass = await createEmployeePass(application, employee, remarks, dateOfExpiry, dateOfEntry);
    } else {
      await createRejectedEmployee(application, employee, remarks);
    }

    const updatedEmployees = [...application.employees];
    updatedEmployees[employeeIndex] = {
      ...employee,
      employeeStatus: action,
      employeeRemarks: remarks || (action === "approved" ? "Approved" : "Rejected"),
      reviewedAt: reviewedAt || new Date().toISOString(),
      ...(action === "approved" && dateOfExpiry && { dateOfExpiry }),
      ...(action === "approved" && dateOfEntry && { dateOfEntry }),
      ...(createdPass && { passId: createdPass.passId }),
    };

    await client
      .patch(applicationId)
      .set({
        employees: updatedEmployees,
        ...(await getUpdatedApplicationStatus(updatedEmployees)),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: `Employee ${action} successfully`,
      employeeId,
      action,
      ...(createdPass && { passId: createdPass.passId, passDocId: createdPass._id }),
    });

  } catch (error) {
    console.error("Employee action error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}

// ------------------ Helper Functions ------------------

async function createEmployeePass(
  application: SanityApplication,
  employee: SanityEmployee,
  remarks: string | undefined,
  dateOfExpiry: string,
  dateOfEntry: string
) {
  try {
    const category = mapPassCategory(application.organization.passCategory);
    const passId = await getNextPassId(category);
    
    const employeePassData = {
      _type: "employeePass",
      passId,
      category,
      name: employee.name || "",
      fatherName: employee.fatherName || "",
      idNumber: employee.idNumber || employee.cnicNo || "",
      dateOfBirth: employee.dateOfBirth || "",
      placeOfBirth: employee.placeOfBirth || "",
      nationality: employee.nationality || "Pakistani",
      mobileNumber: employee.mobileNumber || "",
      permanentAddress: employee.permanentAddress || "",
      presentAddress: employee.presentAddress || "",
      designation: employee.designation || "",
      organization: application.organization.organizationName || "",
      areaAllowed: parseAreaAllowed(employee.areaRequired),
      dateOfEntry: dateOfEntry,
      dateOfExpiry: dateOfExpiry,
      securityClearance: determineSecurityClearance(employee),
      securityDocuments: buildSecurityDocuments(employee),
      ...(employee.photo && { photo: employee.photo }),
      isExempt: true,
      exemptionRemarks: buildExemptionRemarks(application),
      ...(application.feeReceipt && {
        financialDetails: [{
          _key: uuidv4(),
          receiptNumber: `ORG-${application._id.slice(-8)}`,
          totalAmount: String(application.employees.length * 300),
          dateOfPayment: new Date().toISOString().split("T")[0],
          bank: "HBL",
          paymentMethod: "CASH",
          isMultipleEmployees: application.employees.length > 1,
          employeeCount: application.employees.length,
          amountPerEmployee: "300",
          remarks: `Bulk application fee for ${application.organization.organizationName}`,
          receiptImage: application.feeReceipt,
        }]
      }),
      ...(employee.payScale && { payScale: employee.payScale }),
      ...(employee.serviceNo && { serviceNo: employee.serviceNo }),
      ...(employee.email && { email: employee.email }),
      approvedAt: new Date().toISOString(),
      approvedBy: "admin",
      applicationReference: { _type: "reference", _ref: application._id },
      submittedBy: application.submittedBy,
      ...(employee.justification && { notes: `Justification: ${employee.justification}` }),
      ...(remarks && { adminRemarks: remarks }),
    };

    const createdPass = await client.create(employeePassData);

    await client
      .patch(application._id)
      .setIfMissing({ approvedPassRefs: [] })
      .insert("after", "approvedPassRefs[-1]", [{
        _type: "reference",
        _ref: createdPass._id,
        _key: uuidv4(),
      }])
      .commit();

    console.log(`✅ Employee pass created for ${employee.name} with Pass ID: ${passId}`);
    return createdPass as { _id: string; passId: number };
  } catch (error) {
    console.error("❌ Error creating employee pass:", error);
    throw error;
  }
}

async function createRejectedEmployee(
  application: SanityApplication,
  employee: SanityEmployee,
  remarks?: string
) {
  try {
    const rejectedEmployeeData = {
      _type: "rejectedEmployee",
      name: employee.name,
      fatherName: employee.fatherName,
      idNumber: employee.idNumber || employee.cnicNo,
      designation: employee.designation,
      organization: application.organization.organizationName,
      passCategory: application.organization.passCategory,
      rejectionReason: remarks || "No reason provided",
      rejectedAt: new Date().toISOString(),
      rejectedBy: "admin",
      applicationRef: {
        _type: "reference",
        _ref: application._id,
      },
      ...(employee.photo && { photo: employee.photo }),
      ...(employee.cnicFront && { cnicFront: employee.cnicFront }),
      ...(employee.cnicBack && { cnicBack: employee.cnicBack }),
      ...(employee.policeClearance && { policeClearance: employee.policeClearance }),
    };

    await client.create(rejectedEmployeeData);
    console.log(`✅ Rejected employee record created for ${employee.name}`);
  } catch (error) {
    console.error("❌ Error creating rejected employee record:", error);
    throw error;
  }
}

async function getNextPassId(category: 'cargo' | 'landside'): Promise<number> {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString();

        const lastPass: { passId: number } | null = await client.fetch(
            `*[_type == "employeePass" && 
               category == $category && 
               approvedAt >= $startOfYear && 
               approvedAt <= $endOfYear] | order(passId desc)[0]{passId}`,
            { category, startOfYear, endOfYear }
        );

        if (!lastPass?.passId) {
            return 1;
        }

        return lastPass.passId + 1;
    } catch (error) {
        console.error("Error getting next pass ID:", error);
        return 1;
    }
}

async function getUpdatedApplicationStatus(employees: EmployeeWithStatus[]) {
  const statuses = employees.map((emp) => emp.employeeStatus || "pending");
  const pendingCount = statuses.filter((s) => s === "pending").length;
  const approvedCount = statuses.filter((s) => s === "approved").length;
  const rejectedCount = statuses.filter((s) => s === "rejected").length;
  let overallStatus = "pending";
  let statusMessage = "";

  if (pendingCount === 0) {
    if (rejectedCount === 0) {
      overallStatus = "approved";
      statusMessage = "All employees approved";
    } else if (approvedCount === 0) {
      overallStatus = "rejected";
      statusMessage = "All employees rejected";
    } else {
      overallStatus = "partial";
      statusMessage = `${approvedCount} approved, ${rejectedCount} rejected`;
    }
  } else {
    overallStatus = "pending";
    statusMessage = `${pendingCount} pending, ${approvedCount} approved, ${rejectedCount} rejected`;
  }

  return {
    status: overallStatus,
    processingStatus: statusMessage,
    employeesProcessed: employees.length - pendingCount,
    totalEmployees: employees.length,
    lastProcessedAt: new Date().toISOString(),
  };
}

function mapPassCategory(category: string | undefined): "cargo" | "landside" {
  if (!category) return "cargo";
  const normalized = category.toLowerCase();
  return (normalized.includes("cargo") || normalized.includes("afu")) ? "cargo" : "landside";
}

function parseAreaAllowed(areaRequired: string | string[] | undefined): string[] {
  if (Array.isArray(areaRequired)) return areaRequired.length > 0 ? areaRequired : ["Import"];
  if (!areaRequired || typeof areaRequired !== 'string') return ["Import"];
  const areaString = areaRequired.toLowerCase();
  const areas: string[] = [];
  if (areaString.includes("import")) areas.push("Import");
  if (areaString.includes("export")) areas.push("Export");
  if (areaString.includes("dom")) areas.push("Dom");
  if (areaString.includes("jtc office")) areas.push("JTC Office Block");
  if (areaString.includes("concourse")) areas.push("JTC Concourse Halls");
  if (areaString.includes("parking")) areas.push("JTC Car Parking Only");
  return areas.length > 0 ? areas : ["Import"];
}

function determineSecurityClearance(employee: SanityEmployee): "special_branch" | "local_police" | "na" {
  if (!employee) return "na";
  if (employee.policeClearance || employee.securityClearanceNo) return "special_branch";
  if (employee.localPoliceVerification) return "local_police";
  return "na";
}

function buildSecurityDocuments(employee: SanityEmployee): SecurityDocument[] {
  const docs: SecurityDocument[] = [];
  if (employee.policeClearance) {
    docs.push({
      _key: uuidv4(),
      docType: "special_branch",
      issueDate: employee.securityClearanceDate || new Date().toISOString().split("T")[0],
      document: employee.policeClearance,
    });
  }
  if (employee.localPoliceVerification) {
    docs.push({
      _key: uuidv4(),
      docType: "local_police",
      issueDate: employee.securityClearanceDate || new Date().toISOString().split("T")[0],
      document: employee.localPoliceVerification,
    });
  }
  return docs;
}

function buildExemptionRemarks(application: SanityApplication): string {
  const orgName = application?.organization?.organizationName || 'Unknown Org';
  const employeeCount = application?.employees?.length || 1;
  const appId = application?._id || 'N/A';
  return [
    `Bulk application for ${orgName}.`,
    `Total employees: ${employeeCount}.`,
    `Fee collected at organization level.`,
    `App Ref: ${appId}`,
  ].join(" ");
}