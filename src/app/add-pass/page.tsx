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

interface SecurityDocument {
  file: File | null;
  preview: string | null;
  docType: 'special_branch' | 'local_police';
  id: string;
  issueDate?: string;
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
}

interface AutoFillStatus {
  isLoading: boolean;
  hasData: boolean;
  message: string;
}

interface SanityDocument {
  _key: string;
  docType: string;
  issueDate?: string;
  document?: {
    asset?: {
      _id: string;
      url: string;
    };
  };
}

interface SanityFinancialDetail {
  _key: string;
  receiptNumber?: string;
  totalAmount?: string;
  dateOfPayment?: string;
  bank?: 'HBL' | 'NBP' | 'OTHER';
  otherBankName?: string;
  paymentMethod?: 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'BANK_DRAFT';
  chequeNumber?: string;
  isMultipleEmployees?: boolean;
  employeeCount?: number;
  amountPerEmployee?: string;
  remarks?: string;
  receiptImage?: {
    asset?: {
      _id: string;
      url: string;
    };
  };
}

interface SanityPass {
  name?: string;
  fatherName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  designation?: string;
  organization?: string;
  category?: PassCategory;
  areaAllowed?: string[];
  dateOfEntry?: string;
  dateOfExpiry?: string;
  securityClearance?: string;
  photo?: {
    asset?: {
      _id: string;
      url: string;
    };
  };
  passId?: number;
  securityDocuments?: SanityDocument[];
  financialDetails?: SanityFinancialDetail[];
  isExempt?: boolean;
  exemptionRemarks?: string;
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

