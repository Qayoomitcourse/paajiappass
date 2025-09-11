"use client";

import { useState } from "react";

type OrgData = {
    category: "cargo" | "landside" | "";
    organization: string;
    headOfOrg: string;
    headDesignation: string;
    contactNumber: string;
    email: string;
    officeAddress: string;
    employeeCount: number;
    totalFee: number;
    managerName: string;
    managerContact: string;
    feeReceiptFile: File | null;
    coverLetter: File | null;
    workOrder: File | null;
    cargoLicense: File | null;
};

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
    photoFile: File | null;
    cnicFrontFile: File | null;
    cnicBackFile: File | null;
    companyFrontFile: File | null;
    companyBackFile: File | null;
    policeClearance: File | null;
    localPoliceVerification: File | null;
};

export default function ApplyPage() {
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [orgData, setOrgData] = useState<OrgData>({
        category: "",
        organization: "",
        headOfOrg: "",
        headDesignation: "",
        contactNumber: "",
        email: "",
        officeAddress: "",
        employeeCount: 0,
        totalFee: 0,
        managerName: "",
        managerContact: "",
        feeReceiptFile: null,
        coverLetter: null,
        workOrder: null,
        cargoLicense: null,
    });

    const [employees, setEmployees] = useState<EmployeeData[]>([]);

    const handleEmployeeChange = <K extends keyof EmployeeData>(
        idx: number,
        key: K,
        value: EmployeeData[K]
    ) => {
        const updated = [...employees];
        updated[idx] = { ...updated[idx], [key]: value };
        setEmployees(updated);
    };

    const addEmployee = () => {
        setEmployees([
            ...employees,
            {
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
                areaRequired: orgData.category === "cargo" ? "Import, Export, Domestic Cargo Operations" : "Landside Areas",
                photoFile: null,
                cnicFrontFile: null,
                cnicBackFile: null,
                companyFrontFile: null,
                companyBackFile: null,
                policeClearance: null,
                localPoliceVerification: null,
            },
        ]);
    };

    const removeEmployee = (idx: number) => {
        const updated = employees.filter((_, i) => i !== idx);
        setEmployees(updated);
    };

    const submitCase = async () => {
        if (employees.length !== orgData.employeeCount) {
            alert(
                `⚠️ Number of employees entered (${employees.length}) does not match required count (${orgData.employeeCount}).`
            );
            return;
        }
        if (!orgData.category) {
            alert("Please select a Pass Category.");
            return;
        }

        // Validate required fields
        const missingFields = [];
        if (!orgData.organization) missingFields.push("Organization Name");
        if (!orgData.headOfOrg) missingFields.push("Head of Organization");
        if (!orgData.contactNumber) missingFields.push("Contact Number");
        if (!orgData.managerName) missingFields.push("Manager/Supervisor Name");
        if (!orgData.managerContact) missingFields.push("Manager/Supervisor Contact");

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            if (!emp.name) missingFields.push(`Employee ${i + 1}: Name`);
            if (!emp.fatherName) missingFields.push(`Employee ${i + 1}: Father's Name`);
            if (!emp.cnicNo) missingFields.push(`Employee ${i + 1}: CNIC Number`);
            if (!emp.mobileNumber) missingFields.push(`Employee ${i + 1}: Mobile Number`);
        }

        if (missingFields.length > 0) {
            alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`);
            return;
        }

        console.log("Submitting application", { orgData, employees });
        setSubmitted(true);
    };

    const generateApplicationForm = (employee: EmployeeData, index: number) => {
        const passType = orgData.category === "cargo" ? "AFU CARGO PASS 2026" : "LANDSIDE PASS 2026";
        const currentDate = new Date().toLocaleDateString();

        return `
        <div class="application-form" style="font-family: Times, serif; width: 210mm; height: 297mm; margin: 0 auto; padding: 10mm; border: 3px solid #000; background: white; box-sizing: border-box; page-break-after: always; position: relative;">
            <div style="position:absolute; top:5mm; left:5mm; font-size:10px; font-weight:bold;">
        Form #${index + 1}
      </div>
            <!-- Photo Space - Top Right Corner -->
            <div style="position: absolute; top: 15mm; right: 15mm; width: 40mm; height: 50mm; border: 2px solid #000; text-align: center; font-size: 9px; display: flex; flex-direction: column; justify-content: center; align-items: center; line-height: 1.2;">
            <div style="margin-bottom: 2px;">Space for</div>
            <div style="margin-bottom: 2px;">Recent</div>
            <div style="margin-bottom: 2px;">Photograph</div>
            <div style="margin-bottom: 2px;">(Only White</div>
            <div style="margin-bottom: 2px;">Background &</div>
            <div style="margin-bottom: 2px;">without headgear)</div>
            <div style="margin-bottom: 2px;">Passport Size.</div>
            <div>Paste here)</div>
            </div>
            
            <!-- Header Section -->
            <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 3px;">APPLICATION FORM</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${passType}</div>
            <div style="font-size: 12px; line-height: 1.3;">
                <div style="font-weight: bold;">Pakistan Airports Authority</div>
                <div>Jinnah International Airport</div>
                <div>Karachi</div>
            </div>
            </div>
            
            <!-- Main Content - Avoiding photo area -->
            <div style="margin-right: 50mm; margin-top: 10mm;">
            
            <!-- Section 1: Applicant Information -->
            <div style="margin-bottom: 12px;">
                <div style="background: #000; color: white; padding: 2px 8px; font-weight: bold; font-size: 10px; margin-bottom: 8px; display: inline-block;">
                1&nbsp;&nbsp;&nbsp;&nbsp;APPLICANT INFORMATION
                </div>
                
                <table style="width: 100%; font-size: 9px; line-height: 1.3; border-collapse: collapse;">
                <tr>
                    <td style="width: 35%; font-weight: bold; padding: 2px 0; vertical-align: top;">Full Name:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.name || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Designation / Branch:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.designation || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Pay Scale/Group:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.payScale || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Service No.:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.serviceNo || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Deptt/Org/Embassy:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${orgData.organization || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Nationality:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.nationality || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">D.O.B & Place:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${(employee.dateOfBirth && employee.placeOfBirth) ? `${employee.dateOfBirth} / ${employee.placeOfBirth}` : ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">CNIC/ Passport No.:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.cnicNo || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Date of Issue:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.cnicIssueDate || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Father/Husband Name:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.fatherName || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Present Address:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 28px; vertical-align: top;">${employee.presentAddress || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Permanent Res. Address:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 28px; vertical-align: top;">${employee.permanentAddress || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Telephone No. Office:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${orgData.contactNumber || ''}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 2px 0; vertical-align: top;">Mob No.:</td>
                    <td style="border-bottom: 1px solid #000; padding: 2px 4px; height: 16px;">${employee.mobileNumber || ''} &nbsp;&nbsp;&nbsp; <strong>Email:</strong> ${employee.email || ''}</td>
                </tr>
                </table>
            </div>
            
            <!-- Section 2: Security Clearance -->
            <div style="margin-bottom: 12px;">
                <div style="background: #000; color: white; padding: 2px 8px; font-weight: bold; font-size: 10px; margin-bottom: 6px; display: inline-block;">
                2&nbsp;&nbsp;&nbsp;&nbsp;SECURITY CLEARANCE
                </div>
                <div style="font-size: 9px; line-height: 1.4;">
                <div style="margin-bottom: 6px;"><strong>Security Clearance Letter No. with date</strong></div>
                <div style="margin-bottom: 8px;"><strong>Special Branch</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 180px; padding: 2px;">${employee.securityClearanceNo || ''}</span></div>
                <div><strong>Previous Pass No. / Year:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 180px; padding: 2px;">${employee.previousPassNo || ''}</span></div>
                </div>
            </div>
            
            <!-- Section 3: Justification -->
            <div style="margin-bottom: 15px;">
                <div style="background: #000; color: white; padding: 2px 8px; font-weight: bold; font-size: 10px; margin-bottom: 6px; display: inline-block;">
                3&nbsp;&nbsp;&nbsp;&nbsp;JUSTIFICATION
                </div>
                <div style="min-height: 35px; border: 1px solid #000; padding: 4px; font-size: 9px; line-height: 1.3;">
                ${employee.justification || ''}
                </div>
            </div>
            </div>
            
            <!-- Section 4: Declaration & Undertaking (Full Width) -->
            <div style="margin-bottom: 15px; clear: both;">
            <div style="background: #000; color: white; padding: 2px 8px; font-weight: bold; font-size: 10px; margin-bottom: 6px; display: inline-block;">
                4&nbsp;&nbsp;&nbsp;&nbsp;DECLARATION & UNDERTAKING
            </div>
            <div style="font-size: 8px; line-height: 1.2; text-align: justify;">
                <p style="margin: 0 0 4px 0;">I, the undersigned, hereby declare that all information provided herein is accurate and truthful to the best of my knowledge. I solemnly undertake to comply with all applicable security regulations / instructions and understand that any violation may result in immediate cancellation of the ${orgData.category === "cargo" ? "AFU Cargo" : "Landside"} Pass and may also invite legal consequences.</p>
                
                <p style="margin: 0 0 4px 0;">I further undertake to return the ${orgData.category === "cargo" ? "AFU Cargo" : "Landside"} Pass upon its expiry, upon relinquishment of duties, or when no longer required, and to abide fully by the instructions printed on the reverse side of this form.</p>
                
                <p style="margin: 0 0 4px 0;">I acknowledge that submission of any forged, fraudulent, or otherwise falsified document shall constitute a serious offence under relevant laws, and shall render me liable to legal action.</p>
                
                <p style="margin: 0; font-weight: bold; font-size: 7px;"><strong>Note:</strong> Display of the Pass on the chest is mandatory for entry into airport premises and must be maintained at all times within ${orgData.category === "cargo" ? "Cargo Areas" : "Landside Areas"}.</p>
            </div>
            </div>
            
            <!-- Signature Section -->
            <div style="display: flex; justify-content: space-between; align-items: end; margin-top: 20px;">
            <div style="text-align: center; font-size: 9px;">
                <div style="border-bottom: 1px solid #000; width: 130px; height: 35px; margin-bottom: 3px;"></div>
                <div style="font-weight: bold;">Signature of applicant</div>
                <div style="margin-top: 6px;"><strong>Date:</strong> ${currentDate}</div>
            </div>
            
            <div style="text-align: center; font-size: 9px; border: 2px solid #000; padding: 8px; width: 220px;">
                <div style="font-weight: bold; margin-bottom: 8px; text-decoration: underline; line-height: 1.2;">COUNTERSIGNED BY THE<br>HEAD OF COMPANY / ORG</div>
                <div style="margin-bottom: 4px; text-align: left;"><strong>Name:</strong> ${orgData.headOfOrg || ''}</div>
                <div style="margin-bottom: 4px; text-align: left;"><strong>Desg:</strong> ${orgData.headDesignation || ''}</div>
                <div style="margin-bottom: 8px; text-align: left;"><strong>Official Seal:</strong></div>
                <div style="border-bottom: 1px solid #000; width: 150px; height: 20px; margin: 0 auto 3px;"></div>
                <div style="font-weight: bold;">Signature</div>
            </div>
            </div>
        </div>
        `;
    };

    const generateUndertakingForm = () => {
        return `
        <div class="undertaking-form" style="font-family: Times, serif; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; background: white; box-sizing: border-box; page-break-after: always;">
            <h2 style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 25px; text-decoration: underline;">UNDERTAKING / JUSTIFICATION FORM</h2>
            
            <div style="font-size: 12px; line-height: 1.5; margin-bottom: 20px; text-align: justify;">
            <p><strong>1.</strong> The firm M/s <strong><u>${orgData.organization || '_'.repeat(50)}</u></strong> (Company / Organization Name) will be responsible for any act of subversion or act of sabotage on the part of following employee will work under direct Supervision control and Supervision of our company / organization none of following employees will visit any other area except the assigned place of work/duty.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin: 25px 0; font-size: 9px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">S.#</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Name</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Father Name</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">D.O.B</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Place of Birth</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Desg.</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Mobile Number</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">CNIC No.</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Present Address</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Permanent Address</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Area required on New AEP</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Justification</th>
                <th style="border: 1px solid #000; padding: 6px; text-align: center; font-weight: bold;">Security Clearance</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map((emp, idx) => `
                <tr>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">${idx + 1}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.name || '_'.repeat(15)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.fatherName || '_'.repeat(15)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.dateOfBirth || '_'.repeat(10)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.placeOfBirth || '_'.repeat(12)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.designation || '_'.repeat(12)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.mobileNumber || '_'.repeat(12)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.cnicNo || '_'.repeat(15)}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${emp.presentAddress || '_'.repeat(20)}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${emp.permanentAddress || '_'.repeat(20)}</td>
                    <td style="border: 1px solid #000; padding: 4px;">${emp.areaRequired || '_'.repeat(15)}</td>
                    <td style="border: 1px solid #000; padding: 4px; font-size: 8px;">${emp.justification || '_'.repeat(20)}</td>
                    <td style="border: 1px solid #000; padding: 4px; text-align: center;">Special Branch</td>
                </tr>
                `).join('')}
            </tbody>
            </table>
            
            <div style="margin-top: 30px; font-size: 12px; line-height: 1.5;">
            <div style="font-weight: bold; margin-bottom: 15px; text-decoration: underline;">CERTIFICATE FROM THE CONCERNED AGENCY/FIRM/AIRLINE/DEPARTMENT</div>
            
            <p style="margin-bottom: 15px; text-align: justify;"><strong>2.</strong> Certified that above-mentioned applicant(s) is/are permanent/temporary employees(s) in my company / organization. The information given in the application(s) is/are correct as per official record and that individual(s) is/are Security Cleared.</p>
            
            <p style="margin-bottom: 25px; text-align: justify;"><strong>3.</strong> Mr. <strong><u>${orgData.managerName || '_'.repeat(30)}</u></strong> Contact: <strong><u>${orgData.managerContact || '_'.repeat(15)}</u></strong> Designation <strong><u>${orgData.headDesignation || '_'.repeat(30)}</u></strong> will supervise the work of the above-mentioned employee and will be responsible for their activities and in case of any undesirable happening be held responsible.</p>
            
            <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 11px;">
                <div style="width: 45%;">
                <div style="margin-bottom: 40px;">Signature & Stamp of Manager/Incharge ________________</div>
                <div style="line-height: 1.8;">
                    <div><strong>Name:</strong> ${orgData.managerName || '_'.repeat(30)}</div>
                    <div><strong>Contact:</strong> ${orgData.managerContact || '_'.repeat(30)}</div>
                    <div><strong>Company/Org:</strong> ${orgData.organization || '_'.repeat(30)}</div>
                    <div><strong>CNIC No:</strong> _______________________________</div>
                </div>
                </div>
                <div style="width: 45%;">
                <div style="margin-bottom: 40px;">Countersigned by the Head of Company / Org_______________</div>
                <div style="line-height: 1.8;">
                    <div><strong>Name:</strong> ${orgData.headOfOrg || '_'.repeat(30)}</div>
                    <div><strong>Desig:</strong> ${orgData.headDesignation || '_'.repeat(30)}</div>
                    <div><strong>Co/Org:</strong> ${orgData.organization || '_'.repeat(30)}</div>
                    <div><strong>NIC No:</strong> _______________________________</div>
                </div>
                </div>
            </div>
            </div>
        </div>
        `;
    };

    const printApplications = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
            <html>
            <head>
                <title>Airport Pass Applications</title>
                <style>
                body { 
                    font-family: Times, serif; 
                    margin: 0; 
                    padding: 0; 
                    background: white;
                }
                .page-break { 
                    page-break-before: always; 
                }
                @media print {
                    .page-break { 
                    page-break-before: always; 
                    }
                    body {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    }
                }
                </style>
            </head>
            <body>
                ${employees.map((emp, idx) =>
                `${idx > 0 ? '<div class="page-break"></div>' : ''}${generateApplicationForm(emp, idx)}`
            ).join('')}
                <div class="page-break"></div>
                ${generateUndertakingForm()}
            </body>
            </html>
        `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    if (submitted) {
        return (
            <div className="max-w-4xl mx-auto py-10 px-4">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-green-600 mb-2">Documents Generated Successfully!</h1>
                        <p className="text-gray-600 mb-6">Your airport entry pass application forms have been generated and are ready for submission.</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Generated Documents</h3>
                        <div className="space-y-2">
                            <p>✅ {employees.length} Individual Application Form(s)</p>
                            <p>✅ 1 Undertaking/Justification Form</p>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 text-yellow-800">Next Steps - Important Instructions</h3>
                        <div className="text-left text-sm space-y-2">
                            <p><strong>1.</strong> Download and print the following documents using the buttons below</p>
                            <p><strong>2.</strong> Submit the hard copies to <strong>PAA Vigilance Branch</strong> along with all required documents:</p>
                            <ul className="ml-6 space-y-1">
                                <li>• Cover letter (signed by Head of Organization)</li>
                                <li>• Fee receipt (Rs. {orgData.totalFee})</li>
                                <li>• Work Order/Letter of Award from PAA</li>
                                {orgData.category === "cargo" && <li>• Cargo Agent License / Custom License</li>}
                                <li>• Employee photos, CNIC copies, Company cards</li>
                                <li>• Special Branch Police Clearance certificates</li>
                                {orgData.category === "landside" && <li>• Local Police Verification certificates</li>}
                            </ul>
                            <p><strong>3.</strong> Processing time may vary depending on verification requirements</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={printApplications}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            📄 Download All Application Forms
                        </button>

                        <button
                            onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                    printWindow.document.write(`
                        <html>
                        <head>
                            <title>Undertaking Form</title>
                            <style>
                            body { 
                                font-family: Times, serif; 
                                margin: 0; 
                                padding: 0; 
                                background: white;
                            }
                            @media print {
                                body {
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                }
                            }
                            </style>
                        </head>
                        <body>
                            ${generateUndertakingForm()}
                        </body>
                        </html>
                    `);
                                    printWindow.document.close();
                                    printWindow.focus();
                                    printWindow.print();
                                }
                            }}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            📋 Download Undertaking Form
                        </button>

                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setStep(1);
                                setOrgData({
                                    category: "",
                                    organization: "",
                                    headOfOrg: "",
                                    headDesignation: "",
                                    contactNumber: "",
                                    email: "",
                                    officeAddress: "",
                                    employeeCount: 0,
                                    totalFee: 0,
                                    managerName: "",
                                    managerContact: "",
                                    feeReceiptFile: null,
                                    coverLetter: null,
                                    workOrder: null,
                                    cargoLicense: null,
                                });
                                setEmployees([]);
                            }}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            🆕 New Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Apply for Airport Entry Pass
            </h1>

            {/* Stepper */}
            <div className="flex justify-center mb-8 space-x-4">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${step === s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                            }`}
                    >
                        {s}
                    </div>
                ))}
            </div>

            {/* Step 1: Organization Info */}
            {step === 1 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Organization Information</h2>

                    <select
                        value={orgData.category}
                        onChange={(e) =>
                            setOrgData({
                                ...orgData,
                                category: e.target.value as "cargo" | "landside" | "",
                            })
                        }
                        className="w-full p-3 border rounded-lg"
                    >
                        <option value="">Select Pass Category *</option>
                        <option value="cargo">AFU Cargo Pass (Rs. 300 per employee)</option>
                        <option value="landside">Landside Pass (Rs. 300 per employee)</option>
                    </select>

                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Organization Name *"
                            value={orgData.organization}
                            onChange={(e) =>
                                setOrgData({ ...orgData, organization: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="text"
                            placeholder="Head of Organization *"
                            value={orgData.headOfOrg}
                            onChange={(e) =>
                                setOrgData({ ...orgData, headOfOrg: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="text"
                            placeholder="Head's Designation"
                            value={orgData.headDesignation}
                            onChange={(e) =>
                                setOrgData({ ...orgData, headDesignation: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="text"
                            placeholder="Contact Number *"
                            value={orgData.contactNumber}
                            onChange={(e) =>
                                setOrgData({ ...orgData, contactNumber: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="email"
                            placeholder="Email Address"
                            value={orgData.email}
                            onChange={(e) =>
                                setOrgData({ ...orgData, email: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="number"
                            placeholder="Number of Employees *"
                            value={orgData.employeeCount}
                            onChange={(e) => {
                                const count = parseInt(e.target.value) || 0;
                                setOrgData({
                                    ...orgData,
                                    employeeCount: count,
                                    totalFee: count * 300,
                                });
                            }}
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="text"
                            placeholder="Manager/Supervisor Name *"
                            value={orgData.managerName}
                            onChange={(e) =>
                                setOrgData({ ...orgData, managerName: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />

                        <input
                            type="text"
                            placeholder="Manager/Supervisor Contact *"
                            value={orgData.managerContact}
                            onChange={(e) =>
                                setOrgData({ ...orgData, managerContact: e.target.value })
                            }
                            className="w-full p-3 border rounded-lg"
                        />
                    </div>

                    <textarea
                        placeholder="Office Address"
                        value={orgData.officeAddress}
                        onChange={(e) =>
                            setOrgData({ ...orgData, officeAddress: e.target.value })
                        }
                        className="w-full p-3 border rounded-lg h-24"
                    />

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2">Fee Calculation</h3>
                        <p className="text-blue-700">
                            Number of Employees: {orgData.employeeCount} × Rs. 300 = <strong>Rs. {orgData.totalFee}</strong>
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Required Documents</h3>

                        <div>
                            <label className="block text-sm font-medium mb-2">Cover Letter (signed by Head of Organization)</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) =>
                                    setOrgData({
                                        ...orgData,
                                        coverLetter: e.target.files?.[0] || null,
                                    })
                                }
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Fee Receipt</label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) =>
                                    setOrgData({
                                        ...orgData,
                                        feeReceiptFile: e.target.files?.[0] || null,
                                    })
                                }
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Work Order/Letter of Award (issued by PAA)</label>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) =>
                                    setOrgData({
                                        ...orgData,
                                        workOrder: e.target.files?.[0] || null,
                                    })
                                }
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>

                        {orgData.category === "cargo" && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Cargo Agent License / Custom License</label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={(e) =>
                                        setOrgData({
                                            ...orgData,
                                            cargoLicense: e.target.files?.[0] || null,
                                        })
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (!orgData.category || !orgData.organization || !orgData.headOfOrg || !orgData.contactNumber || !orgData.managerName || !orgData.managerContact || orgData.employeeCount === 0) {
                                alert("Please fill in all required fields marked with *");
                                return;
                            }
                            setStep(2);
                        }}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Next: Add Employees →
                    </button>
                </div>
            )}

            {/* Step 2: Employees */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Employee Information</h2>
                        <button
                            onClick={addEmployee}
                            disabled={employees.length >= orgData.employeeCount}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + Add Employee
                        </button>
                    </div>

                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        Added {employees.length} of {orgData.employeeCount} employees.
                        {employees.length < orgData.employeeCount && ` Please add ${orgData.employeeCount - employees.length} more employee(s).`}
                    </p>

                    {employees.map((emp, idx) => (
                        <div key={idx} className="p-6 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Employee {idx + 1}</h3>
                                <button
                                    onClick={() => removeEmployee(idx)}
                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                >
                                    Remove
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Full Name *"
                                    value={emp.name}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "name", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Father's Name *"
                                    value={emp.fatherName}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "fatherName", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Designation"
                                    value={emp.designation}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "designation", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Pay Scale/Group"
                                    value={emp.payScale}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "payScale", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Service Number"
                                    value={emp.serviceNo}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "serviceNo", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <select
                                    value={emp.nationality}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "nationality", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="Pakistani">Pakistani</option>
                                    <option value="Other">Other</option>
                                </select>

                                <input
                                    type="date"
                                    placeholder="Date of Birth"
                                    value={emp.dateOfBirth}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "dateOfBirth", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Place of Birth"
                                    value={emp.placeOfBirth}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "placeOfBirth", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="CNIC Number *"
                                    value={emp.cnicNo}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "cnicNo", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="date"
                                    placeholder="CNIC Issue Date"
                                    value={emp.cnicIssueDate}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "cnicIssueDate", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Mobile Number *"
                                    value={emp.mobileNumber}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "mobileNumber", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={emp.email}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "email", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Security Clearance No."
                                    value={emp.securityClearanceNo}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "securityClearanceNo", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="date"
                                    placeholder="Security Clearance Date"
                                    value={emp.securityClearanceDate}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "securityClearanceDate", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Previous Pass No./Year"
                                    value={emp.previousPassNo}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "previousPassNo", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />

                                <input
                                    type="text"
                                    placeholder="Area Required"
                                    value={emp.areaRequired}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "areaRequired", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>

                            <div className="grid md:grid-cols-1 gap-4 mt-4">
                                <textarea
                                    placeholder="Present Address *"
                                    value={emp.presentAddress}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "presentAddress", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg h-20"
                                />

                                <textarea
                                    placeholder="Permanent Address"
                                    value={emp.permanentAddress}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "permanentAddress", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg h-20"
                                />

                                <textarea
                                    placeholder="Justification for Pass Requirement"
                                    value={emp.justification}
                                    onChange={(e) =>
                                        handleEmployeeChange(idx, "justification", e.target.value)
                                    }
                                    className="w-full p-2 border rounded-lg h-24"
                                />
                            </div>

                            <div className="mt-6">
                                <h4 className="font-semibold mb-3">Required Documents</h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Photo (passport size, white background)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "photoFile",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">CNIC Front</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "cnicFrontFile",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">CNIC Back</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "cnicBackFile",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Company Card Front</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "companyFrontFile",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Company Card Back</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "companyBackFile",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Special Branch Police Clearance</label>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) =>
                                                handleEmployeeChange(
                                                    idx,
                                                    "policeClearance",
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>

                                    {orgData.category === "landside" && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Local Police Verification</label>
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={(e) =>
                                                    handleEmployeeChange(
                                                        idx,
                                                        "localPoliceVerification",
                                                        e.target.files?.[0] || null
                                                    )
                                                }
                                                className="w-full p-2 border rounded-lg"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            ← Back
                        </button>

                        <button
                            onClick={() => {
                                if (employees.length !== orgData.employeeCount) {
                                    alert(
                                        `⚠️ You must add exactly ${orgData.employeeCount} employees before proceeding.`
                                    );
                                    return;
                                }

                                // Validate required employee fields
                                const missingFields = [];
                                for (let i = 0; i < employees.length; i++) {
                                    const emp = employees[i];
                                    if (!emp.name) missingFields.push(`Employee ${i + 1}: Name`);
                                    if (!emp.fatherName) missingFields.push(`Employee ${i + 1}: Father's Name`);
                                    if (!emp.cnicNo) missingFields.push(`Employee ${i + 1}: CNIC Number`);
                                    if (!emp.mobileNumber) missingFields.push(`Employee ${i + 1}: Mobile Number`);
                                    if (!emp.presentAddress) missingFields.push(`Employee ${i + 1}: Present Address`);
                                }

                                if (missingFields.length > 0) {
                                    alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`);
                                    return;
                                }

                                setStep(3);
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Next: Review →
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Review Application</h2>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Organization Details</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div><strong>Pass Category:</strong> {orgData.category === "cargo" ? "AFU Cargo Pass" : "Landside Pass"}</div>
                            <div><strong>Organization:</strong> {orgData.organization}</div>
                            <div><strong>Head of Organization:</strong> {orgData.headOfOrg}</div>
                            <div><strong>Designation:</strong> {orgData.headDesignation}</div>
                            <div><strong>Contact Number:</strong> {orgData.contactNumber}</div>
                            <div><strong>Email:</strong> {orgData.email}</div>
                            <div><strong>Manager/Supervisor:</strong> {orgData.managerName}</div>
                            <div><strong>Manager Contact:</strong> {orgData.managerContact}</div>
                            <div><strong>Number of Employees:</strong> {orgData.employeeCount}</div>
                            <div><strong>Total Fee:</strong> Rs. {orgData.totalFee}</div>
                        </div>
                        {orgData.officeAddress && (
                            <div className="mt-3">
                                <strong>Office Address:</strong> {orgData.officeAddress}
                            </div>
                        )}
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4">Employee Summary</h3>
                        <div className="space-y-3">
                            {employees.map((emp, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white rounded border">
                                    <div>
                                        <div className="font-medium">{emp.name}</div>
                                        <div className="text-sm text-gray-600">
                                            Father: {emp.fatherName} | CNIC: {emp.cnicNo} | Mobile: {emp.mobileNumber}
                                        </div>
                                        {emp.designation && <div className="text-sm text-gray-600">Designation: {emp.designation}</div>}
                                    </div>
                                    <div className="text-sm text-gray-500">Employee {idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Required Documents Checklist</h3>
                        <div className="text-sm space-y-1">
                            <div className="flex items-center">
                                <span className={`mr-2 ${orgData.coverLetter ? 'text-green-600' : 'text-red-600'}`}>
                                    {orgData.coverLetter ? '✓' : '✗'}
                                </span>
                                Cover letter signed by Head of Organization
                            </div>
                            <div className="flex items-center">
                                <span className={`mr-2 ${orgData.feeReceiptFile ? 'text-green-600' : 'text-red-600'}`}>
                                    {orgData.feeReceiptFile ? '✓' : '✗'}
                                </span>
                                Fee receipt
                            </div>
                            <div className="flex items-center">
                                <span className={`mr-2 ${orgData.workOrder ? 'text-green-600' : 'text-red-600'}`}>
                                    {orgData.workOrder ? '✓' : '✗'}
                                </span>
                                Work Order/Letter of Award from PAA
                            </div>
                            {orgData.category === "cargo" && (
                                <div className="flex items-center">
                                    <span className={`mr-2 ${orgData.cargoLicense ? 'text-green-600' : 'text-red-600'}`}>
                                        {orgData.cargoLicense ? '✓' : '✗'}
                                    </span>
                                    Cargo Agent License / Custom License
                                </div>
                            )}
                            <div className="mt-2 text-gray-600">
                                <strong>Per Employee:</strong> Photo, CNIC copies, Company card copies, Police clearance
                                {orgData.category === "landside" && ", Local police verification"}
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-800 mb-2">Important Note</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                            <li>• All information must be accurate and complete</li>
                            <li>• False information may result in rejection or legal consequences</li>
                            <li>• Passes are issued on &quot;Need to Enter&quot; basis only</li>                            <li>• All documents must be attested copies where applicable</li>
                            <li>• Display of pass on chest is mandatory within airport premises</li>
                        </ul>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(2)}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            ← Back to Employees
                        </button>

                        <button
                            onClick={submitCase}
                            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                            Generate Application Forms ✅
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}