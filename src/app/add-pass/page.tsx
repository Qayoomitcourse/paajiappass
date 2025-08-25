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
  type: 'special_branch' | 'local_police';
  id: string;
}

interface BankChallan {
  file: File | null;
  preview: string | null;
  amount: string;
  date: string;
  description: string;
  id: string;
}

interface AutoFillStatus {
  isLoading: boolean;
  hasData: boolean;
  message: string;
}

interface SanityDocument {
  _key: string;
  type: string;
  document?: {
    asset?: {
      _id: string;
      url: string;
    };
  };
}

interface SanityChallan {
  _key: string;
  amount?: string;
  date?: string;
  description?: string;
  document?: {
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
  bankChallans?: SanityChallan[];
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
  const [bankChallans, setBankChallans] = useState<BankChallan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  // Enhanced auto-fill state
  const [autoFillStatus, setAutoFillStatus] = useState<AutoFillStatus>({
    isLoading: false,
    hasData: false,
    message: ''
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push('/');
  }, [status, router]);
  
  useEffect(() => {
    if (isEditMode && editId) {
      setIsLoading(true);
      const fetchPassData = async () => {
        try {
          const pass: SanityPass = await client.fetch(`*[_type == "employeePass" && _id == $id][0]{
            ...,
            securityDocuments[]{
              _key,
              type,
              document{
                asset->{
                  _id,
                  url
                }
              }
            },
            bankChallans[]{
              _key,
              amount,
              date,
              description,
              document{
                asset->{
                  _id,
                  url
                }
              }
            }
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
                type: doc.type as 'special_branch' | 'local_police',
                id: doc._key
              }));
              setSecurityDocuments(existingSecurityDocs);
            }
            
            // Load existing bank challans
            if (pass.bankChallans) {
              const existingChallans = pass.bankChallans.map((challan: SanityChallan) => ({
                file: null,
                preview: challan.document?.asset?.url || null,
                amount: challan.amount || '',
                date: challan.date ? challan.date.split('T')[0] : '',
                description: challan.description || '',
                id: challan._key
              }));
              setBankChallans(existingChallans);
            }
          } else { 
            setError("Pass not found."); 
          }
        } catch { 
          setError("Failed to fetch pass data."); 
        } 
        finally { 
          setIsLoading(false); 
        }
      };
      fetchPassData();
    }
  }, [isEditMode, editId]);


  const resetFormFields = useCallback((idToKeep: string = '') => {
    setFormData({
      name: '', fatherName: '', idNumber: idToKeep, dateOfBirth: '', placeOfBirth: '',
      nationality: 'Pakistani', mobileNumber: '', permanentAddress: '', presentAddress: '',
      designation: '', organization: '', category: 'cargo', areaAllowed: [],
      dateOfEntry: '', dateOfExpiry: '', securityClearance: 'na',
    });
    setPhoto(null); 
    setPhotoPreview(null); 
    setSecurityDocuments([]);
    setBankChallans([]);
    setSelectedYear('');
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });
  }, []);

  const fetchPassByIdNumber = useCallback(async (idNumber: string) => {
    // Clear previous auto-fill status
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });
    
    // Validate ID number format (basic validation)
    if (idNumber.length < 5) { 
      resetFormFields(idNumber); 
      return; 
    }

    // Enhanced validation for CNIC/Passport
    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/; // CNIC format: 12345-1234567-1
    const cnicSimplePattern = /^\d{13}$/; // Simple CNIC: 1234512345671
    const passportPattern = /^[A-Z]{2}\d{7}$/; // Passport format: AB1234567

    if (!cnicPattern.test(idNumber) && !cnicSimplePattern.test(idNumber) && !passportPattern.test(idNumber)) {
      if (idNumber.length >= 5) {
        setAutoFillStatus({
          isLoading: false,
          hasData: false,
          message: 'Invalid ID format. Use CNIC (12345-1234567-1) or Passport (AB1234567) format.'
        });
      }
      return;
    }

    setAutoFillStatus({ isLoading: true, hasData: false, message: 'Searching for existing data...' });
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
          message: 'No existing data found. Please fill in all fields manually.'
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

  const debouncedIdCheck = useCallback((value: string) => {
  // Create a static timeout variable using a ref or closure
  const timeoutId = setTimeout(() => {
    fetchPassByIdNumber(value);
  }, 800);
  
  // Clear any existing timeout
  return () => clearTimeout(timeoutId);
}, [fetchPassByIdNumber]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'idNumber' && !isEditMode) {
      // Clear error when user starts typing
      setError(null);
      debouncedIdCheck(value);
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
      type: formData.securityClearance as 'special_branch' | 'local_police',
      id: Date.now().toString()
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

  const removeSecurityDocument = (id: string) => {
    setSecurityDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Bank Challan Handlers
  const addBankChallan = () => {
    const newChallan: BankChallan = {
      file: null,
      preview: null,
      amount: '',
      date: '',
      description: '',
      id: Date.now().toString()
    };
    setBankChallans(prev => [...prev, newChallan]);
  };

  const handleChallanChange = (id: string, field: keyof BankChallan, value: string | File) => {
    setBankChallans(prev => prev.map(challan => {
      if (challan.id === id) {
        if (field === 'file' && value instanceof File) {
          if (!value.type.startsWith('image/')) {
            setError('Please upload only image files for bank challans.');
            return challan;
          }
          return { ...challan, file: value, preview: URL.createObjectURL(value) };
        } else {
          return { ...challan, [field]: value };
        }
      }
      return challan;
    }));
  };

  const removeBankChallan = (id: string) => {
    setBankChallans(prev => prev.filter(challan => challan.id !== id));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    for (const challan of bankChallans) {
      if (!challan.file && !challan.preview) {
        setError("Please upload all bank challan documents or remove empty entries.");
        return;
      }
      if (!challan.amount || !challan.date) {
        setError("Please fill in all bank challan details (amount and date).");
        return;
      }
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
    
    // Add security documents
    securityDocuments.forEach((doc, index) => {
      if (doc.file) {
        submissionFormData.append(`securityDocument_${index}`, doc.file);
        submissionFormData.append(`securityDocumentType_${index}`, doc.type);
        submissionFormData.append(`securityDocumentId_${index}`, doc.id);
      }
    });
    
    // Add bank challans
    bankChallans.forEach((challan, index) => {
      if (challan.file) {
        submissionFormData.append(`bankChallan_${index}`, challan.file);
        submissionFormData.append(`bankChallanAmount_${index}`, challan.amount);
        submissionFormData.append(`bankChallanDate_${index}`, challan.date);
        submissionFormData.append(`bankChallanDescription_${index}`, challan.description);
        submissionFormData.append(`bankChallanId_${index}`, challan.id);
      }
    });
    
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
        resetFormFields();
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
                  disabled={isEditMode}
                  placeholder="e.g., 12345-1234567-1 or AB1234567"
                />
                {autoFillStatus.isLoading && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              {autoFillStatus.message && (
                <div className={`mt-2 text-sm ${
                  autoFillStatus.hasData 
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
                      {doc.type === 'special_branch' ? 'Special Branch' : 'Local Police'} Document {index + 1}
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
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleSecurityDocumentChange(doc.id, e.target.files[0])}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    
                    {doc.preview && (
                      <div>
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

          {/* Bank Challans Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Bank Challans
              </label>
              <button
                type="button"
                onClick={addBankChallan}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Add Bank Challan
              </button>
            </div>
            
            {bankChallans.map((challan, index) => (
              <div key={challan.id} className="border rounded-md p-4 mb-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Bank Challan {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeBankChallan(challan.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={challan.amount}
                      onChange={(e) => handleChallanChange(challan.id, 'amount', e.target.value)}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={challan.date}
                      onChange={(e) => handleChallanChange(challan.id, 'date', e.target.value)}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      placeholder="Payment description"
                      value={challan.description}
                      onChange={(e) => handleChallanChange(challan.id, 'description', e.target.value)}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Challan</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleChallanChange(challan.id, 'file', e.target.files[0])}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  
                  {challan.preview && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                      <Image 
                        src={challan.preview} 
                        alt={`Bank challan ${index + 1}`}
                        width={150} 
                        height={100} 
                        className="rounded-md border object-cover" 
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {bankChallans.length === 0 && (
              <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-md">
                No bank challans added. Click &quot;Add Bank Challan&quot; to add payment records.
              </div>
            )}
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee Photo</label>
            <div 
              onClick={handleDropZoneClick} 
              onDrop={handleDrop} 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave} 
              className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors duration-200 ${
                isDraggingOver 
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