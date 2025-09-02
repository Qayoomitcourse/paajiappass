// /app/api/add-pass/route.ts - FIXED VERSION WITH TYPE CORRECTIONS

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { writeClient } from '@/sanity/lib/client';
import { getNextPassId } from '../passes/logic';
import { EmployeePass } from '@/app/types';

// Zod Schemas
const securityDocSchema = z.object({
  docType: z.string().min(1, "Document Type is required."),
  issueDate: z.string().optional(),
});

const financialDetailSchema = z.object({
  receiptNumber: z.string().min(1, "Receipt Number is required."),
  totalAmount: z.string().min(1, "Total Amount is required."),
  dateOfPayment: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date of payment."),
  bank: z.enum(["HBL", "NBP", "OTHER"]),
  otherBankName: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CHEQUE", "ONLINE_TRANSFER", "BANK_DRAFT"]),
  chequeNumber: z.string().optional(),
  isMultipleEmployees: z.boolean().default(false),
  employeeCount: z.number().int().min(1).optional(),
  amountPerEmployee: z.string().optional(),
  remarks: z.string().optional(),
})
.refine(
  (data) => data.paymentMethod !== "CHEQUE" && data.paymentMethod !== "BANK_DRAFT" || !!data.chequeNumber,
  { message: "Cheque/Draft number is required for CHEQUE and BANK_DRAFT payment methods", path: ["chequeNumber"] }
)
.refine(
  (data) => data.bank !== "OTHER" || !!data.otherBankName,
  { message: "Other bank name is required when bank is OTHER", path: ["otherBankName"] }
);

const addPassSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  fatherName: z.string().optional(),
  idNumber: z.string().min(1, "ID Number is required."),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  mobileNumber: z.string().optional(),
  permanentAddress: z.string().optional(),
  presentAddress: z.string().optional(),
  designation: z.string().min(2, "Designation is required."),
  organization: z.string().min(2, "Organization is required."),
  category: z.enum(['cargo', 'landside']),
  areaAllowed: z.array(z.string()).min(1, "At least one area must be selected."),
  dateOfEntry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid entry date."),
  dateOfExpiry: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid expiry date."),
  securityClearance: z.string().optional(),
  isExempt: z.boolean().default(false),
  exemptionRemarks: z.string().optional(),
  securityDocuments: z.array(securityDocSchema).optional(),
  financialDetails: z.array(financialDetailSchema).optional(),
})
// .refine(
//   (data) => data.isExempt || (data.financialDetails && data.financialDetails.length > 0),
//   { message: "Financial details are required unless exempt", path: ["financialDetails"] }
// )
// .refine(
//   (data) => !data.isExempt || !!data.exemptionRemarks,
//   { message: "Exemption remarks are required when exempt", path: ["exemptionRemarks"] }
// );

// Proper Types
type SecurityDocInput = z.infer<typeof securityDocSchema> & { _file?: File };
type FinancialDetailInput = z.infer<typeof financialDetailSchema> & { _file?: File };

// Interface for form data parsing result
interface ParsedFormData {
  [key: string]: unknown;
  areaAllowed?: string[];
  securityDocuments?: SecurityDocInput[];
  financialDetails?: FinancialDetailInput[];
  isExempt?: boolean;
}

// Interface for security document with file handling - FIXED
interface SecurityDocumentWithFile {
  docType?: string;
  issueDate?: string;
  _file?: File;
}

// Interface for financial detail with file handling - FIXED
interface FinancialDetailWithFile {
  receiptNumber?: string;
  totalAmount?: string;
  dateOfPayment?: string;
  bank?: string;
  otherBankName?: string;
  paymentMethod?: string;
  chequeNumber?: string;
  isMultipleEmployees?: boolean; // Changed from undefined to optional boolean
  employeeCount?: number;
  amountPerEmployee?: string;
  remarks?: string;
  _file?: File;
}

