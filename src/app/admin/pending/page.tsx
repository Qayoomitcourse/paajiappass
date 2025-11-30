"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Check, X, Download, Search, Filter, Building, FileText, ChevronDown, ChevronRight, User, Trash2, Printer, UserCheck } from "lucide-react";

interface Employee {
  name: string;
  fatherName: string;
  designation: string;
  idNumber: string;
  dateOfBirth: string;
  placeOfBirth: string;
  presentAddress: string;
  permanentAddress: string;
  mobileNumber: string;
  email: string;
  areaRequired: string[];
  justification: string;
  payScale?: string;
  serviceNo?: string;
  nationality?: string;
  securityClearanceNo?: string;
  securityClearanceDate?: string;
  previousPassNo?: string;
  photo?: { asset: { _ref: string } };
  cnicFront?: { asset: { _ref: string } };
  cnicBack?: { asset: { _ref: string } };
  companyCardFront?: { asset: { _ref: string } };
  companyCardBack?: { asset: { _ref: string } };
  policeClearance?: { asset: { _ref: string } };
  localPoliceVerification?: { asset: { _ref: string } };
  employeeStatus?: "pending" | "approved" | "rejected";
  employeeRemarks?: string;
  employeeId?: string;
  dateOfEntry?: string;
  dateOfExpiry?: string;
  passId?: number;
}

interface Organization {
  organizationName: string;
  organizationHead: string;
  headDesignation: string;
  companyContact: string;
  passCategory: string;
  headCnic?: string;
  supervisorName?: string;
  supervisorDesignation?: string;
  supervisorCnic?: string;
}

interface PendingApplication {
  _id: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  organization: Organization;
  feeReceipt?: { asset: { _ref: string } };
  employees: Employee[];
  submittedAt: string;
  adminRemarks?: string;
}

