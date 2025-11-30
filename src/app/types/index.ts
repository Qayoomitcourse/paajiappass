// /app/types.ts

import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export type PassCategory = 'cargo' | 'landside';

export interface EmployeePass {
  _id: string;
  _createdAt?: string;
  passId: number;
  category: PassCategory;
  
  // Personal Details
  name: string;
  fatherName?: string;
  idNumber: string; // Replaces cnic
  cnic?: string; // Keep for backwards compatibility with old data
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  
  // Contact Details
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;

  // Employment Details
  designation: string;
  organization: string;
  
  // Pass Specifics
  areaAllowed: string[];
  dateOfEntry: string;
  dateOfExpiry: string;
  
  // Security & System
  securityClearance?: string;
  photo?: SanityImageSource;
  author?: {
    _ref?: string;
    name?: string;
  };
}

export interface Pass {
  id: string;
  name: string;
  status: 'Active' | 'Cancelled' | 'Expired';
  // Optional extended properties for full airport pass management
  employeeName?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  issueDate?: string;
  expiryDate?: string;
  passType?: 'temporary' | 'permanent' | 'visitor';
  authorizedBy?: string;
  photo?: string;
  qrCode?: string;
}

