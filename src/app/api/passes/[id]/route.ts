// /app/api/passes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { getNextPassId } from '../logic';
import { EmployeePass } from '@/app/types';

// Type definitions for better type safety
interface SecurityDocument {
  docType: string;
  issueDate?: string;
  _file?: File;
  [key: string]: unknown;
}

interface FinancialDetail {
  receiptNumber: string;
  totalAmount: string;
  dateOfPayment: string;
  bank: "HBL" | "NBP" | "OTHER";
  otherBankName?: string;
  paymentMethod: "CASH" | "CHEQUE" | "ONLINE_TRANSFER" | "BANK_DRAFT";
  chequeNumber?: string;
  isMultipleEmployees: boolean;
  employeeCount?: number;
  amountPerEmployee?: string;
  remarks?: string;
  _file?: File;
  [key: string]: unknown;
}

interface ParsedFormData {
  [key: string]: unknown;
  areaAllowed?: string[];
  securityDocuments?: SecurityDocument[];
  financialDetails?: FinancialDetail[];
  isExempt?: boolean;
}

interface ExistingPass {
  category: 'cargo' | 'landside';
  idNumber?: string;
  cnic?: string;
  dateOfEntry: string;
  dateOfExpiry: string;
}

interface AssetReference {
  _id: string;
  _type: string;
}

interface PassForDeletion {
  _id: string;
  name: string;
  passId: string;
  photo?: {
    asset?: {
      _id: string;
    };
  };
  securityDocuments?: Array<{
    document?: {
      asset?: {
        _id: string;
      };
    };
  }>;
  financialDetails?: Array<{
    receiptImage?: {
      asset?: {
        _id: string;
      };
    };
  }>;
}

// Zod Schemas - Match exactly with add-pass
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