// Interface for pass document structure
interface PassDocument {
  _type: string;
  name: string;
  fatherName?: string;
  idNumber: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  designation: string;
  organization: string;
  category: 'cargo' | 'landside';
  areaAllowed: string[];
  dateOfEntry: string;
  dateOfExpiry: string;
  securityClearance?: string;
  isExempt: boolean;
  exemptionRemarks?: string;
  passId: string;
  author: { _type: string; _ref: string };
  photo?: { _type: string; asset: { _type: string; _ref: string } };
  securityDocuments?: Array<{
    _key: string;
    _type: string;
    docType: string;
    issueDate?: string;
    document?: { _type: string; asset: { _type: string; _ref: string } };
  }>;
  financialDetails?: Array<{
    _key: string;
    _type: string;
    receiptNumber: string;
    totalAmount: string;
    dateOfPayment: string;
    bank: string;
    otherBankName?: string;
    paymentMethod: string;
    chequeNumber?: string;
    isMultipleEmployees?: boolean;
    employeeCount?: number;
    amountPerEmployee?: string;
    remarks?: string;
    receiptImage?: { _type: string; asset: { _type: string; _ref: string } };
  }>;
}

export async function POST(req: NextRequest) {
  console.log("=== API ROUTE START ===");
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    console.log("FormData received, entries count:", Array.from(formData.entries()).length);
    
    // Debug: Log all FormData entries
    console.log("=== ALL FORM DATA ENTRIES ===");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`File field: ${key}, Name: ${value.name}, Size: ${value.size}, Type: ${value.type}`);
      } else {
        console.log(`Text field: ${key}, Value: ${value}`);
      }
    }
    
    // FIXED parseFormData function with proper type handling
    const parseFormData = (formData: FormData): ParsedFormData => {
      const data: ParsedFormData = {};
      const securityDocsMap = new Map<number, SecurityDocumentWithFile>();
      const financialDetailsMap = new Map<number, FinancialDetailWithFile>();
      
      console.log("=== PARSING FORM DATA ===");
      
      for (const [key, value] of formData.entries()) {
        
        // Handle array fields
        if (key === 'areaAllowed') {
          if (!data.areaAllowed) data.areaAllowed = [];
          data.areaAllowed.push(value as string);
        } 
        // Security Documents Processing - FIXED
        else if (key.startsWith('securityDocument_') && !key.includes('Type') && !key.includes('Date') && !key.includes('Id')) {
          const match = key.match(/securityDocument_(\d+)$/);
          if (match && value instanceof File && value.size > 0) {
            const index = parseInt(match[1]);
            if (!securityDocsMap.has(index)) {
              securityDocsMap.set(index, {});
            }
            const existingDoc = securityDocsMap.get(index)!;
            existingDoc._file = value;
            console.log(`Security doc ${index} file:`, value.name, value.size);
          }
        }
        else if (key.startsWith('securityDocumentType_')) {
          const match = key.match(/securityDocumentType_(\d+)/);
          if (match) {
            const index = parseInt(match[1]);
            if (!securityDocsMap.has(index)) {
              securityDocsMap.set(index, {});
            }
            const existingDoc = securityDocsMap.get(index)!;
            existingDoc.docType = value as string;
            console.log(`Security doc ${index} type:`, value);
          }
        }
        else if (key.startsWith('securityDocumentDate_')) {
          const match = key.match(/securityDocumentDate_(\d+)/);
          if (match) {
            const index = parseInt(match[1]);
            if (!securityDocsMap.has(index)) {
              securityDocsMap.set(index, {});
            }
            const existingDoc = securityDocsMap.get(index)!;
            existingDoc.issueDate = value as string;
            console.log(`Security doc ${index} date:`, value);
          }
        }
        // Financial Details Processing - FIXED TYPE HANDLING
        else if (key.startsWith('financialDetail_')) {
          const match = key.match(/financialDetail_(\d+)_(.+)/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            
            if (!financialDetailsMap.has(index)) {
              financialDetailsMap.set(index, {});
            }
            const existingDetail = financialDetailsMap.get(index)!;
            
            if (field === 'receiptImage' && value instanceof File && value.size > 0) {
              existingDetail._file = value;
              console.log(`Financial detail ${index} receipt:`, value.name, value.size);
            } else if (field !== 'receiptImage') {
              // FIXED: Proper type handling without type assertions
              if (field === 'isMultipleEmployees') {
                existingDetail.isMultipleEmployees = value === 'true';
              } else if (field === 'employeeCount') {
                existingDetail.employeeCount = parseInt(value as string);
              } else if (value !== 'undefined' && value !== '') {
                // Use type assertion more safely
                switch (field) {
                  case 'receiptNumber':
                    existingDetail.receiptNumber = value as string;
                    break;
                  case 'totalAmount':
                    existingDetail.totalAmount = value as string;
                    break;
                  case 'dateOfPayment':
                    existingDetail.dateOfPayment = value as string;
                    break;
                  case 'bank':
                    existingDetail.bank = value as string;
                    break;
                  case 'otherBankName':
                    existingDetail.otherBankName = value as string;
                    break;
                  case 'paymentMethod':
                    existingDetail.paymentMethod = value as string;
                    break;
                  case 'chequeNumber':
                    existingDetail.chequeNumber = value as string;
                    break;
                  case 'amountPerEmployee':
                    existingDetail.amountPerEmployee = value as string;
                    break;
                  case 'remarks':
                    existingDetail.remarks = value as string;
                    break;
                  default:
                    // For unknown fields, use general assignment
                    (existingDetail as Record<string, unknown>)[field] = value;
                }
              }
            }
          }
        }
        // Handle simple fields
        else if (!key.startsWith('securityDocumentId_') && !key.startsWith('financialDetail_') && key !== 'photo') {
          if (key === 'isExempt') {
            data[key] = value === 'true';
          } else {
            data[key] = value;
          }
        }
      }
      
      // Convert Maps to Arrays - FIXED TYPE COMPATIBILITY
      data.securityDocuments = Array.from(securityDocsMap.values())
        .filter((doc): doc is SecurityDocumentWithFile => {
          const hasContent = !!(doc && (doc._file || doc.docType));
          if (hasContent) {
            console.log("Security doc being added:", { 
              hasFile: !!doc._file, 
              docType: doc.docType,
              fileName: doc._file?.name 
            });
          }
          // Only include docs that have the required docType field or a file
          return hasContent && (!!doc.docType || !!doc._file);
        })
        .map((doc): SecurityDocInput => ({
          docType: doc.docType || 'Unknown', // Provide default if missing - ensures non-undefined
          issueDate: doc.issueDate,
          _file: doc._file
        }));
      
      data.financialDetails = Array.from(financialDetailsMap.values())
        .filter((detail): detail is FinancialDetailWithFile => {
          const hasContent = !!(detail && (detail._file || detail.receiptNumber));
          if (hasContent) {
            console.log("Financial detail being added:", { 
              hasFile: !!detail._file, 
              receiptNumber: detail.receiptNumber,
              fileName: detail._file?.name 
            });
          }
          // Only include details that have required fields
          return hasContent && (!!detail.receiptNumber || !!detail._file);
        })
        .map((detail): FinancialDetailInput => ({
          receiptNumber: detail.receiptNumber || 'Unknown', // Ensure non-undefined
          totalAmount: detail.totalAmount || '0', // Ensure non-undefined
          dateOfPayment: detail.dateOfPayment || new Date().toISOString().split('T')[0], // Ensure non-undefined
          bank: (detail.bank as "HBL" | "NBP" | "OTHER") || 'OTHER', // Ensure valid enum
          otherBankName: detail.otherBankName,
          paymentMethod: (detail.paymentMethod as "CASH" | "CHEQUE" | "ONLINE_TRANSFER" | "BANK_DRAFT") || 'CASH', // Ensure valid enum
          chequeNumber: detail.chequeNumber,
          isMultipleEmployees: detail.isMultipleEmployees || false, // Ensure boolean
          employeeCount: detail.employeeCount,
          amountPerEmployee: detail.amountPerEmployee,
          remarks: detail.remarks,
          _file: detail._file
        }));

      console.log("Final parsed security documents:", data.securityDocuments.length);
      console.log("Final parsed financial details:", data.financialDetails.length);
      
      // Additional debug logging
      console.log("Security docs with files:", data.securityDocuments.filter(d => d._file).length);
      console.log("Financial details with files:", data.financialDetails.filter(d => d._file).length);
      
      return data;
    };

    const dataToValidate = parseFormData(formData);
    
    const originalSecurityDocs = dataToValidate.securityDocuments || [];
    const originalFinancialDetails = dataToValidate.financialDetails || [];

    console.log("=== VALIDATION INPUT ===");
    console.log("Security documents for validation:", dataToValidate.securityDocuments);
    console.log("Financial details for validation:", dataToValidate.financialDetails);

    const validationResult = addPassSchema.safeParse(dataToValidate);
        
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten());
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const { data: validatedData } = validationResult;

    if (originalSecurityDocs.length > 0) {
      validatedData.securityDocuments = originalSecurityDocs;
    }
    if (originalFinancialDetails.length > 0) {
      validatedData.financialDetails = originalFinancialDetails;
    }

    console.log("=== PRE-UPLOAD DEBUG ===");
    console.log("Security docs before upload:");
    originalSecurityDocs.forEach((doc, i) => {
      console.log(`  Doc ${i}:`, {
        docType: doc.docType,
        hasFile: !!doc._file,
        fileName: doc._file?.name,
        fileSize: doc._file?.size
      });
    });

    console.log("Financial details before upload:");
    originalFinancialDetails.forEach((detail, i) => {
      console.log(`  Detail ${i}:`, {
        receiptNumber: detail.receiptNumber,
        hasFile: !!detail._file,
        fileName: detail._file?.name,
        fileSize: detail._file?.size
      });
    });

    console.log("Validation passed, processing files...");
    
    // Photo upload
    const photoFile = formData.get('photo') as File | null;
    let photoAsset = null;
    if (photoFile && photoFile.size > 0) {
      console.log("Uploading photo:", photoFile.name, photoFile.size);
      if (photoFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo file size must be less than 10MB" }, { status: 400 });
      }
      
      if (!photoFile.type.startsWith('image/')) {
        return NextResponse.json({ error: "Photo must be an image file" }, { status: 400 });
      }
      
      try {
        photoAsset = await writeClient.assets.upload('image', photoFile, { 
          filename: `photo_${Date.now()}_${photoFile.name}`,
        });
        console.log("Photo uploaded successfully:", photoAsset._id);
      } catch (error) {
        console.error("Photo upload failed:", error);
        return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
      }
    }
    
    // Security Documents Upload
    console.log("=== SECURITY DOCUMENTS UPLOAD ===");
    const uploadedSecurityDocuments: Array<{
      _key: string;
      _type: string;
      docType: string;
      issueDate?: string;
      document?: { _type: string; asset: { _type: string; _ref: string } };
    }> = [];
    
    if (originalSecurityDocs && originalSecurityDocs.length > 0) {
      console.log(`Processing ${originalSecurityDocs.length} security documents`);
      
      for (let i = 0; i < originalSecurityDocs.length; i++) {
        const doc = originalSecurityDocs[i];
        console.log(`Processing security doc ${i}:`, doc);
        
        const file = doc._file;
        const docWithoutFile = { ...doc };
        delete docWithoutFile._file;

        if (file instanceof File && file.size > 0) {
          console.log(`Uploading security file ${i}:`, file.name, file.size, file.type);
          
          try {
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`Security document ${i + 1} file size must be less than 10MB`);
            }
            
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
              throw new Error(`Security document ${i + 1} must be an image or PDF file`);
            }

            const asset = await writeClient.assets.upload('file', file, { 
              filename: `security_${doc.docType || 'unknown'}_${Date.now()}_${file.name}`,
            });
            
            console.log(`Security document ${i} uploaded:`, asset._id);
            
            uploadedSecurityDocuments.push({
              _key: `security_${Date.now()}_${i}`,
              _type: 'object',
              ...docWithoutFile,
              document: {
                _type: 'file', 
                asset: { _type: 'reference', _ref: asset._id }
              }
            });
          } catch (uploadError) {
            console.error(`Security document ${i} upload failed:`, uploadError);
            throw new Error(`Failed to upload security document ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        } else if (Object.keys(docWithoutFile).length > 1) {
          console.log(`Security doc ${i} without file:`, docWithoutFile);
          uploadedSecurityDocuments.push({
            _key: `security_${Date.now()}_${i}`,
            _type: 'object',
            ...docWithoutFile
          });
        }
      }
    }

    // Financial Details Upload
    console.log("=== FINANCIAL DETAILS UPLOAD ===");
    const uploadedFinancialDetails: Array<{
      _key: string;
      _type: string;
      receiptNumber: string;
      totalAmount: string;
      dateOfPayment: string;
      bank: string;
      otherBankName?: string;
      paymentMethod: string;
      chequeNumber?: string;
      isMultipleEmployees?: boolean;
      employeeCount?: number;
      amountPerEmployee?: string;
      remarks?: string;
      receiptImage?: { _type: string; asset: { _type: string; _ref: string } };
    }> = [];
    
    if (originalFinancialDetails && originalFinancialDetails.length > 0) {
      console.log(`Processing ${originalFinancialDetails.length} financial details`);
      
      for (let i = 0; i < originalFinancialDetails.length; i++) {
        const detail = originalFinancialDetails[i];
        console.log(`Processing financial detail ${i}:`, detail);
        
        const file = detail._file;
        const detailWithoutFile = { ...detail };
        delete detailWithoutFile._file;

        if (file instanceof File && file.size > 0) {
          console.log(`Uploading receipt file ${i}:`, file.name, file.size, file.type);
          
          try {
            if (file.size > 10 * 1024 * 1024) {
              throw new Error(`Receipt ${i + 1} file size must be less than 10MB`);
            }
            
            if (!file.type.startsWith('image/')) {
              throw new Error(`Receipt ${i + 1} must be an image file`);
            }

            const asset = await writeClient.assets.upload('image', file, { 
              filename: `receipt_${detail.receiptNumber || 'unknown'}_${Date.now()}_${file.name}`,
            });
            
            console.log(`Receipt ${i} uploaded:`, asset._id);
            
            uploadedFinancialDetails.push({
              _key: `financial_${Date.now()}_${i}`,
              _type: 'object',
              ...detailWithoutFile,
              receiptImage: {
                _type: 'image', 
                asset: { _type: 'reference', _ref: asset._id }
              }
            });
          } catch (uploadError) {
            console.error(`Receipt ${i} upload failed:`, uploadError);
            throw new Error(`Failed to upload receipt ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        } else if (Object.keys(detailWithoutFile).length > 1) {
          console.log(`Financial detail ${i} without file:`, detailWithoutFile);
          uploadedFinancialDetails.push({
            _key: `financial_${Date.now()}_${i}`,
            _type: 'object',
            ...detailWithoutFile
          });
        }
      }
    }

    console.log("=== UPLOAD RESULTS ===");
    console.log("Security documents uploaded:", uploadedSecurityDocuments.length);
    console.log("Financial details uploaded:", uploadedFinancialDetails.length);

    // Date overlap validation
    const existingPasses = await writeClient.fetch<EmployeePass[]>(
      `*[_type == "employeePass" && idNumber == $idNumber]`,
      { idNumber: validatedData.idNumber }
    );

    const newEntryDate = new Date(validatedData.dateOfEntry);
    const newExpiryDate = new Date(validatedData.dateOfExpiry);
    const hasOverlap = existingPasses.some(pass => {
      if (!pass.dateOfEntry || !pass.dateOfExpiry) return false;
      const existingEntryDate = new Date(pass.dateOfEntry);
      const existingExpiryDate = new Date(pass.dateOfExpiry);
      return newEntryDate <= existingExpiryDate && newExpiryDate >= existingEntryDate;
    });

    if (hasOverlap) {
      return NextResponse.json({ 
        error: "A pass for this ID Number already exists for an overlapping time period." 
      }, { status: 400 });
    }

    // Pass ID generation
    const passYear = new Date(validatedData.dateOfEntry).getFullYear().toString();
    const newPassId = await getNextPassId(validatedData.category, passYear);

    const existingPassId = await writeClient.fetch(
      `*[_type == "employeePass" && category == $category && passId == $passId && string::startsWith(dateOfEntry, $year)][0]._id`,
      { category: validatedData.category, passId: newPassId, year: passYear }
    );

    if (existingPassId) {
      return NextResponse.json({ 
        error: `A race condition occurred. Please try again.` 
      }, { status: 409 });
    }

    // Create document structure
    const passDocument: PassDocument = {
      _type: 'employeePass',
      name: validatedData.name,
      fatherName: validatedData.fatherName,
      idNumber: validatedData.idNumber,
      dateOfBirth: validatedData.dateOfBirth,
      placeOfBirth: validatedData.placeOfBirth,
      nationality: validatedData.nationality,
      mobileNumber: validatedData.mobileNumber,
      permanentAddress: validatedData.permanentAddress,
      presentAddress: validatedData.presentAddress,
      designation: validatedData.designation,
      organization: validatedData.organization,
      category: validatedData.category,
      areaAllowed: validatedData.areaAllowed,
      dateOfEntry: validatedData.dateOfEntry,
      dateOfExpiry: validatedData.dateOfExpiry,
      securityClearance: validatedData.securityClearance,
      isExempt: validatedData.isExempt,
      exemptionRemarks: validatedData.exemptionRemarks,
      passId: newPassId.toString(),
      author: { _type: 'reference', _ref: session.user.id },
    };

    // Add photo if exists
    if (photoAsset) {
      passDocument.photo = { 
        _type: 'image', 
        asset: { _type: 'reference', _ref: photoAsset._id } 
      };
    }

    // Add security documents if exist
    if (uploadedSecurityDocuments.length > 0) {
      passDocument.securityDocuments = uploadedSecurityDocuments;
      console.log("Adding security documents to pass:", uploadedSecurityDocuments.length);
    }

    // Add financial details if exist
    if (uploadedFinancialDetails.length > 0) {
      passDocument.financialDetails = uploadedFinancialDetails;
      console.log("Adding financial details to pass:", uploadedFinancialDetails.length);
    }

    console.log("=== FINAL DOCUMENT STRUCTURE ===");
    console.log(JSON.stringify(passDocument, null, 2));

    const createdDocument = await writeClient.create(passDocument);
    console.log("Document created successfully:", createdDocument._id);

    return NextResponse.json({ 
      message: "Pass created successfully.", 
      pass: createdDocument 
    }, { status: 201 });

  } catch (error) {
    console.error("=== API ERROR ===");
    console.error("Error in /api/add-pass:", error);
    
    if (typeof error === 'object' && error !== null) {
      if ('responseBody' in error) {
        console.error("Sanity response body:", (error as { responseBody: unknown }).responseBody);
      }
      if ('details' in error) {
        console.error("Error details:", (error as { details: unknown }).details);
      }
      if ('message' in error) {
        console.error("Error message:", (error as { message: unknown }).message);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}