// Approval Modal Component
function ApprovalModal({
  employee,
  applicationId,
  employeeId,
  onApprove,
  onReject,
  onClose,
}: {
  employee: Employee;
  applicationId: string;
  employeeId: string;
  onApprove: (
    appId: string,
    empId: string,
    entryDate: string,
    expiry: string,
    remarks?: string
  ) => Promise<void>;
  onReject: (appId: string, empId: string, remarks: string) => Promise<void>;
  onClose: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Default date calculations
  const defaultEntryDate = new Date().toISOString().split("T")[0];
  const defaultExpiryDate = new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0];

  const [entryDate, setEntryDate] = useState(defaultEntryDate);
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);

  const handleApprove = async () => {
    if (!entryDate || !expiryDate) {
      alert("Please set both entry and expiry dates.");
      return;
    }
    setIsProcessing(true);
    try {
      await onApprove(applicationId, employeeId, entryDate, expiryDate, remarks);
      onClose();
    } catch (error) {
      console.error("Failed to approve:", error);
      // Error is already alerted in the parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      alert("Rejection remarks are required.");
      return;
    }
    setIsProcessing(true);
    try {
      await onReject(applicationId, employeeId, remarks);
      onClose();
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Review Employee: {employee.name}</h3>
              <p className="text-sm text-gray-500">CNIC: {employee.idNumber}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Remarks (Optional for Approval, Required for Rejection)
            </label>
            <textarea
              id="remarks"
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide justification for rejection or notes for approval..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Entry
              </label>
              <input
                type="date"
                id="entryDate"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Expiry
              </label>
              <input
                type="date"
                id="expiryDate"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end items-center gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing || !remarks.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 disabled:bg-red-300"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 disabled:bg-green-300"
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}


export default function EnhancedIndividualEmployeeAdmin() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedApplication, setSelectedApplication] = useState<PendingApplication | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [allEmployees, setAllEmployees] = useState<(Employee & { organizationName: string; applicationId: string })[]>([]);

  // State for approval modal
  const [selectedEmployee, setSelectedEmployee] = useState<{
    emp: Employee;
    appId: string;
    empId: string;
  } | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter === "all"
        ? "/api/pending-pass"
        : `/api/pending-pass?status=${statusFilter}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error("Failed to fetch applications: HTTP", response.status);
        setApplications([]);
        return;
      }

      const data = await response.json();

      if (data && data.pending) {
        setApplications(Array.isArray(data.pending) ? data.pending : []);
      } else {
        console.error("Invalid data format:", data);
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const employees = applications.flatMap(app =>
      app.employees.map(emp => ({
        ...emp,
        organizationName: app.organization.organizationName,
        applicationId: app._id
      }))
    );
    setAllEmployees(employees);
  }, [applications]);

  const handleEmployeeAction = async (
    applicationId: string,
    employeeId: string,
    action: "approved" | "rejected",
    dateOfEntry?: string,
    dateOfExpiry?: string,
    remarks?: string
  ) => {
    if (!applicationId || !employeeId || !action) {
      const error = 'Missing required parameters for employee action';
      alert(`❌ ${error}`);
      throw new Error(error);
    }

    try {
      setActionLoading(`${applicationId}-${employeeId}`);

      const response = await fetch(`/api/employee-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          employeeId,
          action,
          remarks: remarks || "",
          reviewedAt: new Date().toISOString(),
          dateOfEntry: action === "approved" ? dateOfEntry : undefined,
          dateOfExpiry: action === "approved" ? dateOfExpiry : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server responded with ${response.status}`);
      }

      // Show success message
      if (action === "approved") {
        alert(`✅ Employee approved successfully! Pass ID: ${result.passId || 'Generated'}`);
      } else {
        alert('✅ Employee rejected successfully');
      }

      // Refresh applications list
      await fetchApplications();

      // Update selected application if viewing details
      if (selectedApplication?._id === applicationId) {
        // Find and update the application in the state to reflect changes immediately
        const updatedApp = await (await fetch(`/api/pending-pass/${applicationId}`)).json();
        if (updatedApp) {
          setSelectedApplication(updatedApp);
        }
      }
    } catch (error: unknown) {
      console.error(`Error ${action} employee:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} employee`;
      alert(`❌ ${errorMessage}`);
      throw error; // Re-throw so modal can handle it
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteApplication = async (applicationId: string, organizationName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the application for ${organizationName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(`delete-${applicationId}`);

      const response = await fetch(`/api/pending-applications/${applicationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchApplications();
        if (selectedApplication?._id === applicationId) {
          setSelectedApplication(null);
        }
        alert("Application deleted successfully");
      } else {
        const data = await response.json();
        alert(`Failed to delete application: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting application:", error);
      alert("Error deleting application");
    } finally {
      setActionLoading(null);
    }
  };

  const generateApplicationHTML = (employee: Employee, organization: Organization) => {
    const passType = organization.passCategory || "AFU CARGO PASS";
    const photoHtml = employee.photo ? `<img src="/api/assets/${employee.photo.asset._ref}" alt="photo" style="width:100%; height:100%; object-fit:cover;"/>` : "Space for<br/>Recent<br/>Photograph<br/>(Only White<br/>Background &<br/>without headgear)<br/>Passport Size.<br/>Paste here)";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Application - ${employee.name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 8mm; font-size: 10pt; background: white; line-height: 1.2; }
  .container { border: 2px solid #000; padding: 12px; box-sizing: border-box; max-width: 210mm; min-height: 297mm; }
  .header { text-align: center; margin-bottom: 12px; }
  .main-content { display: flex; position: relative; }
  .left-column { flex: 1; margin-right: 15mm; }
  .photo-container { width: 45mm; height: 55mm; border: 2px solid #000; text-align: center; font-size: 8pt; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f9f9f9; }
  .section { margin-bottom: 12px; }
  .section-title { background: #000; color: #fff; padding: 3px 8px; font-weight: bold; font-size: 10pt; margin-bottom: 8px; display: inline-block; }
  .info-table { width: 100%; font-size: 9pt; }
  .info-table td { padding: 2px 4px; vertical-align: top; border: none; }
  .info-table .label { font-weight: bold; width: 35%; }
  .two-column { display: flex; gap: 15px; margin-top: 12px; }
  .column { flex: 1; }
  .justification-box { border: 1px solid #000; min-height: 60px; padding: 6px; margin-top: 6px; }
  .declaration-box { font-size: 8pt; text-align: justify; line-height: 1.3; margin-top: 8px; }
  .signature-section { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .applicant-signature { text-align: center; }
  .signature-line { border-bottom: 1px solid #000; width: 150px; height: 40px; margin-bottom: 4px; }
  .countersign-box { border: 2px solid #000; padding: 8px; width: 220px; font-size: 9pt; }
  .countersign-header { font-weight: bold; text-decoration: underline; margin-bottom: 6px; text-align: center; }
  @media print { body { margin: 0; } .page-break { page-break-after: always; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="font-size: 14pt; font-weight: bold; margin-bottom: 2px;">APPLICATION FORM</div>
    <div style="font-size: 12pt; font-weight: bold; margin-bottom: 2px;">${passType} 2026</div>
    <div style="font-size: 10pt;">Pakistan Airports Authority</div>
    <div style="font-size: 10pt;">Jinnah International Airport</div>
    <div style="font-size: 10pt;">Karachi</div>
  </div>

  <div class="main-content">
    <div class="left-column">
      <div class="section">
        <div class="section-title">1 &nbsp;&nbsp; APPLICANT INFORMATION</div>
        <table class="info-table">
          <tr><td class="label">Full Name:</td><td>${employee.name || ""}</td></tr>
          <tr><td class="label">Designation / Branch:</td><td>${employee.designation || ""}</td></tr>
          <tr><td class="label">Pay Scale/Group:</td><td>${employee.payScale || ""}</td></tr>
          <tr><td class="label">Service No.:</td><td>${employee.serviceNo || ""}</td></tr>
          <tr><td class="label">Deptt/Org/Embassy:</td><td>${organization.organizationName || ""}</td></tr>
          <tr><td class="label">Nationality:</td><td>${employee.nationality || ""}</td></tr>
          <tr><td class="label">D.O.B & Place:</td><td>${employee.dateOfBirth || ""} / ${employee.placeOfBirth || ""}</td></tr>
          <tr><td class="label">CNIC/ Passport No.:</td><td>${employee.idNumber || ""}</td></tr>
          <tr><td class="label">Father/Husband Name:</td><td>${employee.fatherName || ""}</td></tr>
          <tr><td class="label">Present Address:</td><td>${employee.presentAddress || ""}</td></tr>
          <tr><td class="label">Permanent Res. Address:</td><td>${employee.permanentAddress || ""}</td></tr>
          <tr><td class="label">Telephone No. Office:</td><td>${organization.companyContact || ""}</td></tr>
          <tr><td class="label">Mob No.: Email:</td><td>${employee.mobileNumber || ""} / ${employee.email || ""}</td></tr>
        </table>
      </div>

      <div class="two-column">
        <div class="column">
          <div class="section-title">2 &nbsp;&nbsp; SECURITY CLEARANCE</div>
          <div style="font-size: 9pt;">
            <div style="margin-bottom: 6px;"><strong>Security Clearance Letter No. with date</strong></div>
            <div style="margin-bottom: 4px;">${employee.securityClearanceNo || ""} - ${employee.securityClearanceDate || ""}</div>
            <div style="margin-bottom: 6px;"><strong>Special Branch</strong></div>
            <div><strong>Previous Pass No. / Year:</strong></div>
            <div>${employee.previousPassNo || "N/A"}</div>
          </div>
        </div>

        <div class="column">
          <div class="section-title">3 &nbsp;&nbsp; JUSTIFICATION</div>
          <div class="justification-box">${employee.justification || ""}</div>
        </div>
      </div>

      <div class="section" style="margin-top: 20px;">
        <div class="section-title">4 &nbsp;&nbsp; DECLARATION & UNDERTAKING</div>
        <div class="declaration-box">
          <p>I, the undersigned, hereby declare that all information provided herein is accurate and truthful to the best of my knowledge. I solemnly undertake to comply with all applicable security regulations / instructions and understand that any violation may result in immediate cancellation of the ${passType} and may also invite legal consequences.</p>
          <p>I further undertake to return the ${passType} upon its expiry, upon relinquishment of duties, or when no longer required, and to abide fully by the instructions printed on the reverse side of this form.</p>
          <p>I acknowledge that submission of any forged, fraudulent, or otherwise falsified document shall constitute a serious offence under relevant laws, and shall render me liable to legal action.</p>
          <p><strong>Note:</strong> Display of the Pass on the chest is mandatory for entry into airport premises and must be maintained at all times within Cargo Areas.</p>
        </div>
      </div>

      <div class="signature-section">
        <div class="applicant-signature">
          <div class="signature-line"></div>
          <div style="font-size: 9pt; font-weight: bold;">Signature of applicant</div>
          <div style="font-size: 9pt; margin-top: 4px;">Date: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="countersign-box">
          <div class="countersign-header">COUNTERSIGNED BY THE<br/>HEAD OF COMPANY / ORG</div>
          <div style="margin-bottom: 4px;"><strong>Name:</strong> ${organization.organizationHead || ""}</div>
          <div style="margin-bottom: 8px;"><strong>Desg:</strong> ${organization.headDesignation || ""}</div>
          <div style="margin-top: 15px;"><strong>Official Seal:</strong></div>
          <div style="height: 25px;"></div>
        </div>
      </div>
    </div>

    <div class="photo-container">
      ${photoHtml}
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const generateUndertakingHTML = (application: PendingApplication) => {
    const org = application.organization;
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Undertaking - ${org.organizationName || ""}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:8mm;font-size:10pt;line-height:1.4}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  td,th{border:1px solid #000;padding:4px;font-size:9pt;vertical-align:top}
  th{background:#f0f0f0;font-weight:bold;text-align:center}
  .header{text-align:center;font-weight:bold;font-size:14pt;margin-bottom:15px}
  .intro-text{margin-bottom:15px;text-align:justify;font-size:10pt}
  .certificate-section{margin-top:20px;margin-bottom:15px}
  .certificate-title{font-weight:bold;margin-bottom:8px}
  .certificate-text{margin-bottom:10px;text-align:justify}
  .signature-section{margin-top:25px;display:flex;justify-content:space-between}
  .signature-box{width:48%;border:1px solid #000;padding:10px;min-height:80px}
  .signature-title{font-weight:bold;text-align:center;margin-bottom:15px;text-decoration:underline}
  .signature-line{border-bottom:1px solid #000;margin-bottom:5px;height:25px}
  .field-label{font-weight:bold;margin-top:8px}
  @media print{body{margin:0}}
</style>
</head>
<body>
  <div class="header">UNDERTAKING / JUSTIFICATION FORM</div>
  
  <div class="intro-text">
    <strong>1.</strong> The firm M/s <strong>${org.organizationName || "_".repeat(50)}</strong> (Company / Organization Name) will be responsible for any act of subversion or act of sabotage on the part of following employee will work under direct Supervision control and Supervision of our company / organization none of following employees will visit any other area except the assigned place of work/duty.
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:3%">S. #</th>
        <th style="width:12%">Name</th>
        <th style="width:10%">Father Name</th>
        <th style="width:8%">D.O.B<br/>YYYY-MM-DD</th>
        <th style="width:8%">Place of Birth</th>
        <th style="width:8%">Desg.</th>
        <th style="width:8%">Mobile Number</th>
        <th style="width:10%">CNIC No.</th>
        <th style="width:12%">Present Address</th>
        <th style="width:12%">Permanent Address</th>
        <th style="width:8%">Area required on New AEP</th>
        <th style="width:10%">Justification</th>
        <th style="width:8%">Security Clearance</th>
      </tr>
    </thead>
    <tbody>
      ${application.employees.map((emp, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${emp.name || ""}</td>
        <td>${emp.fatherName || ""}</td>
        <td>${emp.dateOfBirth || ""}</td>
        <td>${emp.placeOfBirth || ""}</td>
        <td>${emp.designation || ""}</td>
        <td>${emp.mobileNumber || ""}</td>
        <td>${emp.idNumber || ""}</td>
        <td style="font-size:8pt">${emp.presentAddress || ""}</td>
        <td style="font-size:8pt">${emp.permanentAddress || ""}</td>
        <td>${emp.areaRequired?.join(", ") || ""}</td>
        <td style="font-size:8pt">${emp.justification || ""}</td>
        <td>Special Branch</td>
      </tr>`).join("")}
      ${Array.from({ length: Math.max(0, 5 - application.employees.length) }, (_, i) => `<tr>
        <td style="text-align:center">${application.employees.length + i + 1}</td>
        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="certificate-section">
    <div class="certificate-title">CERTIFICATE FROM THE CONCERNED AGENCY/FIRM/AIRLINE/DEPARTMENT</div>
    
    <div class="certificate-text">
      <strong>2.</strong> Certified that above-mentioned applicant(s) is/are permanent/temporary employees(s) in my company / organization. The information given in the application(s) is/are correct as per official record and that individual(s) is/are Security Cleared.
    </div>
    
    <div class="certificate-text">
      <strong>3.</strong> Mr. <strong>${org.supervisorName || "_".repeat(40)}</strong> Designation <strong>${org.supervisorDesignation || "_".repeat(25)}</strong> will supervise the work of the above-mentioned employee and will be responsible for their activities and in case of any undesirable happening be held responsible.
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Signature & Stamp of Manager/Incharge</div>
      <div class="signature-line"></div>
      <div class="field-label">Name: ${org.supervisorName || "_".repeat(30)}</div>
      <div class="field-label">Desig: ${org.supervisorDesignation || "_".repeat(15)} Company/Org: ${org.organizationName || "_".repeat(20)}</div>
      <div class="field-label">CNIC No: ${org.supervisorCnic || "_".repeat(25)}</div>
    </div>

    <div class="signature-box">
      <div class="signature-title">Countersigned by the Head of Company / Org</div>
      <div class="signature-line"></div>
      <div class="field-label">Name: ${org.organizationHead || "_".repeat(30)}</div>
      <div class="field-label">Desig: ${org.headDesignation || "_".repeat(15)} Co/Org: ${org.organizationName || "_".repeat(20)}</div>
      <div class="field-label">CNIC No: ${org.headCnic || "_".repeat(25)}</div>
    </div>
  </div>

</body></html>`;
  };

  const printApplications = (application: PendingApplication) => {
    const w = window.open("", "_blank");
    if (!w) return;

    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Airport Pass Applications - ${application.organization.organizationName}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;margin:0} .page-break{page-break-after:always}</style>
      </head><body>
      ${application.employees.map((emp, idx) => `${idx > 0 ? '<div class="page-break"></div>' : ""}${generateApplicationHTML(emp, application.organization)}`).join("")}
      <div class="page-break"></div>
      ${generateUndertakingHTML(application)}
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const downloadDocument = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredApplications = applications.filter((app) => {
    if (!app || !app.organization) return false;

    const orgName = app.organization?.organizationName?.toLowerCase() || "";
    const searchLower = (searchTerm || "").toLowerCase();

    return orgName.includes(searchLower) ||
      (app.employees || []).some(emp =>
        (emp?.name?.toLowerCase() || "").includes(searchLower) ||
        (emp?.idNumber?.toLowerCase() || "").includes(searchLower)
      );
  });

  const filteredEmployees = (allEmployees || []).filter((emp) => {
    if (!emp) return false;

    const searchLower = (searchTerm || "").toLowerCase();
    return (emp?.name?.toLowerCase() || "").includes(searchLower) ||
      (emp?.idNumber?.toLowerCase() || "").includes(searchLower) ||
      (emp?.organizationName?.toLowerCase() || "").includes(searchLower);
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getEmployeeStats = (employees: Employee[]) => {
    const pending = employees.filter(emp => emp.employeeStatus === "pending" || !emp.employeeStatus).length;
    const approved = employees.filter(emp => emp.employeeStatus === "approved").length;
    const rejected = employees.filter(emp => emp.employeeStatus === "rejected").length;

    return { pending, approved, rejected, total: employees.length };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Individual Employee Review</h1>
              <p className="text-gray-600">Review and approve/reject employees individually</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEmployeeList(false)}
                className={`px-4 py-2 rounded-lg flex items-center ${!showEmployeeList ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                <Building className="h-4 w-4 mr-2" />
                Applications View
              </button>
              <button
                onClick={() => setShowEmployeeList(true)}
                className={`px-4 py-2 rounded-lg flex items-center ${showEmployeeList ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Employee List View
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={showEmployeeList ? "Search by employee name, CNIC, or organization..." : "Search by organization name, employee name, or CNIC..."}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {!showEmployeeList && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected")}
                >
                  <option value="all">All Applications</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {showEmployeeList ? (
          /* Employee List View */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold text-gray-900">All Employees ({filteredEmployees.length})</h2>
            </div>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Areas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((emp, idx) => (
                      <tr key={`${emp.applicationId}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-8 w-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                              <div className="text-sm text-gray-500">CNIC: {emp.idNumber}</div>
                              <div className="text-sm text-gray-500">Father: {emp.fatherName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{emp.organizationName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{emp.designation}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {emp.areaRequired?.join(", ") || "Not specified"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {emp.employeeStatus ? getStatusBadge(emp.employeeStatus) : getStatusBadge("pending")}
                            {emp.dateOfEntry && (
                              <div className="text-xs text-gray-500 mt-1">
                                Entry: {new Date(emp.dateOfEntry).toLocaleDateString()}
                              </div>
                            )}
                            {emp.dateOfExpiry && (
                              <div className="text-xs text-gray-500">
                                Expiry: {new Date(emp.dateOfExpiry).toLocaleDateString()}
                              </div>
                            )}
                            {emp.passId && (
                              <div className="text-xs text-blue-600 font-medium">
                                Pass ID: {String(emp.passId).padStart(4, '0')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {(!emp.employeeStatus || emp.employeeStatus === "pending") && (
                              <button
                                onClick={() => setSelectedEmployee({
                                  emp: emp,
                                  appId: emp.applicationId,
                                  empId: emp.employeeId || `${idx}`
                                })}
                                disabled={actionLoading === `${emp.applicationId}-${emp.employeeId || `${idx}`}`}
                                className="text-blue-600 hover:text-blue-900 px-3 py-1 text-xs border border-blue-200 rounded disabled:opacity-50"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Applications Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "Try adjusting your search criteria" : "No applications match the current filters"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pass Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApplications.map((app) => {
                      const stats = getEmployeeStats(app.employees);
                      return (
                        <React.Fragment key={app._id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <button
                                  onClick={() => toggleExpanded(app._id)}
                                  className="mr-2 p-1 hover:bg-gray-200 rounded"
                                >
                                  {expandedRows.has(app._id) ?
                                    <ChevronDown className="h-4 w-4" /> :
                                    <ChevronRight className="h-4 w-4" />
                                  }
                                </button>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {app.organization.organizationName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Head: {app.organization.organizationHead}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {app.organization.passCategory}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="flex items-center gap-4">
                                  <span className="text-yellow-600">⏳ {stats.pending}</span>
                                  <span className="text-green-600">✅ {stats.approved}</span>
                                  <span className="text-red-600">❌ {stats.rejected}</span>
                                  <span className="text-gray-500">Total: {stats.total}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(app.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedApplication(app)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </button>
                                <button
                                  onClick={() => printApplications(app)}
                                  className="text-green-600 hover:text-green-900 flex items-center"
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print
                                </button>
                                <button
                                  onClick={() => handleDeleteApplication(app._id, app.organization.organizationName)}
                                  disabled={actionLoading === `delete-${app._id}`}
                                  className="text-red-600 hover:text-red-900 flex items-center disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Row - Employee List */}
                          {expandedRows.has(app._id) && (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  <h4 className="font-medium text-gray-900">Employees ({app.employees.length})</h4>
                                  <div className="grid grid-cols-1 gap-3">
                                    {app.employees.map((emp, idx) => (
                                      <div key={`${app._id}-emp-${idx}`} className="bg-white p-4 rounded border">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-medium text-sm">{emp.name}</div>
                                            <div className="text-xs text-gray-500">
                                              <div>CNIC: {emp.idNumber}</div>
                                              <div>Designation: {emp.designation}</div>
                                              <div>Areas: {emp.areaRequired?.join(", ") || "Not specified"}</div>
                                              {emp.dateOfEntry && (
                                                <div className="text-green-600 font-medium mt-1">
                                                  Entry: {new Date(emp.dateOfEntry).toLocaleDateString()}
                                                </div>
                                              )}
                                              {emp.dateOfExpiry && (
                                                <div className="text-blue-600 font-medium">
                                                  Expiry: {new Date(emp.dateOfExpiry).toLocaleDateString()}
                                                </div>
                                              )}
                                              {emp.passId && (
                                                <div className="text-blue-600 font-medium">
                                                  Pass ID: {String(emp.passId).padStart(4, '0')}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {emp.employeeStatus && getStatusBadge(emp.employeeStatus)}
                                            {(!emp.employeeStatus || emp.employeeStatus === "pending") && (
                                              <button
                                                onClick={() => setSelectedEmployee({
                                                  emp: emp,
                                                  appId: app._id,
                                                  empId: emp.employeeId || `${idx}`
                                                })}
                                                disabled={actionLoading === `${app._id}-${emp.employeeId || `${idx}`}`}
                                                className="text-blue-600 hover:text-blue-900 px-3 py-1 text-xs border border-blue-200 rounded disabled:opacity-50"
                                              >
                                                Review
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {emp.employeeRemarks && (
                                          <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded">
                                            <strong>Remarks:</strong> {emp.employeeRemarks}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedApplication.organization.organizationName}
                    </h2>
                    <p className="text-gray-600">{selectedApplication.organization.passCategory}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printApplications(selectedApplication)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Documents
                    </button>
                    <button
                      onClick={() => downloadDocument(generateUndertakingHTML(selectedApplication), `Undertaking_${selectedApplication.organization.organizationName}.html`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Undertaking
                    </button>
                    <button
                      onClick={() => handleDeleteApplication(selectedApplication._id, selectedApplication.organization.organizationName)}
                      disabled={actionLoading === `delete-${selectedApplication._id}`}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Application
                    </button>
                    <button
                      onClick={() => setSelectedApplication(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Employee Review Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Individual Employee Review ({selectedApplication.employees.length} employees)
                  </h3>

                  <div className="space-y-4">
                    {selectedApplication.employees.map((emp, idx) => (
                      <div key={`${selectedApplication._id}-modal-emp-${idx}`} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-gray-900">{emp.name}</h4>
                            <div className="text-sm text-gray-600 mt-1">
                              <p><strong>Father/Husband:</strong> {emp.fatherName}</p>
                              <p><strong>CNIC:</strong> {emp.idNumber}</p>
                              <p><strong>Designation:</strong> {emp.designation}</p>
                              <p><strong>Areas Required:</strong> {emp.areaRequired?.join(", ") || "Not specified"}</p>
                              {emp.dateOfEntry && (
                                <p className="text-green-600 font-medium mt-2">
                                  <strong>Date of Entry:</strong> {new Date(emp.dateOfEntry).toLocaleDateString()}
                                </p>
                              )}
                              {emp.dateOfExpiry && (
                                <p className="text-blue-600 font-medium">
                                  <strong>Date of Expiry:</strong> {new Date(emp.dateOfExpiry).toLocaleDateString()}
                                </p>
                              )}
                              {emp.passId && (
                                <p className="text-blue-600 font-medium">
                                  <strong>Pass ID:</strong> {String(emp.passId).padStart(4, '0')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {emp.employeeStatus && (
                              <div className="mb-2">
                                {getStatusBadge(emp.employeeStatus)}
                              </div>
                            )}

                            {(!emp.employeeStatus || emp.employeeStatus === "pending") && (
                              <button
                                onClick={() => setSelectedEmployee({
                                  emp: emp,
                                  appId: selectedApplication._id,
                                  empId: emp.employeeId || `${idx}`
                                })}
                                disabled={actionLoading === `${selectedApplication._id}-${emp.employeeId || `${idx}`}`}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review Employee
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2 text-sm text-gray-600">
                            <p><strong>Date of Birth:</strong> {emp.dateOfBirth}</p>
                            <p><strong>Place of Birth:</strong> {emp.placeOfBirth}</p>
                            <p><strong>Mobile:</strong> {emp.mobileNumber}</p>
                            <p><strong>Email:</strong> {emp.email}</p>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600">
                            <p><strong>Present Address:</strong> {emp.presentAddress}</p>
                            <p><strong>Permanent Address:</strong> {emp.permanentAddress}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="font-medium text-sm">Documents:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                            {(
                              [
                                "photo",
                                "cnicFront",
                                "cnicBack",
                                "companyCardFront",
                                "companyCardBack",
                                "policeClearance",
                                "localPoliceVerification",
                              ] as const
                            ).map((key) => {
                              const docInfo = {
                                photo: "Photo",
                                cnicFront: "CNIC Front",
                                cnicBack: "CNIC Back",
                                companyCardFront: "Company Card Front",
                                companyCardBack: "Company Card Back",
                                policeClearance: "Police Clearance",
                                localPoliceVerification: "Local Police",
                              };
                              const document = emp[key];
                              return (
                                <div key={`${emp.idNumber}-${key}`} className="flex items-center">
                                  <span className={document ? "text-green-600" : "text-red-600"}>
                                    {document ? "✅" : "❌"}
                                  </span>
                                  <span className="ml-1">{docInfo[key]}</span>
                                  {document && (
                                    <a
                                      href={`/api/assets/${document.asset._ref}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {emp.justification && (
                          <div className="mt-4">
                            <p className="font-medium text-sm">Justification:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">{emp.justification}</p>
                          </div>
                        )}

                        {emp.employeeRemarks && (
                          <div className="mt-4">
                            <p className="font-medium text-sm">Admin Remarks:</p>
                            <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-1">{emp.employeeRemarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {selectedEmployee && (
          <ApprovalModal
            employee={selectedEmployee.emp}
            applicationId={selectedEmployee.appId}
            employeeId={selectedEmployee.empId}
            onApprove={async (appId, empId, entryDate, expiryDate, remarks) => {
              try {
                await handleEmployeeAction(appId, empId, "approved", entryDate, expiryDate, remarks);
              } catch (error) {
                console.error('Approval failed:', error);
                // Re-throwing is important if the modal needs to stay open on failure
                throw error;
              }
            }}
            onReject={async (appId, empId, remarks) => {
              try {
                await handleEmployeeAction(appId, empId, "rejected", undefined, undefined, remarks);
              } catch (error) {
                console.error('Rejection failed:', error);
                throw error;
              }
            }}
            onClose={() => setSelectedEmployee(null)}
          />
        )}
      </div>
    </div>
  );
}