const updatePassSchema = z.object({
  id: z.string().min(1, "Document ID is required."),
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
.refine(
  (data) => data.isExempt || (data.financialDetails && data.financialDetails.length > 0),
  { message: "Financial details are required unless exempt", path: ["financialDetails"] }
)
.refine(
  (data) => !data.isExempt || !!data.exemptionRemarks,
  { message: "Exemption remarks are required when exempt", path: ["exemptionRemarks"] }
);

// Use the exact same parseFormData function from add-pass
const parseFormData = (formData: FormData): ParsedFormData => {
  const data: ParsedFormData = {};
  const securityDocsMap = new Map<number, SecurityDocument>();
  const financialDetailsMap = new Map<number, FinancialDetail>();
  
  console.log("=== PARSING FORM DATA ===");
  
  for (const [key, value] of formData.entries()) {
    
    // Handle array fields
    if (key === 'areaAllowed') {
      if (!data.areaAllowed) data.areaAllowed = [];
      data.areaAllowed.push(value as string);
    } 
    // Security Documents Processing - SAME AS ADD-PASS
    else if (key.startsWith('securityDocument_') && !key.includes('Type') && !key.includes('Date') && !key.includes('Id')) {
      const match = key.match(/securityDocument_(\d+)$/);
      if (match && value instanceof File && value.size > 0) {
        const index = parseInt(match[1]);
        if (!securityDocsMap.has(index)) {
          securityDocsMap.set(index, { docType: '' });
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
          securityDocsMap.set(index, { docType: '' });
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
          securityDocsMap.set(index, { docType: '' });
        }
        const existingDoc = securityDocsMap.get(index)!;
        existingDoc.issueDate = value as string;
        console.log(`Security doc ${index} date:`, value);
      }
    }
    // Financial Details Processing - SAME AS ADD-PASS
    else if (key.startsWith('financialDetail_')) {
      const match = key.match(/financialDetail_(\d+)_(.+)/);
      if (match) {
        const index = parseInt(match[1]);
        const field = match[2];
        
        if (!financialDetailsMap.has(index)) {
          financialDetailsMap.set(index, {
            receiptNumber: '',
            totalAmount: '',
            dateOfPayment: '',
            bank: 'HBL' as const,
            paymentMethod: 'CASH' as const,
            isMultipleEmployees: false,
          });
        }
        const existingDetail = financialDetailsMap.get(index)!;
        
        if (field === 'receiptImage' && value instanceof File && value.size > 0) {
          existingDetail._file = value;
          console.log(`Financial detail ${index} receipt:`, value.name, value.size);
        } else if (field !== 'receiptImage') {
          // Type conversions
          if (field === 'isMultipleEmployees') {
            existingDetail.isMultipleEmployees = value === 'true';
          } else if (field === 'employeeCount') {
            existingDetail.employeeCount = parseInt(value as string);
          } else if (value !== 'undefined' && value !== '') {
            (existingDetail as Record<string, unknown>)[field] = value;
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
  
  // Convert Maps to Arrays
  data.securityDocuments = Array.from(securityDocsMap.values()).filter(doc => {
    const hasContent = doc && (doc._file || doc.docType);
    if (hasContent) {
      console.log("Security doc being added:", { 
        hasFile: !!doc._file, 
        docType: doc.docType,
        fileName: doc._file?.name 
      });
    }
    return hasContent;
  });
  
  data.financialDetails = Array.from(financialDetailsMap.values()).filter(detail => {
    const hasContent = detail && (detail._file || detail.receiptNumber);
    if (hasContent) {
      console.log("Financial detail being added:", { 
        hasFile: !!detail._file, 
        receiptNumber: detail.receiptNumber,
        fileName: detail._file?.name 
      });
    }
    return hasContent;
  });

  console.log("Final parsed security documents:", data.securityDocuments.length);
  console.log("Final parsed financial details:", data.financialDetails.length);
  
  return data;
};

// Helper function to get the actual ID number (same logic as frontend)
const getActualIdNumber = (pass: ExistingPass): string => {
  return pass.idNumber || pass.cnic || '';
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log("=== UPDATE API ROUTE START ===");
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params; // FIXED: Await params
    
    if (!id) {
      return NextResponse.json({ error: "Pass ID is required" }, { status: 400 });
    }

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
    
    // Use the same parsing logic as add-pass
    const dataToValidate = parseFormData(formData);
    
    // Add the ID from params to the data for validation
    dataToValidate.id = id;
    
    const originalSecurityDocs = dataToValidate.securityDocuments || [];
    const originalFinancialDetails = dataToValidate.financialDetails || [];

    console.log("=== VALIDATION INPUT ===");
    console.log("Security documents for validation:", dataToValidate.securityDocuments);
    console.log("Financial details for validation:", dataToValidate.financialDetails);

    const validationResult = updatePassSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten());
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const { data: validatedData } = validationResult;
    // Extract id and create dataToPatch without destructuring assignment
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...dataToPatch } = validatedData;
  
    // Restore original arrays with files
    if (originalSecurityDocs.length > 0) {
      validatedData.securityDocuments = originalSecurityDocs;
    }
    if (originalFinancialDetails.length > 0) {
      validatedData.financialDetails = originalFinancialDetails;
    }

    // FIXED: Fetch existing pass with both idNumber and cnic fields
    const existingPass = await client.fetch<ExistingPass | null>(
      `*[_type == "employeePass" && _id == $id][0]{category, idNumber, cnic, dateOfEntry, dateOfExpiry}`, 
      { id }
    );
    
    if (!existingPass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    console.log("=== EXISTING PASS DATA ===");
    const existingIdNumber = getActualIdNumber(existingPass);
    const newIdNumber = validatedData.idNumber;

    console.log("Existing ID Number:", existingIdNumber);
    console.log("New ID Number:", newIdNumber);
    console.log("ID Number changed:", existingIdNumber !== newIdNumber);

    // FIXED: Only check for ID number conflicts if the actual ID number is being changed
    if (existingIdNumber !== newIdNumber) {
      console.log("ID Number is being changed, checking for conflicts...");
      
      const newEntryDate = new Date(validatedData.dateOfEntry);
      const newExpiryDate = new Date(validatedData.dateOfExpiry);
      
      // FIXED: Check for conflicts using both idNumber and cnic fields
      const conflictingPasses = await client.fetch<EmployeePass[]>(
        `*[_type == "employeePass" && (idNumber == $idNumber || cnic == $idNumber) && _id != $id]`,
        { idNumber: newIdNumber, id }
      );

      console.log("Found conflicting passes:", conflictingPasses.length);

      const hasOverlap = conflictingPasses.some(pass => {
        if (!pass.dateOfEntry || !pass.dateOfExpiry) return false;
        const existingEntryDate = new Date(pass.dateOfEntry);
        const existingExpiryDate = new Date(pass.dateOfExpiry);
        const overlap = newEntryDate <= existingExpiryDate && newExpiryDate >= existingEntryDate;
        
        if (overlap) {
          console.log("Overlap found with pass:", pass._id, {
            existing: { entry: pass.dateOfEntry, expiry: pass.dateOfExpiry },
            new: { entry: validatedData.dateOfEntry, expiry: validatedData.dateOfExpiry }
          });
        }
        
        return overlap;
      });

      if (hasOverlap) {
        return NextResponse.json({ 
          error: "A pass for this ID Number already exists for an overlapping time period." 
        }, { status: 400 });
      }
    } else {
      console.log("ID Number unchanged, skipping conflict check");
    }

    console.log("=== PRE-UPLOAD DEBUG ===");
    console.log("Security docs before upload:");
    validatedData.securityDocuments?.forEach((doc, i) => {
      console.log(`  Doc ${i}:`, {
        docType: doc.docType,
        hasFile: !!doc._file,
        fileName: doc._file?.name,
        fileSize: doc._file?.size
      });
    });

    console.log("Financial details before upload:");
    validatedData.financialDetails?.forEach((detail, i) => {
      console.log(`  Detail ${i}:`, {
        receiptNumber: detail.receiptNumber,
        hasFile: !!detail._file,
        fileName: detail._file?.name,
        fileSize: detail._file?.size
      });
    });

    // Handle Photo Upload
    const photoFile = formData.get('photo') as File | null;
    let photoAsset: AssetReference | null = null;
    if (photoFile && photoFile.size > 0) {
      console.log("Uploading photo:", photoFile.name, photoFile.size);
      if (photoFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "Photo file size must be less than 10MB" }, { status: 400 });
      }
      
      if (!photoFile.type.startsWith('image/')) {
        return NextResponse.json({ error: "Photo must be an image file" }, { status: 400 });
      }
      
      try {
        photoAsset = await client.assets.upload('image', photoFile, { 
          filename: `photo_${Date.now()}_${photoFile.name}`,
        });
        console.log("Photo uploaded successfully:", photoAsset._id);
      } catch (error) {
        console.error("Photo upload failed:", error);
        return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
      }
    }

    // Security Documents Upload - SAME AS ADD-PASS
    console.log("=== SECURITY DOCUMENTS UPLOAD ===");
    const uploadedSecurityDocuments: Array<Record<string, unknown>> = [];
    
    if (validatedData.securityDocuments && validatedData.securityDocuments.length > 0) {
      console.log(`Processing ${validatedData.securityDocuments.length} security documents`);
      
      for (let i = 0; i < validatedData.securityDocuments.length; i++) {
        const doc = validatedData.securityDocuments[i];
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

            const asset = await client.assets.upload('file', file, { 
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

    // Financial Details Upload - SAME AS ADD-PASS
    console.log("=== FINANCIAL DETAILS UPLOAD ===");
    const uploadedFinancialDetails: Array<Record<string, unknown>> = [];
    
    if (validatedData.financialDetails && validatedData.financialDetails.length > 0) {
      console.log(`Processing ${validatedData.financialDetails.length} financial details`);
      
      for (let i = 0; i < validatedData.financialDetails.length; i++) {
        const detail = validatedData.financialDetails[i];
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

            const asset = await client.assets.upload('image', file, { 
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

    // Construct the Patch Payload
    const patchPayload: Record<string, unknown> = { ...dataToPatch };
    
    // Regenerate passId only if the category has changed
    if (existingPass.category !== validatedData.category) {
      const passYear = new Date(validatedData.dateOfEntry).getFullYear().toString();
      patchPayload.passId = await getNextPassId(validatedData.category, passYear);
      console.log("Category changed, new passId:", patchPayload.passId);
    }

    // Add photo if uploaded
    if (photoAsset) {
      patchPayload.photo = { 
        _type: 'image', 
        asset: { _type: 'reference', _ref: photoAsset._id } 
      };
    }

    // Replace the entire arrays with the new data from the form
    patchPayload.securityDocuments = uploadedSecurityDocuments;
    patchPayload.financialDetails = uploadedFinancialDetails;

    console.log("=== FINAL PATCH PAYLOAD ===");
    console.log(JSON.stringify(patchPayload, null, 2));

    const updatedPass = await client.patch(id).set(patchPayload).commit({ autoGenerateArrayKeys: true });
    console.log("Document updated successfully:", updatedPass._id);

    return NextResponse.json({ 
      message: 'Pass updated successfully', 
      pass: updatedPass 
    }, { status: 200 });

  } catch (error) {
    console.error("=== UPDATE API ERROR ===");
    console.error('Error updating pass:', error);
    
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
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update pass', 
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIXED: Added Promise type
) {
  const { id } = await params; // await the params
  console.log("id = ", id)
  console.log("=== DELETE API ROUTE START ===");
  console.log("Pass ID to delete:", id); // FIXED: Use id instead of params.id
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("Unauthorized delete attempt");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    if (!id) {
      return NextResponse.json({ error: "Pass ID is required" }, { status: 400 });
    }

    // First, check if the pass exists and get its data for cleanup
    const existingPass = await client.fetch<PassForDeletion | null>(
      `*[_type == "employeePass" && _id == $id][0]{
        _id,
        name,
        passId,
        photo,
        securityDocuments[]{
          document{
            asset->{_id}
          }
        },
        financialDetails[]{
          receiptImage{
            asset->{_id}
          }
        }
      }`,
      { id }
    );

    if (!existingPass) {
      console.log("Pass not found:", id);
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    console.log("Found pass to delete:", existingPass.name, "Pass ID:", existingPass.passId);

    // Collect all asset IDs that need to be deleted
    const assetIdsToDelete: string[] = [];

    // Add photo asset if exists
    if (existingPass.photo?.asset?._id) {
      assetIdsToDelete.push(existingPass.photo.asset._id);
    }

    // Add security document assets
    if (existingPass.securityDocuments) {
      existingPass.securityDocuments.forEach((doc) => {
        if (doc.document?.asset?._id) {
          assetIdsToDelete.push(doc.document.asset._id);
        }
      });
    }

    // Add financial detail receipt assets
    if (existingPass.financialDetails) {
      existingPass.financialDetails.forEach((detail) => {
        if (detail.receiptImage?.asset?._id) {
          assetIdsToDelete.push(detail.receiptImage.asset._id);
        }
      });
    }

    console.log("Assets to delete:", assetIdsToDelete.length);

    // Delete the pass document first
    await client.delete(id);
    console.log("Pass document deleted successfully");

    // Delete associated assets
    if (assetIdsToDelete.length > 0) {
      console.log("Deleting associated assets...");
      
      for (const assetId of assetIdsToDelete) {
        try {
          await client.delete(assetId);
          console.log(`Asset deleted: ${assetId}`);
        } catch (assetError) {
          console.warn(`Failed to delete asset ${assetId}:`, assetError);
          // Continue with other assets even if one fails
        }
      }
    }

    console.log("Delete operation completed successfully");

    return NextResponse.json({ 
      message: "Pass deleted successfully",
      deletedPassId: existingPass.passId,
      deletedAssets: assetIdsToDelete.length
    }, { status: 200 });

  } catch (error) {
    console.error("=== DELETE API ERROR ===");
    console.error("Error deleting pass:", error);
    
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
    return NextResponse.json({ 
      error: "Failed to delete pass", 
      details: errorMessage 
    }, { status: 500 });
  }
}