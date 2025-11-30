'use client'
import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Building, Users, Receipt, FileText } from "lucide-react";

type UploadField = { file: File | null; preview: string | null; name?: string | null };

type EmployeeData = {
  name: string;
  fatherName: string;
  designation: string;
  payScale: string;
  serviceNo: string;
  nationality: string;
  dateOfBirth: string;
  placeOfBirth: string;
  cnicNo: string;
  cnicIssueDate: string;
  presentAddress: string;
  permanentAddress: string;
  mobileNumber: string;
  email: string;
  securityClearanceNo: string;
  securityClearanceDate: string;
  previousPassNo: string;
  justification: string;
  areaRequired: string;
  photoFile: UploadField;
  cnicFrontFile: UploadField;
  cnicBackFile: UploadField;
  companyFrontFile: UploadField;
  companyBackFile: UploadField;
  policeClearance: UploadField;
  localPoliceVerification: UploadField;
};

type EmployeeFileField = 'photoFile' | 'cnicFrontFile' | 'cnicBackFile' | 'companyFrontFile' | 'companyBackFile' | 'policeClearance' | 'localPoliceVerification';

type OrganizationData = {
  passCategory: "Cargo" | "Landside" | "";
  organizationName: string;
  organizationHead: string;
  headDesignation: string;
  headCnic: string;
  supervisorName: string;
  supervisorDesignation: string;
  supervisorCnic: string;
  companyContact: string;
  numberOfEmployees: number;
};

