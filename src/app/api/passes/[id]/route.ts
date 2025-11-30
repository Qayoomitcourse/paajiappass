// /app/api/passes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { serverWriteClient as client } from '@/sanity/lib/serverClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";
import { z } from 'zod';
import { getNextPassId } from '../logic';
import { EmployeePass } from '@/app/types';

interface SecurityDocInput {
  docType: string;
  issueDate?: string;
}

interface SecurityDocumentWithFile extends SecurityDocInput {
  _file?: File;
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
  securityDocuments?: SecurityDocumentWithFile[];
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

const parseFormData = (formData: FormData): ParsedFormData => {
  const data: ParsedFormData = {};
  const securityDocsMap = new Map<number, SecurityDocumentWithFile>();
  const financialDetailsMap = new Map<number, FinancialDetail>();
  
  for (const [key, value] of formData.entries()) {
    
    if (key === 'areaAllowed') {
      if (!data.areaAllowed) data.areaAllowed = [];
      data.areaAllowed.push(value as string);
    } 
    else if (key.startsWith('securityDocument_') && !key.includes('Type') && !key.includes('Date') && !key.includes('Id')) {
      const match = key.match(/securityDocument_(\d+)$/);
      if (match && value instanceof File && value.size > 0) {
        const index = parseInt(match[1]);
        if (!securityDocsMap.has(index)) {
          securityDocsMap.set(index, { docType: '' });
        }
        const existingDoc = securityDocsMap.get(index)!;
        existingDoc._file = value;
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
      }
    }
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
        } else if (field !== 'receiptImage') {
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
    else if (!key.startsWith('securityDocumentId_') && !key.startsWith('financialDetail_') && key !== 'photo') {
      if (key === 'isExempt') {
        data[key] = value === 'true';
      } else {
        data[key] = value;
      }
    }
  }
  
  data.securityDocuments = Array.from(securityDocsMap.values()).filter((doc): doc is SecurityDocumentWithFile => {
    return !!(doc && (doc._file || doc.docType));
  });
  
  data.financialDetails = Array.from(financialDetailsMap.values()).filter((detail): detail is FinancialDetail => {
    return !!(detail && (detail._file || detail.receiptNumber));
  });
  
  return data;
};

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
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "Pass ID is required" }, { status: 400 });
    }

    const formData = await req.formData();
    const dataToValidate = parseFormData(formData);
    dataToValidate.id = id;
    
    const originalSecurityDocs = dataToValidate.securityDocuments || [];
    const originalFinancialDetails = dataToValidate.financialDetails || [];

    const validationResult = updatePassSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.flatten());
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const { data: validatedData } = validationResult;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...dataToPatch } = validatedData;
  
    if (originalSecurityDocs.length > 0) {
      validatedData.securityDocuments = originalSecurityDocs;
    }
    if (originalFinancialDetails.length > 0) {
      validatedData.financialDetails = originalFinancialDetails;
    }

    const existingPass = await client.fetch<ExistingPass | null>(
      `*[_type == "employeePass" && _id == $id][0]{category, idNumber, cnic, dateOfEntry, dateOfExpiry}`, 
      { id }
    );
    
    if (!existingPass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const existingIdNumber = getActualIdNumber(existingPass);
    const newIdNumber = validatedData.idNumber;

    if (existingIdNumber !== newIdNumber) {
      const newEntryDate = new Date(validatedData.dateOfEntry);
      const newExpiryDate = new Date(validatedData.dateOfExpiry);
      
      const conflictingPasses = await client.fetch<EmployeePass[]>(
        `*[_type == "employeePass" && (idNumber == $idNumber || cnic == $idNumber) && _id != $id]`,
        { idNumber: newIdNumber, id }
      );

      const hasOverlap = conflictingPasses.some(pass => {
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
    }

    const photoFile = formData.get('photo') as File | null;
    let photoAsset: AssetReference | null = null;
    if (photoFile && photoFile.size > 0) {
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
      } catch (error) {
        console.error("Photo upload failed:", error);
        return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
      }
    }

    const uploadedSecurityDocuments: Array<Record<string, unknown>> = [];
    
    if (originalSecurityDocs && originalSecurityDocs.length > 0) {
      for (let i = 0; i < originalSecurityDocs.length; i++) {
        const doc = originalSecurityDocs[i];
        const file = doc._file;
        const docWithoutFile = { ...doc };
        delete docWithoutFile._file;

        if (file instanceof File && file.size > 0) {
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
            throw new Error(`Failed to upload security document ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        } else if (Object.keys(docWithoutFile).length > 1) {
          uploadedSecurityDocuments.push({
            _key: `security_${Date.now()}_${i}`,
            _type: 'object',
            ...docWithoutFile
          });
        }
      }
    }

    const uploadedFinancialDetails: Array<Record<string, unknown>> = [];
    
    if (originalFinancialDetails && originalFinancialDetails.length > 0) {
      for (let i = 0; i < originalFinancialDetails.length; i++) {
        const detail = originalFinancialDetails[i];
        const file = detail._file;
        const detailWithoutFile = { ...detail };
        delete detailWithoutFile._file;

        if (file instanceof File && file.size > 0) {
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
            throw new Error(`Failed to upload receipt ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        } else if (Object.keys(detailWithoutFile).length > 1) {
          uploadedFinancialDetails.push({
            _key: `financial_${Date.now()}_${i}`,
            _type: 'object',
            ...detailWithoutFile
          });
        }
      }
    }

    const patchPayload: Record<string, unknown> = { ...dataToPatch };
    
    if (existingPass.category !== validatedData.category) {
      const passYear = new Date(validatedData.dateOfEntry).getFullYear().toString();
      const newPassId = await getNextPassId(validatedData.category, passYear);
      patchPayload.passId = newPassId.toString();
    }

    if (photoAsset) {
      patchPayload.photo = { 
        _type: 'image', 
        asset: { _type: 'reference', _ref: photoAsset._id } 
      };
    }

    patchPayload.securityDocuments = uploadedSecurityDocuments;
    patchPayload.financialDetails = uploadedFinancialDetails;

    const updatedPass = await client.patch(id).set(patchPayload).commit({ autoGenerateArrayKeys: true });

    return NextResponse.json({ 
      message: 'Pass updated successfully', 
      pass: updatedPass 
    }, { status: 200 });

  } catch (error) {
    console.error("=== UPDATE API ERROR ===", error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to update pass', 
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let { id } = await params;
  id = id.trim();
  
  console.log("=== DELETE API ROUTE START ===");
  console.log("Pass ID:", id);
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid pass ID" }, { status: 400 });
    }

    const existingPass = await client.fetch<PassForDeletion | null>(
      `*[_type == "employeePass" && _id == $id][0]{
        _id, name, passId,
        photo{asset->{_id}},
        securityDocuments[]{document{asset->{_id}}},
        financialDetails[]{receiptImage{asset->{_id}}}
      }`,
      { id }
    );

    if (!existingPass) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    console.log("Deleting pass:", existingPass.name);

    const referencingDocs = await client.fetch<Array<{ 
      _id: string; 
      _type: string;
      approvedPassRefs?: Array<{ _ref: string; _key: string }>;
    }>>(
      `*[_type == "pendingPass" && references($id)]{ _id, _type, approvedPassRefs }`,
      { id }
    );

    console.log(`Found ${referencingDocs.length} referencing pendingPass documents`);

    for (const doc of referencingDocs) {
      if (doc.approvedPassRefs) {
        const updatedRefs = doc.approvedPassRefs.filter(ref => ref._ref !== id);
        
        console.log(`Removing reference from ${doc._id}: ${doc.approvedPassRefs.length} -> ${updatedRefs.length} refs`);
        
        await client
          .patch(doc._id)
          .set({ approvedPassRefs: updatedRefs })
          .commit();
        
        console.log(`Successfully removed reference from ${doc._id}`);
      }
    }

    const assetIds: string[] = [];
    if (existingPass.photo?.asset?._id) assetIds.push(existingPass.photo.asset._id);
    existingPass.securityDocuments?.forEach(doc => {
      if (doc.document?.asset?._id) assetIds.push(doc.document.asset._id);
    });
    existingPass.financialDetails?.forEach(detail => {
      if (detail.receiptImage?.asset?._id) assetIds.push(detail.receiptImage.asset._id);
    });

    await client.delete(id);
    console.log("Pass deleted successfully");

    if (assetIds.length > 0) {
      const results = await Promise.allSettled(
        assetIds.map(aid => client.delete(aid))
      );
      const success = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Assets: ${success}/${assetIds.length} deleted`);
    }

    return NextResponse.json({ 
      message: "Pass deleted successfully",
      deletedPassId: existingPass.passId,
      deletedPassName: existingPass.name,
      removedReferences: referencingDocs.length,
      deletedAssets: assetIds.length,
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 200 });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({ 
      error: "Failed to delete pass",
      details: errorMessage,
      executionTime: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}
