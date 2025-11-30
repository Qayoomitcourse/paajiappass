import { client } from '@/sanity/lib/client';

// --- FIX 1: Define a type for the organization data ---
interface PendingOrganizationData {
  organizationName: string;
  organizationHead: string;
  headDesignation: string;
  companyContact: string;
  passCategory: string;
}

// --- FIX 2: Define a type for an individual employee's data ---
interface PendingEmployee {
  // It's good practice to include any other known properties of the employee object
  // For example: name: string; designation: string;
  // Using 'unknown' is a type-safe alternative to 'any' for flexible object shapes.
  [key: string]: unknown;

  // Define the file properties that are used in the function
  photoFile: File | null;
  cnicFrontFile: File | null;
  cnicBackFile: File | null;
  companyFrontFile: File | null;
  companyBackFile: File | null;
  policeClearance: File | null;
  localPoliceVerification: File | null;
}

export async function submitPendingApplication(
  // --- Use the new interfaces instead of 'any' ---
  orgData: PendingOrganizationData,
  employees: PendingEmployee[],
  feeReceipt: File | null
) {
  try {
    // Helper to upload a single file
    const uploadFile = async (file: File | null, type: 'file' | 'image' = 'file') => {
      if (!file) return null;
      const asset = await client.assets.upload(type, file, { filename: file.name });
      return {
        _type: type,
        asset: { _type: 'reference', _ref: asset._id },
      };
    };

    // Upload organization-level docs
    const uploadedFeeReceipt = await uploadFile(feeReceipt, 'file');

    // Upload employee files
    const employeesWithAssets = await Promise.all(
      employees.map(async (emp) => {
        return {
          ...emp,
          photo: await uploadFile(emp.photoFile, 'image'),
          cnicFront: await uploadFile(emp.cnicFrontFile, 'file'),
          cnicBack: await uploadFile(emp.cnicBackFile, 'file'),
          companyCardFront: await uploadFile(emp.companyFrontFile, 'file'),
          companyCardBack: await uploadFile(emp.companyBackFile, 'file'),
          policeClearance: await uploadFile(emp.policeClearance, 'file'),
          localPoliceVerification: await uploadFile(emp.localPoliceVerification, 'file'),
        };
      })
    );

    // Save in Sanity
    const doc = {
      _type: 'pendingPass',
      status: 'pending',
      submittedBy: 'system', // Or replace with logged-in user
      submittedAt: new Date().toISOString(),
      organization: {
        organizationName: orgData.organizationName,
        organizationHead: orgData.organizationHead,
        headDesignation: orgData.headDesignation,
        companyContact: orgData.companyContact,
        passCategory: orgData.passCategory,
      },
      feeReceipt: uploadedFeeReceipt,
      employees: employeesWithAssets,
    };

    const result = await client.create(doc);
    return result;
  } catch (err) {
    console.error('❌ Error submitting to Sanity:', err);
    throw err;
  }
}