  // Enhanced auto-fill state
  const [autoFillStatus, setAutoFillStatus] = useState<AutoFillStatus>({
    isLoading: false,
    hasData: false,
    message: ''
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset form fields callback
  const resetFormFields = useCallback((idToKeep: string = '', forceReset: boolean = false) => {
    // Only reset if explicitly forced (successful submission) or if not after a failed submission
    if (!forceReset && submitAttempted && error) {
      return; // Don't reset fields if there was an error after submission attempt
    }

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

  // Fetch pass by ID number
  const fetchPassByIdNumber = useCallback(async (idNumber: string) => {
    // Clear previous auto-fill status
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });

    // Simplified validation - just check minimum length
    if (idNumber.length < 8) {
      resetFormFields(idNumber);
      return;
    }

    setAutoFillStatus({ isLoading: true, hasData: false, message: 'Searching for existing data...' });
    setError(null);

    try {
      const response = await fetch(`/api/find-pass-by-id?idNumber=${encodeURIComponent(idNumber)}`);
      const result = await response.json();

      console.log('API Response:', response.status, result); // Debug log

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
          // Keep these fields empty for new pass
          dateOfEntry: '',
          dateOfExpiry: '',
          areaAllowed: [],
        }));

        if (pass.photo?.asset) {
          setPhotoPreview(urlFor(pass.photo).url());
        } else {
          setPhotoPreview(null);
        }

        setAutoFillStatus({
          isLoading: false,
          hasData: true,
          message: `Found existing data! Previous Pass ID: ${String(pass.passId || 'N/A').padStart(4, '0')}`
        });
      } else {
        resetFormFields(idNumber);
        setAutoFillStatus({
          isLoading: false,
          hasData: false,
          message: result.message || 'No existing data found. Please fill in all fields manually.'
        });
      }
    } catch (error) {
      console.error('Error fetching pass by ID:', error);
      setError("Could not fetch data for this ID.");
      resetFormFields(idNumber);
      setAutoFillStatus({
        isLoading: false,
        hasData: false,
        message: 'Error occurred while searching. Please try again.'
      });
    }
  }, [resetFormFields]);

  // Debounced ID check function
  const debouncedIdCheck = useCallback((idNumber: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout for debounced execution
    timeoutRef.current = setTimeout(() => {
      fetchPassByIdNumber(idNumber);
    }, 500); // 500ms delay - adjust as needed
  }, [fetchPassByIdNumber]);

  useEffect(() => {
    if (isEditMode && editId) {
      setIsLoading(true);
      const fetchPassData = async () => {
        try {
          const pass: SanityPass = await client.fetch(`*[_type == "employeePass" && _id == $id][0]{
            ...,
            securityDocuments[]{
              _key,
              docType,
              issueDate,
              document{
                asset->{
                  _id,
                  url
                }
              }
            },
            financialDetails[]{
              _key,
              receiptNumber,
              totalAmount,
              dateOfPayment,
              bank,
              otherBankName,
              paymentMethod,
              chequeNumber,
              isMultipleEmployees,
              employeeCount,
              amountPerEmployee,
              remarks,
              receiptImage{
                asset->{
                  _id,
                  url
                }
              }
            },
            isExempt,
            exemptionRemarks
          }`, { id: editId });

          if (pass) {
            setFormData({
              name: pass.name || '',
              fatherName: pass.fatherName || '',
              idNumber: pass.idNumber || '',
              dateOfBirth: pass.dateOfBirth ? pass.dateOfBirth.split('T')[0] : '',
              placeOfBirth: pass.placeOfBirth || '',
              nationality: pass.nationality || 'Pakistani',
              mobileNumber: pass.mobileNumber || '',
              permanentAddress: pass.permanentAddress || '',
              presentAddress: pass.presentAddress || '',
              designation: pass.designation || '',
              organization: pass.organization || '',
              category: pass.category || 'cargo',
              areaAllowed: pass.areaAllowed || [],
              dateOfEntry: pass.dateOfEntry ? pass.dateOfEntry.split('T')[0] : '',
              dateOfExpiry: pass.dateOfExpiry ? pass.dateOfExpiry.split('T')[0] : '',
              securityClearance: pass.securityClearance || 'na',
            });

            if (pass.photo) setPhotoPreview(urlFor(pass.photo).url());

            // Load existing security documents
            if (pass.securityDocuments) {
              const existingSecurityDocs = pass.securityDocuments.map((doc: SanityDocument) => ({
                file: null,
                preview: doc.document?.asset?.url || null,
                docType: doc.docType as 'special_branch' | 'local_police',
                id: doc._key,
                issueDate: doc.issueDate || ''
              }));
              setSecurityDocuments(existingSecurityDocs);
            }

            // Load existing financial details
            if (pass.financialDetails) {
              const existingFinancialDetails = pass.financialDetails.map((detail: SanityFinancialDetail) => ({
                receiptNumber: detail.receiptNumber || '',
                totalAmount: detail.totalAmount || '',
                dateOfPayment: detail.dateOfPayment ? detail.dateOfPayment.split('T')[0] : '',
                bank: (detail.bank as 'HBL' | 'NBP' | 'OTHER') || 'HBL',
                otherBankName: detail.otherBankName || '',
                paymentMethod: (detail.paymentMethod as 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'BANK_DRAFT') || 'CASH',
                chequeNumber: detail.chequeNumber || '',
                isMultipleEmployees: detail.isMultipleEmployees || false,
                employeeCount: detail.employeeCount || 1,
                amountPerEmployee: detail.amountPerEmployee || '',
                remarks: detail.remarks || '',
                receiptImage: null,
                receiptPreview: detail.receiptImage?.asset?.url || null,
                id: detail._key
              }));
              setFinancialDetails(existingFinancialDetails);
            }

            setIsExempt(pass.isExempt || false);
            setExemptionRemarks(pass.exemptionRemarks || '');
          } else {
            setError("Pass not found.");
          }
        } catch {
          setError("Failed to fetch pass data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPassData();
    }
  }, [isEditMode, editId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cleanup object URLs to prevent memory leaks
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Debugging effects (remove these after fixing)
  useEffect(() => {
    console.log('Auto-fill status changed:', autoFillStatus);
  }, [autoFillStatus]);

  useEffect(() => {
    console.log('ID Number changed:', formData.idNumber, 'isEditMode:', isEditMode);
  }, [formData.idNumber, isEditMode]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing (this helps UX)
    if (error) {
      setError(null);
      setSubmitAttempted(false); // Reset submit attempt when user makes changes
    }

    // Only trigger autofill for idNumber in non-edit mode with non-empty trimmed value
    if (name === 'idNumber' && !isEditMode && value.trim()) {
      console.log('Triggering autofill for ID:', value.trim()); // Debug log
      debouncedIdCheck(value.trim());
    }
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelectedYear(year);
    if (year) {
      setFormData(prev => ({
        ...prev,
        dateOfEntry: `${year}-01-01`,
        dateOfExpiry: `${year}-12-31`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dateOfEntry: '',
        dateOfExpiry: ''
      }));
    }
  };

  const handleAreaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentAreas = prev.areaAllowed;
      if (checked) {
        return { ...prev, areaAllowed: [...currentAreas, value] };
      } else {
        return { ...prev, areaAllowed: currentAreas.filter(area => area !== value) };
      }
    });
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError(null);
    } else {
      setError('Invalid file type. Please upload an image file.');
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  const handleDropZoneClick = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  // Security Document Handlers
  const addSecurityDocument = () => {
    if (formData.securityClearance === 'na') {
      setError('Please select a security clearance type first.');
      return;
    }

    const newDoc: SecurityDocument = {
      file: null,
      preview: null,
      docType: formData.securityClearance as 'special_branch' | 'local_police',
      id: Date.now().toString(),
      issueDate: ''
    };
    setSecurityDocuments(prev => [...prev, newDoc]);
  };

  const handleSecurityDocumentChange = (id: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload only image files for security documents.');
      return;
    }

    setSecurityDocuments(prev => prev.map(doc =>
      doc.id === id
        ? { ...doc, file, preview: URL.createObjectURL(file) }
        : doc
    ));
  };

  const handleSecurityDocumentDateChange = (id: string, date: string) => {
    setSecurityDocuments(prev => prev.map(doc =>
      doc.id === id ? { ...doc, issueDate: date } : doc
    ));
  };

  const removeSecurityDocument = (id: string) => {
    setSecurityDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Bank Challan Handlers
  const addFinancialDetail = () => {
    const newDetail: FinancialDetails = {
      receiptNumber: '',
      totalAmount: '',
      dateOfPayment: '',
      bank: 'HBL',
      otherBankName: '',
      paymentMethod: 'CASH',
      chequeNumber: '',
      isMultipleEmployees: false,
      employeeCount: 1,
      amountPerEmployee: '',
      remarks: '',
      receiptImage: null,
      receiptPreview: null,
      id: Date.now().toString()
    };
    setFinancialDetails(prev => [...prev, newDetail]);
  };

  const handleFinancialDetailChange = (id: string, field: keyof FinancialDetails, value: string | File | boolean | number) => {
    setFinancialDetails(prev => prev.map(detail => {
      if (detail.id === id) {
        if (field === 'receiptImage' && value instanceof File) {
          if (!value.type.startsWith('image/')) {
            setError('Please upload only image files for receipts.');
            return detail;
          }
          return { ...detail, receiptImage: value, receiptPreview: URL.createObjectURL(value) };
        } else {
          return { ...detail, [field]: value };
        }
      }
      return detail;
    }));
  };

  const removeFinancialDetail = (id: string) => {
    setFinancialDetails(prev => prev.filter(detail => detail.id !== id));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (formData.areaAllowed.length === 0) {
      setError("At least one area must be selected.");
      return;
    }

    // Validate security documents if clearance is not 'na'
    if (formData.securityClearance !== 'na' && securityDocuments.length === 0) {
      setError("Please upload at least one security clearance document.");
      return;
    }

    // Validate bank challans
    if (!isExempt) {
      // Validate financial details only if not exempt
      if (financialDetails.length === 0) {
        setError("Please add financial details or mark as exempt.");
        return;
      }

      for (const detail of financialDetails) {
        if (!detail.receiptImage && !detail.receiptPreview) {
          setError("Please upload all receipt documents or remove empty entries.");
          return;
        }
        if (!detail.totalAmount || !detail.dateOfPayment || !detail.receiptNumber) {
          setError("Please fill in all required financial details (receipt number, amount, and date).");
          return;
        }
        if ((detail.paymentMethod === 'CHEQUE' || detail.paymentMethod === 'BANK_DRAFT') && !detail.chequeNumber) {
          setError(`Please provide ${detail.paymentMethod === 'CHEQUE' ? 'cheque' : 'draft'} number.`);
          return;
        }
        if (detail.bank === 'OTHER' && !detail.otherBankName) {
          setError("Please specify the bank name when 'OTHER' is selected.");
          return;
        }
      }
    } else if (!exemptionRemarks.trim()) {
      setError("Please provide exemption remarks when marking as exempt.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const submissionFormData = new FormData();

    // Add basic form data
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'areaAllowed') {
        (value as string[]).forEach(area => submissionFormData.append('areaAllowed', area));
      } else {
        submissionFormData.append(key, value as string);
      }
    });

    // Add photo
    if (photo) submissionFormData.append('photo', photo);

    // Security documents with proper field mapping
    securityDocuments.forEach((doc, index) => {
      if (doc.file) {
        submissionFormData.append(`securityDocument_${index}`, doc.file);
        submissionFormData.append(`securityDocumentType_${index}`, doc.docType);
        if (doc.issueDate) {
          submissionFormData.append(`securityDocumentDate_${index}`, doc.issueDate);
        }
        submissionFormData.append(`securityDocumentId_${index}`, doc.id);
      }
    });

    // Add exemption data
    submissionFormData.append('isExempt', isExempt.toString());
    if (exemptionRemarks) submissionFormData.append('exemptionRemarks', exemptionRemarks);

    // Financial details with all required fields
    if (!isExempt) {
      financialDetails.forEach((detail, index) => {
        // Required fields
        submissionFormData.append(`financialDetail_${index}_receiptNumber`, detail.receiptNumber);
        submissionFormData.append(`financialDetail_${index}_totalAmount`, detail.totalAmount);
        submissionFormData.append(`financialDetail_${index}_dateOfPayment`, detail.dateOfPayment);
        submissionFormData.append(`financialDetail_${index}_bank`, detail.bank);
        submissionFormData.append(`financialDetail_${index}_paymentMethod`, detail.paymentMethod);
        submissionFormData.append(`financialDetail_${index}_isMultipleEmployees`, detail.isMultipleEmployees.toString());

        // Optional fields
        if (detail.otherBankName) submissionFormData.append(`financialDetail_${index}_otherBankName`, detail.otherBankName);
        if (detail.chequeNumber) submissionFormData.append(`financialDetail_${index}_chequeNumber`, detail.chequeNumber);
        if (detail.employeeCount) submissionFormData.append(`financialDetail_${index}_employeeCount`, detail.employeeCount.toString());
        if (detail.amountPerEmployee) submissionFormData.append(`financialDetail_${index}_amountPerEmployee`, detail.amountPerEmployee);
        if (detail.remarks) submissionFormData.append(`financialDetail_${index}_remarks`, detail.remarks);
        if (detail.receiptImage) submissionFormData.append(`financialDetail_${index}_receiptImage`, detail.receiptImage);
        submissionFormData.append(`financialDetail_${index}_id`, detail.id);
      });
    }

    if (isEditMode) submissionFormData.append('id', editId as string);

    try {
      const response = await fetch(isEditMode ? '/api/update-pass' : '/api/add-pass', {
        method: isEditMode ? 'PATCH' : 'POST',
        body: submissionFormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server responded with ${response.status}`);
      }

      if (isEditMode) {
        setSuccessMessage(`Pass updated successfully!`);
        setTimeout(() => router.push('/database'), 2000);
      } else {
        setSuccessMessage(`Pass for ${result.pass.name} (ID: ${result.pass.passId}) created successfully!`);
        (e.target as HTMLFormElement).reset();
        resetFormFields('', true);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const availableAreas = ["Import", "Export", "Dom", "JTC Office Block", "JTC Concourse Halls", "JTC Car Parking Only"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  if (status === 'loading') return <div className="text-center py-10"><p>Loading session...</p></div>;
  if (!session) return <div className="text-center py-10"><p>Access Denied.</p></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">
        {isEditMode ? 'Edit Employee Pass' : 'Add New Employee Pass'}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded break-words">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Details Section */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Personal Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700">
                Passport No / CNIC (Enter to Auto-Fill) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="idNumber"
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full input-style pr-10"
                  // disabled={isEditMode}
                  placeholder="e.g., 12345-1234567-1 or AB1234567"
                />
                {autoFillStatus.isLoading && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              {autoFillStatus.message && (
                <div className={`mt-2 text-sm ${autoFillStatus.hasData
                  ? 'text-green-600 bg-green-50 p-2 rounded'
                  : autoFillStatus.isLoading
                    ? 'text-blue-600'
                    : 'text-gray-600'
                  }`}>
                  {autoFillStatus.message}
                </div>
              )}
            </div>
            <div />

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">
                Father&apos;s Name
              </label>
              <input
                type="text"
                name="fatherName"
                id="fatherName"
                value={formData.fatherName}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700">
                Place of Birth
              </label>
              <input
                type="text"
                name="placeOfBirth"
                id="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                Nationality
              </label>
              <input
                type="text"
                name="nationality"
                id="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
              />
            </div>
          </div>
        </section>

        {/* Contact & Address Section */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Contact & Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <input
                type="tel"
                name="mobileNumber"
                id="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                className="mt-1 block w-full input-style"
                placeholder="+92-300-1234567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="presentAddress" className="block text-sm font-medium text-gray-700">
              Present Address
            </label>
            <textarea
              name="presentAddress"
              id="presentAddress"
              value={formData.presentAddress}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full input-style"
            />
          </div>

          <div>
            <label htmlFor="permanentAddress" className="block text-sm font-medium text-gray-700">
              Permanent Address
            </label>
            <textarea
              name="permanentAddress"
              id="permanentAddress"
              value={formData.permanentAddress}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full input-style"
            />
          </div>
        </section>

        {/* Employment & Pass Details Section */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Employment & Pass Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="designation"
                id="designation"
                value={formData.designation}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Organization <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="organization"
                id="organization"
                value={formData.organization}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Pass Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                id="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              >
                <option value="cargo">Cargo</option>
                <option value="landside">Landside</option>
              </select>
            </div>

            <div>
              <label htmlFor="passYear" className="block text-sm font-medium text-gray-700">
                Select Pass Year
              </label>
              <select
                id="passYear"
                name="passYear"
                value={selectedYear}
                onChange={handleYearChange}
                disabled={isEditMode}
                className="mt-1 block w-full input-style disabled:bg-gray-100"
              >
                <option value="">-- Manual Dates --</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dateOfEntry" className="block text-sm font-medium text-gray-700">
                Date of Entry <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfEntry"
                id="dateOfEntry"
                value={formData.dateOfEntry}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              />
            </div>

            <div>
              <label htmlFor="dateOfExpiry" className="block text-sm font-medium text-gray-700">
                Date of Expiry <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfExpiry"
                id="dateOfExpiry"
                value={formData.dateOfExpiry}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full input-style"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas Allowed <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableAreas.map(area => (
                <label
                  key={area}
                  className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="areaAllowed"
                    value={area}
                    checked={formData.areaAllowed.includes(area)}
                    onChange={handleAreaChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{area}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Documents Section */}
        <section className="space-y-4 p-4 border rounded-md">
          <h2 className="text-lg font-semibold text-gray-600 border-b pb-2">Security & Documents</h2>

          {/* Security Clearance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Security Clearance</label>
            <div className="flex gap-4 mb-4">
              {[
                { value: 'special_branch', label: 'Special Branch' },
                { value: 'local_police', label: 'Local Police' },
                { value: 'na', label: 'N/A' }
              ].map(opt => (
                <label key={opt.value} className="flex items-center">
                  <input
                    type="radio"
                    name="securityClearance"
                    value={opt.value}
                    checked={formData.securityClearance === opt.value}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Security Documents */}
          {formData.securityClearance !== 'na' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Security Clearance Documents
                </label>
                <button
                  type="button"
                  onClick={addSecurityDocument}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add Document
                </button>
              </div>

              {securityDocuments.map((doc, index) => (
                <div key={doc.id} className="border rounded-md p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">
                      {doc.docType === 'special_branch' ? 'Special Branch' : 'Local Police'} Document {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeSecurityDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={doc.issueDate || ''}
                        onChange={(e) => handleSecurityDocumentDateChange(doc.id, e.target.value)}
                        className="mb-3 block w-full input-style"
                      />

                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Document
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleSecurityDocumentChange(doc.id, e.target.files[0])}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    {doc.preview && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                        <Image
                          src={doc.preview}
                          alt={`Security document ${index + 1}`}
                          width={100}
                          height={100}
                          className="rounded-md border object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Financial Details Section */}
          <div>
            {/* Exemption Toggle */}
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="isExempt"
                checked={isExempt}
                onChange={(e) => setIsExempt(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="isExempt" className="text-sm font-medium text-gray-700">
                Mark as Exempt from Payment
              </label>
            </div>

            {isExempt ? (
              <div>
                <label htmlFor="exemptionRemarks" className="block text-sm font-medium text-gray-700">
                  Exemption Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="exemptionRemarks"
                  value={exemptionRemarks}
                  onChange={(e) => setExemptionRemarks(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full input-style"
                  placeholder="Explain why this pass is exempt from payment..."
                  required={isExempt}
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Financial Details
                  </label>
                  <button
                    type="button"
                    onClick={addFinancialDetail}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    Add Payment Record
                  </button>
                </div>

                {financialDetails.map((detail, index) => (
                  <div key={detail.id} className="border rounded-md p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">Payment Record {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeFinancialDetail(detail.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Receipt Number</label>
                        <input
                          type="text"
                          placeholder="Receipt #"
                          value={detail.receiptNumber}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'receiptNumber', e.target.value)}
                          className="mt-1 block w-full input-style"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={detail.totalAmount}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'totalAmount', e.target.value)}
                          className="mt-1 block w-full input-style"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Payment</label>
                        <input
                          type="date"
                          value={detail.dateOfPayment}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'dateOfPayment', e.target.value)}
                          className="mt-1 block w-full input-style"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank</label>
                        <select
                          value={detail.bank}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'bank', e.target.value)}
                          className="mt-1 block w-full input-style"
                        >
                          <option value="HBL">HBL</option>
                          <option value="NBP">NBP</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select
                          value={detail.paymentMethod || 'CASH'}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'paymentMethod', e.target.value)}
                          className="mt-1 block w-full input-style"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="ONLINE_TRANSFER">Online Transfer</option>
                          <option value="BANK_DRAFT">Bank Draft</option>
                        </select>
                      </div>

                      {detail.bank === 'OTHER' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Other Bank Name</label>
                          <input
                            type="text"
                            placeholder="Enter bank name"
                            value={detail.otherBankName || ''}
                            onChange={(e) => handleFinancialDetailChange(detail.id, 'otherBankName', e.target.value)}
                            className="mt-1 block w-full input-style"
                          />
                        </div>
                      )}

                      {(detail.paymentMethod === 'CHEQUE' || detail.paymentMethod === 'BANK_DRAFT') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            {detail.paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Draft Number'}
                          </label>
                          <input
                            type="text"
                            placeholder={`Enter ${detail.paymentMethod === 'CHEQUE' ? 'cheque' : 'draft'} number`}
                            value={detail.chequeNumber || ''}
                            onChange={(e) => handleFinancialDetailChange(detail.id, 'chequeNumber', e.target.value)}
                            className="mt-1 block w-full input-style"
                          />
                        </div>
                      )}

                      {/* Multiple employees section */}
                      <div className="col-span-full">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={detail.isMultipleEmployees}
                            onChange={(e) => handleFinancialDetailChange(detail.id, 'isMultipleEmployees', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Payment for multiple employees</span>
                        </label>
                      </div>

                      {detail.isMultipleEmployees && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Number of Employees</label>
                            <input
                              type="number"
                              min="1"
                              value={detail.employeeCount || 1}
                              onChange={(e) => handleFinancialDetailChange(detail.id, 'employeeCount', parseInt(e.target.value))}
                              className="mt-1 block w-full input-style"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Amount Per Employee</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={detail.amountPerEmployee || ''}
                              onChange={(e) => handleFinancialDetailChange(detail.id, 'amountPerEmployee', e.target.value)}
                              className="mt-1 block w-full input-style"
                            />
                          </div>
                        </>
                      )}

                      <div className="col-span-full">
                        <label className="block text-sm font-medium text-gray-700">Remarks</label>
                        <textarea
                          rows={2}
                          placeholder="Additional notes or remarks"
                          value={detail.remarks || ''}
                          onChange={(e) => handleFinancialDetailChange(detail.id, 'remarks', e.target.value)}
                          className="mt-1 block w-full input-style"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipt</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFinancialDetailChange(detail.id, 'receiptImage', e.target.files[0])}
                          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                      </div>

                      {detail.receiptPreview && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                          <Image
                            src={detail.receiptPreview}
                            alt={`Receipt ${index + 1}`}
                            width={150}
                            height={100}
                            className="rounded-md border object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {financialDetails.length === 0 && (
                  <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-md">
                    No payment records added. Click &quot;Add Payment Record&quot; to add financial details.                  </div>
                )}
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee&apos;s Photo</label>
            <div
              onClick={handleDropZoneClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors duration-200 ${isDraggingOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
                } ${photoPreview ? 'border-solid' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="photo"
                id="photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />

              {photoPreview ? (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    {isEditMode && !photo ? 'Current Photo:' : 'New Photo Preview:'}
                  </p>
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    width={150}
                    height={150}
                    className="rounded-md mx-auto border object-cover"
                  />
                  <p className="text-xs text-blue-600 mt-2">Click or drop to replace</p>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <p className="pl-1">
                      Drag & drop or <span className="font-medium text-blue-600">click to upload</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Submitting...' : (isEditMode ? 'Update Pass' : 'Create New Pass')}
        </button>
      </form>

      <style jsx global>{`
        .input-style {
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          border: 1px solid #D1D5DB;
          border-radius: 0.375rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
        }
        .input-style:focus {
          --tw-ring-color: #3B82F6;
          border-color: #3B82F6;
          box-shadow: 0 0 0 1px #3B82F6;
        }
        .input-style:disabled {
          background-color: #F3F4F6;
          color: #6B7280;
        }
      `}</style>
    </div>
  );
}