export default function AirportPassGenerator() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    passCategory: "",
    organizationName: "",
    organizationHead: "",
    headDesignation: "",
    headCnic: "",
    supervisorName: "",
    supervisorDesignation: "",
    supervisorCnic: "",
    companyContact: "",
    numberOfEmployees: 1,
  });

  const emptyEmployee = (): EmployeeData => ({
    name: "",
    fatherName: "",
    designation: "",
    payScale: "",
    serviceNo: "",
    nationality: "Pakistani",
    dateOfBirth: "",
    placeOfBirth: "",
    cnicNo: "",
    cnicIssueDate: "",
    presentAddress: "",
    permanentAddress: "",
    mobileNumber: "",
    email: "",
    securityClearanceNo: "",
    securityClearanceDate: "",
    previousPassNo: "",
    justification: "",
    areaRequired: "",
    photoFile: { file: null, preview: null, name: null },
    cnicFrontFile: { file: null, preview: null, name: null },
    cnicBackFile: { file: null, preview: null, name: null },
    companyFrontFile: { file: null, preview: null, name: null },
    companyBackFile: { file: null, preview: null, name: null },
    policeClearance: { file: null, preview: null, name: null },
    localPoliceVerification: { file: null, preview: null, name: null },
  });

  const [employees, setEmployees] = useState<EmployeeData[]>([emptyEmployee()]);
  const [generatedDocuments, setGeneratedDocuments] = useState<{ afu: string; undertaking: string; cnicIdCards?: string } | null>(null);
  const [feeReceiptFile, setFeeReceiptFile] = useState<UploadField>({ file: null, preview: null, name: null });
  const [submissionStatus, setSubmissionStatus] = useState<{ loading: boolean; success: boolean | null; message: string }>({
    loading: false,
    success: null,
    message: ""
  });

  const steps = [
    { number: 1, title: "Organization Details", icon: Building },
    { number: 2, title: "Employee Details", icon: Users },
    { number: 3, title: "Fee Payment", icon: Receipt },
    { number: 4, title: "Generate Documents", icon: FileText },
  ];

  const passCategories = ["Cargo", "Landside"];
  const areaOptions = [
    "Import | Export | Dom",
    "JTC Car Parking Area",
    "JTC Concourse Halls",
    "JTC Office Block",
  ];

  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      employees.forEach(emp => {
        const fields: EmployeeFileField[] = [
          'photoFile', 'cnicFrontFile', 'cnicBackFile', 
          'companyFrontFile', 'companyBackFile', 
          'policeClearance', 'localPoliceVerification'
        ];
        
        fields.forEach(field => {
          const uploadField = emp[field];
          if (uploadField?.preview?.startsWith('blob:')) {
            URL.revokeObjectURL(uploadField.preview);
          }
        });
      });
      
      if (feeReceiptFile.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(feeReceiptFile.preview);
      }
    };
  }, [employees, feeReceiptFile]);

  const formatCNIC = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  };

  const formatMobileNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
  };

  const handleCNICChange = (index: number, field: 'cnicNo' | 'headCnic' | 'supervisorCnic', value: string, isOrg = false) => {
    const formatted = formatCNIC(value);
    if (isOrg) {
      setOrganizationData(prev => ({ ...prev, [field]: formatted }));
    } else {
      handleEmployeeChange(index, field as keyof EmployeeData, formatted);
    }
  };

  const handleMobileChange = (index: number, value: string) => {
    const formatted = formatMobileNumber(value);
    handleEmployeeChange(index, 'mobileNumber', formatted);
  };

  const handleEmployeeFileChange = (index: number, field: EmployeeFileField, file?: File | null) => {
    const updated = [...employees];
    if (!file) {
      updated[index][field] = { file: null, preview: null, name: null };
      setEmployees(updated);
      return;
    }
    
    const preview = URL.createObjectURL(file);
    updated[index][field] = { file, preview, name: file.name };
    setEmployees(updated);
  };

  const handleEmployeeChange = <K extends keyof EmployeeData>(idx: number, key: K, value: EmployeeData[K]) => {
    const updated = [...employees];
    updated[idx] = { ...updated[idx], [key]: value };
    setEmployees(updated);
  };

  const addEmployee = () => {
    if (employees.length >= organizationData.numberOfEmployees) return;
    setEmployees([...employees, emptyEmployee()]);
  };

  const removeEmployee = (index: number) => {
    if (employees.length <= 1) return;
    const updated = employees.filter((_, i) => i !== index);
    setEmployees(updated);
  };

  const validateOrganizationData = () => {
    const errors = [];
    if (!organizationData.passCategory) errors.push("Pass Category is required");
    if (!organizationData.organizationName.trim()) errors.push("Organization Name is required");
    if (!organizationData.organizationHead.trim()) errors.push("Organization Head is required");
    if (!organizationData.headDesignation.trim()) errors.push("Head's Designation is required");
    if (!organizationData.headCnic.trim()) errors.push("Head's CNIC is required");
    if (!organizationData.supervisorName.trim()) errors.push("Supervisor Name is required");
    if (!organizationData.supervisorDesignation.trim()) errors.push("Supervisor Designation is required");
    if (!organizationData.supervisorCnic.trim()) errors.push("Supervisor CNIC is required");
    if (!organizationData.companyContact.trim()) errors.push("Company Contact is required");
    return errors;
  };

  const validateEmployeeData = (employee: EmployeeData, index: number) => {
    const errors = [];
    const empNum = index + 1;
    
    if (!employee.name.trim()) errors.push(`Employee ${empNum}: Name is required`);
    if (!employee.fatherName.trim()) errors.push(`Employee ${empNum}: Father's Name is required`);
    if (!employee.designation.trim()) errors.push(`Employee ${empNum}: Designation is required`);
    if (!employee.nationality.trim()) errors.push(`Employee ${empNum}: Nationality is required`);
    if (!employee.dateOfBirth) errors.push(`Employee ${empNum}: Date of Birth is required`);
    if (!employee.placeOfBirth.trim()) errors.push(`Employee ${empNum}: Place of Birth is required`);
    if (!employee.cnicNo.trim()) errors.push(`Employee ${empNum}: CNIC Number is required`);
    if (!employee.cnicIssueDate) errors.push(`Employee ${empNum}: CNIC Issue Date is required`);
    if (!employee.presentAddress.trim()) errors.push(`Employee ${empNum}: Present Address is required`);
    if (!employee.permanentAddress.trim()) errors.push(`Employee ${empNum}: Permanent Address is required`);
    if (!employee.mobileNumber.trim()) errors.push(`Employee ${empNum}: Mobile Number is required`);
    if (!employee.securityClearanceNo.trim()) errors.push(`Employee ${empNum}: Security Clearance No. is required`);
    if (!employee.securityClearanceDate) errors.push(`Employee ${empNum}: Security Clearance Date is required`);
    if (!employee.previousPassNo.trim()) errors.push(`Employee ${empNum}: Previous Pass No. is required`);
    if (!employee.justification.trim()) errors.push(`Employee ${empNum}: Justification is required`);
    if (!employee.areaRequired.trim()) errors.push(`Employee ${empNum}: Area Required is required`);
    
    if (!employee.photoFile.file) errors.push(`Employee ${empNum}: Passport Photo is required`);
    if (!employee.policeClearance.file) errors.push(`Employee ${empNum}: Police Clearance is required`);
    
    return errors;
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const orgErrors = validateOrganizationData();
      if (orgErrors.length > 0) {
        alert("Please fix the following errors:\n" + orgErrors.join("\n"));
        return;
      }
    }
    
    if (currentStep === 2) {
      const empErrors = employees.flatMap((emp, idx) => validateEmployeeData(emp, idx));
      if (empErrors.length > 0) {
        alert("Please fix the following errors:\n" + empErrors.join("\n"));
        return;
      }
    }
    
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const generateCnicIdCardHTML = (employee: EmployeeData) => {
    const cnicFrontHtml = employee.cnicFrontFile.preview ? `<img src="${employee.cnicFrontFile.preview}" alt="CNIC Front" style="width:100%; height:100%; object-fit:contain; border:1px solid #ccc;"/>` : "<div style='border:1px solid #ccc; height:100%; display:flex; align-items:center; justify-content:center; color:#666;'>CNIC Front Not Available</div>";
    const cnicBackHtml = employee.cnicBackFile.preview ? `<img src="${employee.cnicBackFile.preview}" alt="CNIC Back" style="width:100%; height:100%; object-fit:contain; border:1px solid #ccc;"/>` : "<div style='border:1px solid #ccc; height:100%; display:flex; align-items:center; justify-content:center; color:#666;'>CNIC Back Not Available</div>";
    const companyFrontHtml = employee.companyFrontFile.preview ? `<img src="${employee.companyFrontFile.preview}" alt="Company Card Front" style="width:100%; height:100%; object-fit:contain; border:1px solid #ccc;"/>` : "<div style='border:1px solid #ccc; height:100%; display:flex; align-items:center; justify-content:center; color:#666;'>Company Card Front Not Available</div>";
    const companyBackHtml = employee.companyBackFile.preview ? `<img src="${employee.companyBackFile.preview}" alt="Company Card Back" style="width:100%; height:100%; object-fit:contain; border:1px solid #ccc;"/>` : "<div style='border:1px solid #ccc; height:100%; display:flex; align-items:center; justify-content:center; color:#666;'>Company Card Back Not Available</div>";
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>ID Documents - ${employee.name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 8mm; font-size: 10pt; background: white; }
  .container { border: 2px solid #000; padding: 12px; box-sizing: border-box; max-width: 210mm; min-height: 297mm; }
  .header { text-align: center; margin-bottom: 20px; }
  .employee-info { text-align: center; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
  .cards-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: calc(100% - 120px); }
  .card-section { display: flex; flex-direction: column; }
  .card-title { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 10px; padding: 8px; background: #000; color: #fff; }
  .card-images { display: flex; flex-direction: column; gap: 15px; height: 100%; }
  .card-image { height: 200px; border: 2px solid #000; border-radius: 5px; overflow: hidden; }
  .image-label { text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 10pt; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div style="font-size: 16pt; font-weight: bold; margin-bottom: 4px;">IDENTITY DOCUMENTS</div>
    <div style="font-size: 12pt;">Pakistan Airports Authority - Jinnah International Airport, Karachi</div>
  </div>

  <div class="employee-info">
    <div style="font-size: 12pt; font-weight: bold;">${employee.name}</div>
    <div style="font-size: 10pt; margin-top: 2px;">CNIC: ${employee.cnicNo || "N/A"} | Designation: ${employee.designation || "N/A"}</div>
    <div style="font-size: 10pt;">Organization: ${organizationData.organizationName || "N/A"}</div>
  </div>

  <div class="cards-container">
    <div class="card-section">
      <div class="card-title">CNIC (COMPUTERIZED NATIONAL IDENTITY CARD)</div>
      <div class="card-images">
        <div>
          <div class="image-label">CNIC - FRONT SIDE</div>
          <div class="card-image">${cnicFrontHtml}</div>
        </div>
        <div>
          <div class="image-label">CNIC - BACK SIDE</div>
          <div class="card-image">${cnicBackHtml}</div>
        </div>
      </div>
    </div>

    <div class="card-section">
      <div class="card-title">COMPANY IDENTIFICATION CARD</div>
      <div class="card-images">
        <div>
          <div class="image-label">COMPANY CARD - FRONT SIDE</div>
          <div class="card-image">${companyFrontHtml}</div>
        </div>
        <div>
          <div class="image-label">COMPANY CARD - BACK SIDE</div>
          <div class="card-image">${companyBackHtml}</div>
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const generateApplicationHTML = (employee: EmployeeData) => {
    const passType = organizationData.passCategory || "CARGO";
    const org = organizationData;
    const photoHtml = employee.photoFile.preview ? `<img src="${employee.photoFile.preview}" alt="photo" style="width:100%; height:100%; object-fit:cover;"/>` : "Space for<br/>Recent<br/>Photograph<br/>(Only White<br/>Background &<br/>without headgear)<br/>Passport Size.<br/>Paste here)";
    
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
          <tr><td class="label">Deptt/Org/Embassy:</td><td>${org.organizationName || ""}</td></tr>
          <tr><td class="label">Nationality:</td><td>${employee.nationality || ""}</td></tr>
          <tr><td class="label">D.O.B & Place:</td><td>${employee.dateOfBirth || ""} / ${employee.placeOfBirth || ""}</td></tr>
          <tr><td class="label">CNIC/ Passport No.:</td><td>${employee.cnicNo || ""}</td></tr>
          <tr><td class="label">Date of Issue:</td><td>${employee.cnicIssueDate || ""}</td></tr>
          <tr><td class="label">Father/Husband Name:</td><td>${employee.fatherName || ""}</td></tr>
          <tr><td class="label">Present Address:</td><td>${employee.presentAddress || ""}</td></tr>
          <tr><td class="label">Permanent Res. Address:</td><td>${employee.permanentAddress || ""}</td></tr>
          <tr><td class="label">Telephone No. Office:</td><td>${org.companyContact || ""}</td></tr>
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
          <div style="margin-bottom: 4px;"><strong>Name:</strong> ${org.organizationHead || ""}</div>
          <div style="margin-bottom: 8px;"><strong>Desg:</strong> ${org.headDesignation || ""}</div>
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

  const generateUndertakingHTML = () => {
    const org = organizationData;
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
      ${employees.map((emp, i) => `<tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${emp.name || ""}</td>
        <td>${emp.fatherName || ""}</td>
        <td>${emp.dateOfBirth || ""}</td>
        <td>${emp.placeOfBirth || ""}</td>
        <td>${emp.designation || ""}</td>
        <td>${emp.mobileNumber || ""}</td>
        <td>${emp.cnicNo || ""}</td>
        <td style="font-size:8pt">${emp.presentAddress || ""}</td>
        <td style="font-size:8pt">${emp.permanentAddress || ""}</td>
        <td>${emp.areaRequired || ""}</td>
        <td style="font-size:8pt">${emp.justification || ""}</td>
        <td>Special Branch</td>
      </tr>`).join("")}
      ${Array.from({length: Math.max(0, 5 - employees.length)}, (_, i) => `<tr>
        <td style="text-align:center">${employees.length + i + 1}</td>
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

  const submitToSanity = async () => {
    setSubmissionStatus({ loading: true, success: null, message: "Submitting application..." });

    try {
      if (!organizationData.passCategory) {
        throw new Error("Select pass category");
      }
      if (!organizationData.organizationName) {
        throw new Error("Organization name required");
      }
      if (employees.length !== organizationData.numberOfEmployees) {
        throw new Error(`Please add exactly ${organizationData.numberOfEmployees} employee(s)`);
      }

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        if (!emp.photoFile.file) {
          throw new Error(`Employee ${i + 1} (${emp.name || 'unnamed'}): Passport photo is required`);
        }
        if (!emp.policeClearance.file) {
          throw new Error(`Employee ${i + 1} (${emp.name || 'unnamed'}): Police clearance is required`);
        }
      }

      const formData = new FormData();

      const orgData = {
        organizationName: organizationData.organizationName,
        organizationHead: organizationData.organizationHead,
        headDesignation: organizationData.headDesignation,
        companyContact: organizationData.companyContact,
        passCategory: organizationData.passCategory,
        headCnic: organizationData.headCnic,
        supervisorName: organizationData.supervisorName,
        supervisorDesignation: organizationData.supervisorDesignation,
        supervisorCnic: organizationData.supervisorCnic,
      };
      formData.append('organizationData', JSON.stringify(orgData));

      const employeesData = employees.map((emp) => ({
        name: emp.name,
        fatherName: emp.fatherName,
        designation: emp.designation,
        payScale: emp.payScale,
        serviceNo: emp.serviceNo,
        nationality: emp.nationality,
        idNumber: emp.cnicNo,
        dateOfBirth: emp.dateOfBirth,
        placeOfBirth: emp.placeOfBirth,
        presentAddress: emp.presentAddress,
        permanentAddress: emp.permanentAddress,
        mobileNumber: emp.mobileNumber,
        email: emp.email,
        areaRequired: emp.areaRequired ? [emp.areaRequired] : [],
        justification: emp.justification,
        securityClearanceNo: emp.securityClearanceNo,
        securityClearanceDate: emp.securityClearanceDate,
        previousPassNo: emp.previousPassNo,
      }));
      formData.append('employees', JSON.stringify(employeesData));

      if (feeReceiptFile.file) {
        formData.append('feeReceipt', feeReceiptFile.file);
      }

      employees.forEach((emp, index) => {
        if (emp.photoFile.file) {
          formData.append(`photo-${index}`, emp.photoFile.file);
        }
        if (emp.cnicFrontFile.file) {
          formData.append(`cnicFront-${index}`, emp.cnicFrontFile.file);
        }
        if (emp.cnicBackFile.file) {
          formData.append(`cnicBack-${index}`, emp.cnicBackFile.file);
        }
        if (emp.companyFrontFile.file) {
          formData.append(`companyCardFront-${index}`, emp.companyFrontFile.file);
        }
        if (emp.companyBackFile.file) {
          formData.append(`companyCardBack-${index}`, emp.companyBackFile.file);
        }
        if (emp.policeClearance.file) {
          formData.append(`policeClearance-${index}`, emp.policeClearance.file);
        }
        if (emp.localPoliceVerification.file) {
          formData.append(`localPoliceVerification-${index}`, emp.localPoliceVerification.file);
        }
      });

      const response = await fetch('/api/pending-applications', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const result = await response.json();
      setSubmissionStatus({
        loading: false,
        success: true,
        message: `Application submitted successfully! Reference ID: ${result.pending?._id || 'Generated'}`
      });

    } catch (error: unknown) {
      console.error('Submission error:', error);
      const message = error instanceof Error ? error.message : 'Failed to submit application';
      setSubmissionStatus({
        loading: false,
        success: false,
        message,
      });
    }
  };

  const handleGenerateDocuments = async () => {
    const allErrors = validateOrganizationData().concat(
      employees.flatMap((emp, idx) => validateEmployeeData(emp, idx))
    );
    if (allErrors.length > 0) {
      alert("Please fix the following errors before generating:\n" + allErrors.join("\n"));
      return;
    }

    const afu = employees.map((emp) => generateApplicationHTML(emp)).join("\n\n<div class='page-break'></div>\n\n");
    const undertaking = generateUndertakingHTML();
    
    const cnicIdCards = employees
      .map((emp) => {
        if (emp.cnicFrontFile.file || emp.cnicBackFile.file || emp.companyFrontFile.file || emp.companyBackFile.file) {
          return generateCnicIdCardHTML(emp);
        }
        return null;
      })
      .filter(Boolean)
      .join("\n\n<div class='page-break'></div>\n\n");
    
    const documents = { afu, undertaking, cnicIdCards: cnicIdCards || undefined };
    
    setGeneratedDocuments(documents);
    
    await submitToSanity();
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

  const printApplications = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    
    const idCardsHtml = employees
      .map((emp) => {
        if (emp.cnicFrontFile.file || emp.cnicBackFile.file || emp.companyFrontFile.file || emp.companyBackFile.file) {
          return generateCnicIdCardHTML(emp);
        }
        return null;
      })
      .filter(Boolean)
      .join('<div class="page-break"></div>');
    
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Airport Pass Applications - ${organizationData.organizationName}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;margin:0} .page-break{page-break-after:always}</style>
      </head><body>
      ${employees.map((emp, idx) => `${idx > 0 ? '<div class="page-break"></div>' : ""}${generateApplicationHTML(emp)}`).join("")}
      <div class="page-break"></div>
      ${generateUndertakingHTML()}
      ${idCardsHtml ? '<div class="page-break"></div>' + idCardsHtml : ''}
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Airport Entry Pass Generator</h1>
          <p className="text-gray-600">Generate AFU Cargo Pass & Landside Pass Applications</p>
        </div>

        {/* Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${currentStep >= step.number ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-500"}`}>
                    <Icon size={20} />
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={`text-sm font-medium ${currentStep >= step.number ? "text-blue-600" : "text-gray-500"}`}>Step {step.number}</p>
                    <p className={`text-xs ${currentStep >= step.number ? "text-blue-600" : "text-gray-400"}`}>{step.title}</p>
                  </div>
                  {step.number < steps.length && <ChevronRight className="ml-4 text-gray-400" size={20} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Organization Details</h2>
                <p className="text-sm text-gray-600 mb-6">Fields marked with <span className="text-red-500">*</span> are required</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pass Category <span className="text-red-500">*</span></label>
                  <select className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.passCategory} onChange={(e) => setOrganizationData({ ...organizationData, passCategory: e.target.value as OrganizationData['passCategory'] })} required>
                    <option value="">Select Pass Category</option>
                    {passCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.organizationName} onChange={(e) => setOrganizationData({ ...organizationData, organizationName: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Head <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.organizationHead} onChange={(e) => setOrganizationData({ ...organizationData, organizationHead: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Head&apos;s Designation <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.headDesignation} onChange={(e) => setOrganizationData({ ...organizationData, headDesignation: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Head&apos;s CNIC <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    value={organizationData.headCnic} 
                    onChange={(e) => handleCNICChange(-1, 'headCnic', e.target.value, true)} 
                    placeholder="12345-1234567-1" 
                    maxLength={15}
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor Name <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.supervisorName} onChange={(e) => setOrganizationData({ ...organizationData, supervisorName: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor Designation <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" value={organizationData.supervisorDesignation} onChange={(e) => setOrganizationData({ ...organizationData, supervisorDesignation: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor CNIC <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    value={organizationData.supervisorCnic} 
                    onChange={(e) => handleCNICChange(-1, 'supervisorCnic', e.target.value, true)} 
                    placeholder="12345-1234567-1" 
                    maxLength={15}
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Contact <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    value={organizationData.companyContact} 
                    onChange={(e) => setOrganizationData({ ...organizationData, companyContact: formatMobileNumber(e.target.value) })} 
                    placeholder="0300-1234567"
                    maxLength={12}
                    required 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    min={1} 
                    max={50}
                    className="w-full p-3 border border-gray-300 rounded-lg" 
                    value={organizationData.numberOfEmployees} 
                    onChange={(e) => {
                      const count = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                      setOrganizationData({ ...organizationData, numberOfEmployees: count });
                      if (count > employees.length) {
                        const diff = count - employees.length;
                        setEmployees((prev) => [...prev, ...Array(diff).fill(null).map(() => emptyEmployee())]);
                      }
                    }} 
                    required 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employees */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Employee Details</h2>
                  <p className="text-sm text-gray-600 mt-1">Fields marked with <span className="text-red-500">*</span> are required</p>
                </div>
                <button onClick={addEmployee} className="bg-green-600 text-white px-4 py-2 rounded-lg">Add Employee</button>
              </div>

              {employees.map((employee, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Employee {index + 1}</h3>
                    {employees.length > 1 && <button onClick={() => removeEmployee(index)} className="text-red-600">Remove</button>}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Enter full name" value={employee.name} onChange={(e) => handleEmployeeChange(index, "name", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Father&apos;s Name <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Enter father's name" value={employee.fatherName} onChange={(e) => handleEmployeeChange(index, "fatherName", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Enter job designation" value={employee.designation} onChange={(e) => handleEmployeeChange(index, "designation", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pay Scale (Optional)</label>
                      <input type="text" placeholder="Enter pay scale" value={employee.payScale} onChange={(e) => handleEmployeeChange(index, "payScale", e.target.value)} className="w-full p-3 border rounded" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service No. (Optional)</label>
                      <input type="text" placeholder="Enter service number" value={employee.serviceNo} onChange={(e) => handleEmployeeChange(index, "serviceNo", e.target.value)} className="w-full p-3 border rounded" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nationality <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Enter nationality" value={employee.nationality} onChange={(e) => handleEmployeeChange(index, "nationality", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" value={employee.dateOfBirth} onChange={(e) => handleEmployeeChange(index, "dateOfBirth", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Place of Birth <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Enter place of birth" value={employee.placeOfBirth} onChange={(e) => handleEmployeeChange(index, "placeOfBirth", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Number <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="12345-1234567-1" 
                        value={employee.cnicNo} 
                        onChange={(e) => handleCNICChange(index, 'cnicNo', e.target.value)} 
                        className="w-full p-3 border rounded"
                        maxLength={15}
                        required 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CNIC Issue Date <span className="text-red-500">*</span></label>
                      <input type="date" value={employee.cnicIssueDate} onChange={(e) => handleEmployeeChange(index, "cnicIssueDate", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="0300-1234567" 
                        value={employee.mobileNumber} 
                        onChange={(e) => handleMobileChange(index, e.target.value)} 
                        className="w-full p-3 border rounded"
                        maxLength={12}
                        required 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address (Optional)</label>
                      <input 
                        type="email" 
                        placeholder="Enter email address" 
                        value={employee.email} 
                        onChange={(e) => handleEmployeeChange(index, "email", e.target.value)} 
                        className="w-full p-3 border rounded" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security Clearance No. <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Enter clearance number" 
                        value={employee.securityClearanceNo} 
                        onChange={(e) => handleEmployeeChange(index, "securityClearanceNo", e.target.value)} 
                        className="w-full p-3 border rounded" 
                        required 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Security Clearance Date <span className="text-red-500">*</span></label>
                      <input type="date" value={employee.securityClearanceDate} onChange={(e) => handleEmployeeChange(index, "securityClearanceDate", e.target.value)} className="w-full p-3 border rounded" required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Previous Pass No. <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="Enter previous pass number or N/A" 
                        value={employee.previousPassNo} 
                        onChange={(e) => handleEmployeeChange(index, "previousPassNo", e.target.value)} 
                        className="w-full p-3 border rounded" 
                        required 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Area Required <span className="text-red-500">*</span></label>
                      <select value={employee.areaRequired} onChange={(e) => handleEmployeeChange(index, "areaRequired", e.target.value)} className="w-full p-3 border rounded" required>
                        <option value="">Select Area Required</option>
                        {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Present Address <span className="text-red-500">*</span></label>
                      <textarea placeholder="Enter current residential address" value={employee.presentAddress} onChange={(e) => handleEmployeeChange(index, "presentAddress", e.target.value)} className="w-full p-3 border rounded h-20" required />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Permanent Address <span className="text-red-500">*</span></label>
                      <textarea placeholder="Enter permanent residential address" value={employee.permanentAddress} onChange={(e) => handleEmployeeChange(index, "permanentAddress", e.target.value)} className="w-full p-3 border rounded h-20" required />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Justification <span className="text-red-500">*</span></label>
                      <textarea placeholder="Explain the business need and justification for airport access" value={employee.justification} onChange={(e) => handleEmployeeChange(index, "justification", e.target.value)} className="w-full p-3 border rounded h-24" required />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-lg font-semibold mb-4">Document Upload</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { key: "photoFile", label: "Passport Photo *", accept: "image/*", required: true },
                        { key: "cnicFrontFile", label: "CNIC Front (Optional)", accept: "image/*,.pdf", required: false },
                        { key: "cnicBackFile", label: "CNIC Back (Optional)", accept: "image/*,.pdf", required: false },
                        { key: "companyFrontFile", label: "Company Card Front (Optional)", accept: "image/*,.pdf", required: false },
                        { key: "companyBackFile", label: "Company Card Back (Optional)", accept: "image/*,.pdf", required: false },
                        { key: "policeClearance", label: "Police Clearance *", accept: ".pdf,image/*", required: true },
                      ].map((fileField) => {
                        const fileData = employees[index][fileField.key as EmployeeFileField];
                        return (
                          <div key={fileField.key}>
                            <label className="block text-sm font-medium mb-2">
                              {fileField.label}
                              {fileField.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input 
                              type="file" 
                              accept={fileField.accept} 
                              required={fileField.required}
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                handleEmployeeFileChange(index, fileField.key as EmployeeFileField, f || undefined);
                              }} 
                            />
                            <div className="text-xs text-gray-500">{fileData.name || "No file selected"}</div>
                          </div>
                        )
                      })}

                      {organizationData.passCategory === "Landside" && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Local Police Verification (Optional)</label>
                          <input type="file" accept=".pdf,image/*" onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            handleEmployeeFileChange(index, "localPoliceVerification", f || undefined);
                          }} />
                          <div className="text-xs text-gray-500">{employees[index].localPoliceVerification.name || "No file selected"}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Fee */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Fee Payment</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div>Number of Employees: {employees.length}</div>
                <div>Fee per Employee: Rs. 300/-</div>
                <div className="font-bold">Total Fee: Rs. {employees.length * 300}/-</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Fee Receipt (Optional)</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (!f) {
                    setFeeReceiptFile({ file: null, preview: null, name: null });
                    return;
                  }
                  const preview = URL.createObjectURL(f);
                  setFeeReceiptFile({ file: f, preview, name: f.name });
                }} />
                <div className="text-xs text-gray-500">{feeReceiptFile.name || "No file selected"}</div>
                <div className="text-xs text-gray-600 mt-1">Note: Fee receipt upload is optional for application generation</div>
              </div>
            </div>
          )}

          {/* Step 4: Generate / Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Generate Documents</h2>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold">Application Summary</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Organization:</strong> {organizationData.organizationName}</p>
                    <p><strong>Pass Category:</strong> {organizationData.passCategory}</p>
                    <p><strong>Number of Employees:</strong> {employees.length}</p>
                    <p><strong>Total Fee:</strong> Rs. {employees.length * 300}</p>
                  </div>
                  <div>
                    <p><strong>Head:</strong> {organizationData.organizationHead}</p>
                    <p><strong>Supervisor:</strong> {organizationData.supervisorName}</p>
                    <p><strong>Contact:</strong> {organizationData.companyContact}</p>
                    <p><strong>Fee Receipt:</strong> {feeReceiptFile.file ? "Uploaded" : "Not uploaded (optional)"}</p>
                  </div>
                </div>
              </div>

              {/* Submission Status Display */}
              {submissionStatus.loading && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-800">{submissionStatus.message}</span>
                  </div>
                </div>
              )}

              {submissionStatus.success !== null && !submissionStatus.loading && (
                <div className={`p-4 rounded-lg ${submissionStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <div className="flex items-center">
                    <span className={`mr-2 ${submissionStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                      {submissionStatus.success ? '✓' : '✗'}
                    </span>
                    {submissionStatus.message}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button 
                  onClick={handleGenerateDocuments} 
                  disabled={submissionStatus.loading}
                  className={`w-full py-3 rounded-lg ${submissionStatus.loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                  {submissionStatus.loading ? 'Generating & Submitting...' : 'Generate Documents & Submit Application'}
                </button>

                {generatedDocuments && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Generated Documents</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <button onClick={() => downloadDocument(generatedDocuments.afu, `Applications_${organizationData.organizationName || "org"}.html`)} className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700">📄 Download Applications (HTML)</button>
                      <button onClick={() => downloadDocument(generatedDocuments.undertaking, `Undertaking_${organizationData.organizationName || "org"}.html`)} className="px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700">📋 Download Undertaking (HTML)</button>
                      {generatedDocuments.cnicIdCards && (
                        <button onClick={() => downloadDocument(generatedDocuments.cnicIdCards!, `ID_Cards_${organizationData.organizationName || "org"}.html`)} className="px-4 py-3 bg-orange-600 text-white rounded hover:bg-orange-700">🆔 Download ID Cards (HTML)</button>
                      )}
                      <button onClick={printApplications} className="px-4 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700">🖨️ Print All</button>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded">
                      <h4 className="font-semibold">Next Steps</h4>
                      <ul className="text-sm ml-5 list-disc">
                        <li>Print generated documents</li>
                        <li>Attach supporting documents</li>
                        <li>Get signatures from applicants and organization head</li>
                        <li>Submit to PAA Vigilance Branch for processing</li>
                        <li>Application has been automatically saved to the system</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button onClick={prevStep} disabled={currentStep === 1} className={`px-6 py-3 rounded ${currentStep === 1 ? "bg-gray-100 text-gray-400" : "bg-gray-600 text-white hover:bg-gray-700"}`}>
              <ChevronLeft size={20} className="inline mr-2" /> Previous
            </button>

            <button onClick={nextStep} disabled={currentStep === 4} className={`px-6 py-3 rounded ${currentStep === 4 ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
              Next <ChevronRight size={20} className="inline ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}