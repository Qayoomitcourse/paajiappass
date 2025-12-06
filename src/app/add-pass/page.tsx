// /src/app/add-pass/page.tsx
"use client";

import { useState, ChangeEvent, FormEvent, useEffect, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { PassCategory } from '@/app/types';
import { useSession } from 'next-auth/react';
import { client } from '@/sanity/lib/client';
import { urlFor } from '@/sanity/lib/image';

export default function AddPassPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading Form...</div>}>
      <AddPassPage />
    </Suspense>
  );
}

interface PassFormData {
  name: string;
  fatherName: string;
  idNumber: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  mobileNumber: string;
  permanentAddress: string;
  presentAddress: string;
  designation: string;
  organization: string;
  category: PassCategory;
  areaAllowed: string[];
  dateOfEntry: string;
  dateOfExpiry: string;
  securityClearance: string;
}

// Interface for the data coming from Sanity
interface FetchedPassData extends Partial<PassFormData> {
  _id: string;
  photo?: { asset: { _ref: string } };
  securityDocuments?: unknown[]; // Changed from any[] to unknown[]
  financialDetails?: unknown[];  // Changed from any[] to unknown[]
  isExempt?: boolean;
  exemptionRemarks?: string;
}

interface SecurityDocument {
  file: File | null;
  preview: string | null;
  docType: 'special_branch' | 'local_police';
  certificateNumber: string;
  id: string;
  issueDate?: string;
  
  // Lookup States
  isChecking: boolean;
  useExisting: boolean;
  existingDocId?: string;
  foundMessage?: string;
}

interface FinancialDetails {
  receiptNumber: string;
  totalAmount: string;
  dateOfPayment: string;
  bank: 'HBL' | 'NBP' | 'OTHER';
  otherBankName?: string;
  paymentMethod: 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'BANK_DRAFT';
  chequeNumber?: string;
  isMultipleEmployees: boolean;
  employeeCount?: number;
  amountPerEmployee?: string;
  remarks?: string;
  receiptImage?: File | null;
  receiptPreview?: string | null;
  id: string;

  // Lookup States
  isChecking: boolean;
  useExisting: boolean;
  existingDocId?: string;
  foundMessage?: string;
}

interface AutoFillStatus {
  isLoading: boolean;
  hasData: boolean;
  message: string;
}

function AddPassPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [formData, setFormData] = useState<PassFormData>({
    name: '', fatherName: '', idNumber: '', dateOfBirth: '', placeOfBirth: '',
    nationality: 'Pakistani', mobileNumber: '', permanentAddress: '', presentAddress: '',
    designation: '', organization: '', category: 'cargo', areaAllowed: [],
    dateOfEntry: '', dateOfExpiry: '', securityClearance: 'na',
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [securityDocuments, setSecurityDocuments] = useState<SecurityDocument[]>([]);
  const [financialDetails, setFinancialDetails] = useState<FinancialDetails[]>([]);
  
  const [isExempt, setIsExempt] = useState(false);
  const [exemptionRemarks, setExemptionRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState<AutoFillStatus>({
    isLoading: false, hasData: false, message: ''
  });
  
  // Timeout refs for debouncing lookups
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const securityCheckTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const financialCheckTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});

  const resetFormFields = useCallback((idToKeep: string = '', forceReset: boolean = false) => {
    if (!forceReset && submitAttempted && error) return;

    setFormData({
      name: '', fatherName: '', idNumber: idToKeep, dateOfBirth: '', placeOfBirth: '',
      nationality: 'Pakistani', mobileNumber: '', permanentAddress: '', presentAddress: '',
      designation: '', organization: '', category: 'cargo', areaAllowed: [],
      dateOfEntry: '', dateOfExpiry: '', securityClearance: 'na',
    });
    setPhoto(null);
    setPhotoPreview(null);
    setSecurityDocuments([]);
    setFinancialDetails([]);
    setIsExempt(false);
    setExemptionRemarks('');
    setSelectedYear('');
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });
    setSubmitAttempted(false);
  }, [submitAttempted, error]);

  // --- 1. Security Document Check Logic ---
  const checkSecurityDocument = async (id: string, certNumber: string, docType: string) => {
    if (!certNumber || certNumber.length < 3) return;

    // Set loading state
    setSecurityDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, isChecking: true, foundMessage: undefined } : doc
    ));

    try {
      // API call to check if document exists
      const response = await fetch(`/api/check-document?type=security&subtype=${docType}&number=${encodeURIComponent(certNumber)}`);
      const data = await response.json();

      setSecurityDocuments(prev => prev.map(doc => {
        if (doc.id !== id) return doc;
        
        if (data.found && data.document) {
          return {
            ...doc,
            isChecking: false,
            useExisting: true,
            existingDocId: data.document._id,
            preview: data.document.imageUrl || null,
            issueDate: data.document.date || doc.issueDate,
            foundMessage: 'Reference found! Linked to existing certificate.'
          };
        } else {
          return {
            ...doc,
            isChecking: false,
            useExisting: false,
            existingDocId: undefined,
            preview: doc.useExisting ? null : doc.preview,
            foundMessage: undefined
          };
        }
      }));
    } catch (err) {
      console.error("Error checking security doc", err);
      setSecurityDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, isChecking: false } : doc));
    }
  };

  const handleSecurityNumberChange = (id: string, value: string) => {
    setSecurityDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, certificateNumber: value } : doc
    ));

    if (securityCheckTimeoutRef.current[id]) clearTimeout(securityCheckTimeoutRef.current[id]);
    
    securityCheckTimeoutRef.current[id] = setTimeout(() => {
      const doc = securityDocuments.find(d => d.id === id);
      if (doc) checkSecurityDocument(id, value, doc.docType);
    }, 800);
  };

  // --- 2. Financial Receipt Check Logic ---
  const checkFinancialDocument = async (id: string, receiptNo: string) => {
    if (!receiptNo || receiptNo.length < 2) return;

    setFinancialDetails(prev => prev.map(det => 
      det.id === id ? { ...det, isChecking: true, foundMessage: undefined } : det
    ));

    try {
      const response = await fetch(`/api/check-document?type=payment&number=${encodeURIComponent(receiptNo)}`);
      const data = await response.json();

      setFinancialDetails(prev => prev.map(det => {
        if (det.id !== id) return det;

        if (data.found && data.document) {
          return {
            ...det,
            isChecking: false,
            useExisting: true,
            existingDocId: data.document._id,
            receiptPreview: data.document.imageUrl || null,
            totalAmount: data.document.totalAmount || det.totalAmount,
            dateOfPayment: data.document.date || det.dateOfPayment,
            bank: data.document.bank || det.bank,
            isMultipleEmployees: true,
            foundMessage: 'Receipt found! Details and image auto-filled.'
          };
        } else {
          return {
            ...det,
            isChecking: false,
            useExisting: false,
            existingDocId: undefined,
            receiptPreview: det.useExisting ? null : det.receiptPreview,
            foundMessage: undefined
          };
        }
      }));
    } catch (err) {
      console.error("Error checking receipt", err);
      setFinancialDetails(prev => prev.map(det => det.id === id ? { ...det, isChecking: false } : det));
    }
  };

  // Used by the input field to debounce the check
  const handleReceiptNumberChange = (id: string, value: string) => {
    // 1. Update text immediately
    setFinancialDetails(prev => prev.map(det => 
      det.id === id ? { ...det, receiptNumber: value } : det
    ));

    // 2. Debounce API check
    if (financialCheckTimeoutRef.current[id]) clearTimeout(financialCheckTimeoutRef.current[id]);

    financialCheckTimeoutRef.current[id] = setTimeout(() => {
      checkFinancialDocument(id, value);
    }, 800);
  };

  // --- Standard Form Logic (Fetch ID, Edit Mode, etc) ---

  const fetchPassByIdNumber = useCallback(async (idNumber: string) => {
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });
    if (idNumber.length < 8) { resetFormFields(idNumber); return; }

    setAutoFillStatus({ isLoading: true, hasData: false, message: 'Searching...' });
    setError(null);

    try {
      const response = await fetch(`/api/find-pass-by-id?idNumber=${encodeURIComponent(idNumber)}`);
      const result = await response.json();

      if (response.ok && result.pass) {
        const { pass } = result;
        setFormData(prev => ({
          ...prev,
          name: pass.name || '',
          fatherName: pass.fatherName || '',
          idNumber: pass.idNumber || idNumber,
          dateOfBirth: pass.dateOfBirth ? pass.dateOfBirth.split('T')[0] : '',
          placeOfBirth: pass.placeOfBirth || '',
          nationality: pass.nationality || 'Pakistani',
          mobileNumber: pass.mobileNumber || '',
          permanentAddress: pass.permanentAddress || '',
          presentAddress: pass.presentAddress || '',
          designation: pass.designation || '',
          organization: pass.organization || '',
          securityClearance: pass.securityClearance || 'na',
          dateOfEntry: '',
          dateOfExpiry: '',
          areaAllowed: [],
        }));

        if (pass.photo?.asset) {
          setPhotoPreview(urlFor(pass.photo).url());
        }

        setAutoFillStatus({ isLoading: false, hasData: true, message: `Found previous pass: ${pass.passId}` });
      } else {
        resetFormFields(idNumber);
        setAutoFillStatus({ isLoading: false, hasData: false, message: 'No existing data found.' });
      }
    } catch (error) {
      console.error(error);
      resetFormFields(idNumber);
    }
  }, [resetFormFields]);

  const debouncedIdCheck = useCallback((idNumber: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchPassByIdNumber(idNumber), 500);
  }, [fetchPassByIdNumber]);

  // Load Edit Data
  useEffect(() => {
    if (isEditMode && editId) {
      setIsLoading(true);
      const fetchPassData = async () => {
        try {
          const pass = await client.fetch<FetchedPassData>(`*[_type == "employeePass" && _id == $id][0]`, { id: editId });
          
          if (pass) {
            setFormData({
              name: pass.name || '',
              fatherName: pass.fatherName || '',
              idNumber: pass.idNumber || '',
              dateOfBirth: pass.dateOfBirth || '',
              placeOfBirth: pass.placeOfBirth || '',
              nationality: pass.nationality || 'Pakistani',
              mobileNumber: pass.mobileNumber || '',
              permanentAddress: pass.permanentAddress || '',
              presentAddress: pass.presentAddress || '',
              designation: pass.designation || '',
              organization: pass.organization || '',
              category: pass.category || 'cargo',
              areaAllowed: pass.areaAllowed || [],
              dateOfEntry: pass.dateOfEntry || '',
              dateOfExpiry: pass.dateOfExpiry || '',
              securityClearance: pass.securityClearance || 'na',
            });

            if (pass.photo) {
              setPhotoPreview(urlFor(pass.photo).url());
            }

            if (pass.isExempt) {
              setIsExempt(true);
              setExemptionRemarks(pass.exemptionRemarks || '');
            }
          }
        } catch (err) {
          console.error(err);
          setError("Failed to fetch pass data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPassData();
    }
  }, [isEditMode, editId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'idNumber' && !isEditMode && value.trim()) debouncedIdCheck(value.trim());
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelectedYear(year);
    if (year) {
      setFormData(prev => ({ ...prev, dateOfEntry: `${year}-01-01`, dateOfExpiry: `${year}-12-31` }));
    } else {
      setFormData(prev => ({ ...prev, dateOfEntry: '', dateOfExpiry: '' }));
    }
  };

  const handleAreaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentAreas = prev.areaAllowed;
      return checked ? { ...prev, areaAllowed: [...currentAreas, value] } : { ...prev, areaAllowed: currentAreas.filter(area => area !== value) };
    });
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
    } else {
      setError('Invalid file type.');
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  // --- Security UI Helper Functions ---
  const addSecurityDocument = () => {
    if (formData.securityClearance === 'na') return setError('Select security clearance type first.');
    setSecurityDocuments(prev => [...prev, {
      file: null, preview: null,
      docType: formData.securityClearance as 'special_branch' | 'local_police',
      certificateNumber: '',
      id: Date.now().toString(),
      isChecking: false, useExisting: false,
    }]);
  };

  const handleSecurityDocumentUpload = (id: string, file: File) => {
    if (!file.type.startsWith('image/')) return setError('Images only.');
    setSecurityDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, file, preview: URL.createObjectURL(file), useExisting: false, existingDocId: undefined } : doc));
  };

  // --- Financial UI Helper Functions ---
  const addFinancialDetail = () => {
    setFinancialDetails(prev => [...prev, {
      receiptNumber: '', totalAmount: '', dateOfPayment: '', bank: 'HBL',
      paymentMethod: 'CASH', isMultipleEmployees: false, employeeCount: 1,
      id: Date.now().toString(),
      isChecking: false, useExisting: false,
    }]);
  };

  const handleFinancialDetailChange = (id: string, field: keyof FinancialDetails, value: string | number | boolean | File | null) => {
    setFinancialDetails(prev => prev.map(detail => {
      if (detail.id === id) {
        if (field === 'receiptImage' && value instanceof File) {
          return { ...detail, receiptImage: value, receiptPreview: URL.createObjectURL(value) };
        }
        return { ...detail, [field]: value };
      }
      return detail;
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (formData.areaAllowed.length === 0) return setError("Select at least one area.");
    if (formData.securityClearance !== 'na' && securityDocuments.length === 0) return setError("Upload security docs.");

    // Validate
    for (const doc of securityDocuments) {
       if (!doc.certificateNumber) return setError("Enter Certificate Number for all security docs.");
       if (!doc.useExisting && !doc.file && !doc.preview) return setError("Upload image for all security docs.");
    }
    if (!isExempt) {
      if (financialDetails.length === 0) return setError("Add financial details.");
      for (const detail of financialDetails) {
        if (!detail.receiptNumber) return setError("Enter Receipt Number.");
        if (!detail.useExisting && !detail.receiptImage && !detail.receiptPreview) return setError("Upload receipt image.");
      }
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const submissionFormData = new FormData();
    // Append standard fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'areaAllowed') (value as string[]).forEach(area => submissionFormData.append('areaAllowed', area));
      else submissionFormData.append(key, value as string);
    });
    if (photo) submissionFormData.append('photo', photo);

    // Append Security
    securityDocuments.forEach((doc, index) => {
      submissionFormData.append(`securityDocumentType_${index}`, doc.docType);
      submissionFormData.append(`securityDocumentDate_${index}`, doc.issueDate || '');
      submissionFormData.append(`securityDocumentId_${index}`, doc.id);
      submissionFormData.append(`securityDocumentNumber_${index}`, doc.certificateNumber);
      
      if (doc.useExisting && doc.existingDocId) {
        submissionFormData.append(`securityDocumentRefId_${index}`, doc.existingDocId);
      } else if (doc.file) {
        submissionFormData.append(`securityDocument_${index}`, doc.file);
      }
    });

    // Append Financial
    if (!isExempt) {
      financialDetails.forEach((detail, index) => {
        submissionFormData.append(`financialDetail_${index}_receiptNumber`, detail.receiptNumber);
        submissionFormData.append(`financialDetail_${index}_totalAmount`, detail.totalAmount);
        submissionFormData.append(`financialDetail_${index}_dateOfPayment`, detail.dateOfPayment);
        submissionFormData.append(`financialDetail_${index}_bank`, detail.bank);
        submissionFormData.append(`financialDetail_${index}_paymentMethod`, detail.paymentMethod);
        submissionFormData.append(`financialDetail_${index}_isMultipleEmployees`, detail.isMultipleEmployees.toString());
        submissionFormData.append(`financialDetail_${index}_id`, detail.id);
        if (detail.employeeCount) submissionFormData.append(`financialDetail_${index}_employeeCount`, detail.employeeCount.toString());
        if (detail.amountPerEmployee) submissionFormData.append(`financialDetail_${index}_amountPerEmployee`, detail.amountPerEmployee);

        if (detail.useExisting && detail.existingDocId) {
             submissionFormData.append(`financialDetailRefId_${index}`, detail.existingDocId);
        } else if (detail.receiptImage) {
             submissionFormData.append(`financialDetail_${index}_receiptImage`, detail.receiptImage);
        }
      });
    }

    submissionFormData.append('isExempt', isExempt.toString());
    if (exemptionRemarks) submissionFormData.append('exemptionRemarks', exemptionRemarks);
    if (isEditMode) submissionFormData.append('id', editId as string);

    try {
      const response = await fetch(isEditMode ? '/api/update-pass' : '/api/add-pass', {
        method: isEditMode ? 'PATCH' : 'POST',
        body: submissionFormData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccessMessage("Success! Pass Created.");
      if(!isEditMode) { (e.target as HTMLFormElement).reset(); resetFormFields('', true); }
      else setTimeout(() => router.push('/database'), 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error submitting form.");
    } finally {
      setIsLoading(false);
    }
  };

  const availableAreas = ["Import", "Export", "Dom", "JTC Office Block", "JTC Concourse Halls", "JTC Car Parking Only"];
  const currentYear = new Date().getFullYear();

  if (status === 'loading') return <div className="text-center py-10">Loading...</div>;
  if (!session) return <div className="text-center py-10">Access Denied.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">{isEditMode ? 'Edit Employee Pass' : 'Add New Employee Pass'}</h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded break-words">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Personal Details */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Passport / CNIC <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} required className="mt-1 block w-full input-style pr-10" />
                {autoFillStatus.isLoading && <div className="absolute right-3 top-2 spinner" />}
              </div>
              {autoFillStatus.message && <p className="text-xs mt-1 text-green-600">{autoFillStatus.message}</p>}
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Father Name</label><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Date of Birth</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Place of Birth</label><input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Nationality</label><input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
          </div>
        </section>

        {/* Contact Address */}
        <section className="space-y-4 p-4 border rounded-md">
            <div><label className="block text-sm font-medium text-gray-700">Mobile</label><input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Present Address</label><textarea name="presentAddress" value={formData.presentAddress} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Permanent Address</label><textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} className="mt-1 block w-full input-style" /></div>
        </section>

        {/* Employment */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Employment & Pass Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700">Designation <span className="text-red-500">*</span></label><input type="text" name="designation" value={formData.designation} onChange={handleInputChange} required className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Organization <span className="text-red-500">*</span></label><input type="text" name="organization" value={formData.organization} onChange={handleInputChange} required className="mt-1 block w-full input-style" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} className="mt-1 block w-full input-style"><option value="cargo">Cargo</option><option value="landside">Landside</option></select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Pass Year</label>
              <select value={selectedYear} onChange={handleYearChange} disabled={isEditMode} className="mt-1 block w-full input-style">
                <option value="">Manual Dates</option>
                {Array.from({length: 5}, (_, i) => currentYear + i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Entry</label><input type="date" name="dateOfEntry" value={formData.dateOfEntry} onChange={handleInputChange} required className="mt-1 block w-full input-style" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Expiry</label><input type="date" name="dateOfExpiry" value={formData.dateOfExpiry} onChange={handleInputChange} required className="mt-1 block w-full input-style" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Areas Allowed <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableAreas.map(area => (
                <label key={area} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={formData.areaAllowed.includes(area)} onChange={handleAreaChange} value={area} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">{area}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* --- SECURITY SECTION (Updated) --- */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Security & Documents</h2>
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Security Clearance</label>
             <div className="flex gap-4 mb-4">
                {[{v:'special_branch',l:'Special Branch'}, {v:'local_police',l:'Local Police'}, {v:'na',l:'N/A'}].map(o=>(
                   <label key={o.v} className="flex items-center"><input type="radio" name="securityClearance" value={o.v} checked={formData.securityClearance===o.v} onChange={handleInputChange} className="h-4 w-4 text-blue-600"/><span className="ml-2 text-sm">{o.l}</span></label>
                ))}
             </div>
          </div>

          {formData.securityClearance !== 'na' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Security Documents</label>
                <button type="button" onClick={addSecurityDocument} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Add Document</button>
              </div>

              {securityDocuments.map((doc, index) => (
                <div key={doc.id} className="border rounded-md p-4 mb-4 bg-gray-50 shadow-sm relative">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{doc.docType === 'special_branch' ? 'Special Branch' : 'Local Police'} #{index + 1}</h4>
                    <button type="button" onClick={() => setSecurityDocuments(prev => prev.filter(d => d.id !== doc.id))} className="text-red-600 text-sm">Remove</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1">
                         {/* Certificate Number Input with Search Logic */}
                         <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                         <div className="relative">
                            <input 
                              type="text" 
                              value={doc.certificateNumber} 
                              onChange={(e) => handleSecurityNumberChange(doc.id, e.target.value)} 
                              placeholder="Enter No. to search"
                              className="block w-full input-style" 
                            />
                            {doc.isChecking && <span className="absolute right-2 top-2 text-xs text-blue-500">Checking...</span>}
                         </div>
                         {doc.foundMessage && <p className="text-xs text-green-600 mt-1">{doc.foundMessage}</p>}
                         {!doc.useExisting && !doc.isChecking && doc.certificateNumber.length > 2 && <p className="text-xs text-gray-500 mt-1">No existing record. Please upload.</p>}

                         <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">Issue Date</label>
                         <input type="date" value={doc.issueDate || ''} onChange={(e) => setSecurityDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, issueDate: e.target.value } : d))} className="block w-full input-style" />
                    </div>

                    <div className="col-span-1">
                      {doc.useExisting ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Linked Document</label>
                          <div className="relative h-32 w-full border rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                              {doc.preview ? <Image src={doc.preview} alt="Linked Doc" fill className="object-cover" /> : <span>No Preview</span>}
                              <div className="absolute bottom-0 w-full bg-green-600 text-white text-xs text-center py-1">Linked from Database</div>
                          </div>
                        </div>
                      ) : (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Upload New Document</label>
                           <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSecurityDocumentUpload(doc.id, e.target.files[0])} className="block w-full text-sm text-gray-500" />
                           {doc.preview && <div className="mt-2 h-24 w-24 relative"><Image src={doc.preview} alt="New Upload" fill className="object-cover rounded border" /></div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- FINANCIAL SECTION (Updated) --- */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <input type="checkbox" id="isExempt" checked={isExempt} onChange={(e) => setIsExempt(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
              <label htmlFor="isExempt" className="text-sm font-medium text-gray-700">Mark as Exempt from Payment</label>
            </div>

            {isExempt ? (
              <div><label className="block text-sm font-medium text-gray-700">Remarks *</label><textarea value={exemptionRemarks} onChange={(e) => setExemptionRemarks(e.target.value)} rows={3} className="mt-1 block w-full input-style" required={isExempt} /></div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Financial Details</label>
                  <button type="button" onClick={addFinancialDetail} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">Add Payment Record</button>
                </div>

                {financialDetails.map((detail, index) => (
                  <div key={detail.id} className="border rounded-md p-4 mb-4 bg-gray-50 shadow-sm relative">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">Payment Record {index + 1}</h4>
                      <button type="button" onClick={() => setFinancialDetails(prev => prev.filter(d => d.id !== detail.id))} className="text-red-600 text-sm">Remove</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Receipt Number with Search Logic */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Receipt Number</label>
                        <div className="relative">
                            <input 
                              type="text" 
                              value={detail.receiptNumber} 
                              onChange={(e) => handleReceiptNumberChange(detail.id, e.target.value)} 
                              className="mt-1 block w-full input-style"
                              placeholder="Enter to search"
                            />
                            {detail.isChecking && <span className="absolute right-2 top-3 text-xs text-blue-500">...</span>}
                        </div>
                        {detail.foundMessage && <p className="text-xs text-green-600 mt-1">{detail.foundMessage}</p>}
                      </div>
                      
                      <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" value={detail.totalAmount} onChange={(e) => handleFinancialDetailChange(detail.id, 'totalAmount', e.target.value)} className="mt-1 block w-full input-style" /></div>
                      <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={detail.dateOfPayment} onChange={(e) => handleFinancialDetailChange(detail.id, 'dateOfPayment', e.target.value)} className="mt-1 block w-full input-style" /></div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank</label>
                        <select value={detail.bank} onChange={(e) => handleFinancialDetailChange(detail.id, 'bank', e.target.value)} className="mt-1 block w-full input-style"><option value="HBL">HBL</option><option value="NBP">NBP</option><option value="OTHER">Other</option></select>
                      </div>
                      <div className="col-span-full"><label className="flex items-center"><input type="checkbox" checked={detail.isMultipleEmployees} onChange={(e) => handleFinancialDetailChange(detail.id, 'isMultipleEmployees', e.target.checked)} className="h-4 w-4 text-blue-600 rounded" /><span className="ml-2 text-sm text-gray-700">Bulk Payment (Multiple Employees)</span></label></div>
                      {detail.isMultipleEmployees && (
                        <>
                          <div><label className="block text-sm font-medium text-gray-700">Total Employees</label><input type="number" min="1" value={detail.employeeCount || 1} onChange={(e) => handleFinancialDetailChange(detail.id, 'employeeCount', parseInt(e.target.value))} className="mt-1 block w-full input-style" /></div>
                          <div><label className="block text-sm font-medium text-gray-700">Amount Per Person</label><input type="number" value={detail.amountPerEmployee || ''} onChange={(e) => handleFinancialDetailChange(detail.id, 'amountPerEmployee', e.target.value)} className="mt-1 block w-full input-style" /></div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {detail.useExisting ? (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Linked Receipt</label>
                            <div className="relative h-40 w-40 border rounded-md overflow-hidden">
                                {detail.receiptPreview ? <Image src={detail.receiptPreview} alt="Receipt" fill className="object-cover" /> : <span>No Preview</span>}
                                <div className="absolute bottom-0 w-full bg-green-600 text-white text-xs text-center py-1">Linked Receipt</div>
                            </div>
                         </div>
                       ) : (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Receipt</label>
                            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFinancialDetailChange(detail.id, 'receiptImage', e.target.files[0])} className="mt-1 block w-full text-sm text-gray-500" />
                            {detail.receiptPreview && <div className="mt-2 h-24 w-24 relative"><Image src={detail.receiptPreview} alt="Preview" fill className="object-cover rounded border" /></div>}
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Photo</label>
            <div onClick={() => fileInputRef.current?.click()} onDrop={(e)=>{e.preventDefault(); setIsDraggingOver(false); if(e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])}} onDragOver={(e)=>{e.preventDefault(); setIsDraggingOver(true)}} onDragLeave={()=>{setIsDraggingOver(false)}} className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
              <input ref={fileInputRef} type="file" name="photo" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              {photoPreview ? <Image src={photoPreview} alt="Preview" width={150} height={150} className="rounded-md border object-cover" /> : <div className="text-center text-gray-500"><p>Click or Drag Photo</p></div>}
            </div>
          </div>
        </section>

        <button type="submit" disabled={isLoading} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
          {isLoading ? 'Submitting...' : (isEditMode ? 'Update Pass' : 'Create New Pass')}
        </button>
      </form>
      <style jsx global>{`.input-style { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); border: 1px solid #D1D5DB; border-radius: 0.375rem; width: 100%; padding: 0.5rem 0.75rem; }`}</style>
    </div>
  );
}