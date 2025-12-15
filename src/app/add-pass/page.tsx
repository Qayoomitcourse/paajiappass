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

// Updated interface to handle fetched document structure
interface FetchedDocument {
  _key: string;
  docType: 'special_branch' | 'local_police';
  certificateNumber: string;
  issueDate?: string;
  asset?: { _ref: string; _id?: string; url?: string };
  file?: { asset: { _ref: string; _id?: string; url?: string } };
  image?: { asset: { _ref: string; _id?: string; url?: string } };
  scannedImage?: { asset: { _ref: string; _id?: string; url?: string } };
}

// Updated interface to handle fetched financial structure
interface FetchedFinancialDetail {
  _key: string;
  receiptNumber: string;
  totalAmount: string;
  dateOfPayment: string;
  bank: 'HBL' | 'NBP' | 'OTHER';
  paymentMethod: 'CASH' | 'CHEQUE' | 'ONLINE_TRANSFER' | 'BANK_DRAFT';
  chequeNumber?: string;
  isMultipleEmployees?: boolean;
  employeeCount?: number;
  amountPerEmployee?: string;
  remarks?: string;
  receiptImage?: {
    asset?: { _ref: string; _id?: string; url?: string };
    _ref?: string;
  };
}

interface FetchedPassData extends Partial<PassFormData> {
  _id: string;
  photo?: { asset: { _ref: string; _id?: string; url?: string } };
  securityDocuments?: FetchedDocument[];
  financialDetails?: FetchedFinancialDetail[];
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
  const [existingPhotoRef, setExistingPhotoRef] = useState<string | null>(null);

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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const securityCheckTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const financialCheckTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

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
    setExistingPhotoRef(null);
    setSecurityDocuments([]);
    setFinancialDetails([]);
    setIsExempt(false);
    setExemptionRemarks('');
    setSelectedYear('');
    setAutoFillStatus({ isLoading: false, hasData: false, message: '' });
    setSubmitAttempted(false);
  }, [submitAttempted, error]);

  const checkSecurityDocument = async (id: string, certNumber: string, docType: string) => {
    if (!certNumber || certNumber.length < 3) return;

    // Set loading state
    setSecurityDocuments(prev => prev.map(doc =>
      doc.id === id ? { ...doc, isChecking: true, foundMessage: undefined } : doc
    ));

    try {
      const response = await fetch(`/api/check-document?type=security&subtype=${docType}&number=${encodeURIComponent(certNumber)}`);
      const data = await response.json();

      console.log(`🔍 Check Security [${certNumber}] Response:`, data);

      setSecurityDocuments(prev => prev.map(doc => {
        if (doc.id !== id) return doc;

        if (data.found && data.document) {
          // === SMART IMAGE FINDER ===
          let previewUrl = data.document.imageUrl;
          let assetRef = data.document.asset?._ref;

          if (!previewUrl) {
            const possibleAsset =
              data.document.asset ||
              data.document.file?.asset ||
              data.document.document?.asset ||
              data.document.image?.asset;

            if (possibleAsset?._ref) {
              assetRef = possibleAsset._ref;
              previewUrl = urlFor({ asset: { _ref: assetRef } }).url();
            }
          }

          const foundDate = data.document.date || data.document.issueDate || doc.issueDate;

          return {
            ...doc,
            isChecking: false,
            useExisting: true,
            existingDocId: assetRef || data.document._id,
            preview: previewUrl || null,
            issueDate: foundDate,
            foundMessage: 'Reference found! Linked to existing certificate.'
          };
        } else {
          return {
            ...doc,
            isChecking: false,
            useExisting: false,
            existingDocId: undefined,
            preview: doc.file ? doc.preview : null,
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

  const handleReceiptNumberChange = (id: string, value: string) => {
    setFinancialDetails(prev => prev.map(det =>
      det.id === id ? { ...det, receiptNumber: value } : det
    ));
    if (financialCheckTimeoutRef.current[id]) clearTimeout(financialCheckTimeoutRef.current[id]);
    financialCheckTimeoutRef.current[id] = setTimeout(() => {
      checkFinancialDocument(id, value);
    }, 800);
  };

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
          const photoUrl = pass.photo.asset.url || urlFor(pass.photo).url();
          setPhotoPreview(photoUrl);
          setExistingPhotoRef(pass.photo.asset._ref || pass.photo.asset._id);
          console.log('📸 Auto-filled photo ref:', pass.photo.asset._ref || pass.photo.asset._id);
        } else {
          setPhotoPreview(null);
          setExistingPhotoRef(null);
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

  // === UPDATED DATA FETCHING FOR EDIT MODE ===
  useEffect(() => {
    if (isEditMode && editId) {
      setIsLoading(true);
      const fetchPassData = async () => {
        try {
          // Enhanced GROQ query with all nested fields
          const pass = await client.fetch<FetchedPassData>(
            `*[_type == "employeePass" && _id == $id][0]{
              ...,
              photo{
                asset->{
                  _id,
                  _ref,
                  url
                }
              },
              securityDocuments[]{
                _key,
                docType,
                certificateNumber,
                issueDate,
                asset->{_id, _ref, url},
                file{asset->{_id, _ref, url}},
                image{asset->{_id, _ref, url}},
                scannedImage{asset->{_id, _ref, url}}
              },
              financialDetails[]{
                _key,
                receiptNumber,
                totalAmount,
                dateOfPayment,
                bank,
                paymentMethod,
                chequeNumber,
                isMultipleEmployees,
                employeeCount,
                amountPerEmployee,
                remarks,
                receiptImage{
                  asset->{_id, _ref, url},
                  _ref
                }
              },
              isExempt,
              exemptionRemarks
            }`,
            { id: editId }
          );

          console.log("🔥 FULL FETCHED DATA:", pass);

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

            // 1. Map Photo
            if (pass.photo?.asset) {
              const photoUrl = pass.photo.asset.url || urlFor(pass.photo).url();
              setPhotoPreview(photoUrl);
              setExistingPhotoRef(pass.photo.asset._ref || pass.photo.asset._id || null);
              console.log('📸 Loaded existing photo:', pass.photo.asset._ref || pass.photo.asset._id);
            }

            // 2. Map Security Documents (ENHANCED WITH DEBUG)
            if (pass.securityDocuments && Array.isArray(pass.securityDocuments)) {
              console.log("🔐 Raw Security Docs from DB:", JSON.stringify(pass.securityDocuments, null, 2));
              const mappedDocs: SecurityDocument[] = pass.securityDocuments.map((doc: FetchedDocument, index: number) => {
                console.log(`\n--- Processing Security Doc ${index} ---`);
                console.log('Full doc object:', doc);

                // SMART ASSET FINDER - Check all possible locations
                let assetRef = null;
                let assetUrl = null;

                // Priority 1: Direct asset reference
                if (doc.asset?._ref || doc.asset?._id) {
                  assetRef = doc.asset._ref || doc.asset._id;
                  assetUrl = doc.asset.url;
                  console.log('✅ Found in doc.asset');
                }
                // Priority 2: File.asset
                else if (doc.file?.asset?._ref || doc.file?.asset?._id) {
                  assetRef = doc.file.asset._ref || doc.file.asset._id;
                  assetUrl = doc.file.asset.url;
                  console.log('✅ Found in doc.file.asset');
                }
                // Priority 3: Image field
                else if (doc.image?.asset?._ref || doc.image?.asset?._id) {
                  assetRef = doc.image.asset._ref || doc.image.asset._id;
                  assetUrl = doc.image.asset.url;
                  console.log('✅ Found in doc.image.asset');
                }
                // Priority 4: ScannedImage field
                else if (doc.scannedImage?.asset?._ref || doc.scannedImage?.asset?._id) {
                  assetRef = doc.scannedImage.asset._ref || doc.scannedImage.asset._id;
                  assetUrl = doc.scannedImage.asset.url;
                  console.log('✅ Found in doc.scannedImage.asset');
                }

                console.log(`Asset Ref: ${assetRef}, URL: ${assetUrl}`);

                // Generate preview URL
                let previewUrl = null;
                if (assetUrl) {
                  previewUrl = assetUrl;
                } else if (assetRef) {
                  try {
                    previewUrl = urlFor({ asset: { _ref: assetRef } }).url();
                    console.log('✅ Generated URL from ref:', previewUrl);
                  } catch (err) {
                    console.error('❌ Failed to generate URL:', err);
                  }
                }

                const mappedDoc = {
                  id: doc._key || `existing-sec-${index}`,
                  docType: doc.docType || 'special_branch',
                  certificateNumber: doc.certificateNumber || '',
                  issueDate: doc.issueDate || '',
                  isChecking: false,
                  useExisting: !!assetRef,
                  existingDocId: assetRef || undefined,
                  preview: previewUrl,
                  file: null,
                  foundMessage: assetRef ? 'Loaded from existing record' : undefined
                };

                console.log('Mapped doc result:', mappedDoc);
                return mappedDoc;
              });

              console.log('\n✅ Final mapped security documents:', mappedDocs);
              setSecurityDocuments(mappedDocs);

              // Set security clearance radio button
              if (mappedDocs.length > 0 && mappedDocs[0].docType) {
                setFormData(prev => ({ ...prev, securityClearance: mappedDocs[0].docType }));
              }
            }

            // 3. Map Financial Details (ENHANCED WITH DEBUG)
            if (pass.financialDetails && Array.isArray(pass.financialDetails)) {
              console.log("💰 Raw Financial Details from DB:", JSON.stringify(pass.financialDetails, null, 2));

              const mappedFinancials: FinancialDetails[] = pass.financialDetails.map((det, index) => {
                console.log(`\n--- Processing Financial Detail ${index} ---`);

                // Find receipt image asset
                let assetRef = null;
                let assetUrl = null;

                if (det.receiptImage?.asset?._ref || det.receiptImage?.asset?._id) {
                  assetRef = det.receiptImage.asset._ref || det.receiptImage.asset._id;
                  assetUrl = det.receiptImage.asset.url;
                  console.log('✅ Found receipt image asset:', assetRef);
                } else if (det.receiptImage?._ref) {
                  assetRef = det.receiptImage._ref;
                  console.log('✅ Found receipt image ref:', assetRef);
                }

                let previewUrl = null;
                if (assetUrl) {
                  previewUrl = assetUrl;
                } else if (assetRef) {
                  try {
                    previewUrl = urlFor({ asset: { _ref: assetRef } }).url();
                    console.log('✅ Generated receipt URL:', previewUrl);
                  } catch (err) {
                    console.error('❌ Failed to generate receipt URL:', err);
                  }
                }

                const mappedDetail = {
                  id: det._key || `existing-fin-${index}`,
                  receiptNumber: det.receiptNumber || '',
                  totalAmount: det.totalAmount || '',
                  dateOfPayment: det.dateOfPayment || '',
                  bank: det.bank || 'HBL',
                  paymentMethod: det.paymentMethod || 'CASH',
                  chequeNumber: det.chequeNumber,
                  isMultipleEmployees: det.isMultipleEmployees || false,
                  employeeCount: det.employeeCount || 1,
                  amountPerEmployee: det.amountPerEmployee,
                  remarks: det.remarks,
                  isChecking: false,
                  useExisting: !!assetRef,
                  existingDocId: assetRef || undefined,
                  receiptPreview: previewUrl,
                  receiptImage: null,
                  foundMessage: assetRef ? 'Loaded from existing record' : undefined
                };

                console.log('Mapped financial detail:', mappedDetail);
                return mappedDetail;
              });

              console.log('\n✅ Final mapped financial details:', mappedFinancials);
              setFinancialDetails(mappedFinancials);
            }

            // 4. Map Exemption
            if (pass.isExempt) {
              setIsExempt(true);
              setExemptionRemarks(pass.exemptionRemarks || '');
            }
          }
        } catch (err) {
          console.error('❌ Error fetching pass data:', err);
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
      setExistingPhotoRef(null);
      setError(null);
      console.log('📸 New photo selected, cleared existing ref');
    } else {
      setError('Invalid file type.');
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

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
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'areaAllowed') (value as string[]).forEach(area => submissionFormData.append('areaAllowed', area));
      else submissionFormData.append(key, value as string);
    });

    // === FIXED PHOTO HANDLING ===
    if (photo) {
      // User uploaded a new photo
      submissionFormData.append('photo', photo);
      console.log('📸 Submitting NEW photo file');
    } else if (existingPhotoRef) {
      // No new photo, but we have an existing reference from database
      submissionFormData.append('existingPhotoRef', existingPhotoRef);
      console.log('📸 Using existing photo ref:', existingPhotoRef);
    } else if (photoPreview && !photo) {
      // Edge case: We have a preview but no file (shouldn't happen, but safe fallback)
      console.warn('⚠️ Photo preview exists but no file or ref - photo may be missing');
    }

    // Add debug logging
    console.log('Photo submission state:', {
      hasNewPhoto: !!photo,
      hasExistingRef: !!existingPhotoRef,
      hasPreview: !!photoPreview,
      isEditMode
    });

    // Security Documents handling
    securityDocuments.forEach((doc, index) => {
      submissionFormData.append(`securityDocumentType_${index}`, doc.docType);
      submissionFormData.append(`securityDocumentDate_${index}`, doc.issueDate || '');
      submissionFormData.append(`securityDocumentId_${index}`, doc.id);
      submissionFormData.append(`securityDocumentNumber_${index}`, doc.certificateNumber);

      if (doc.useExisting && doc.existingDocId) {
        submissionFormData.append(`securityDocumentRefId_${index}`, doc.existingDocId);
        console.log(`🔐 Security Doc ${index}: Using existing ref ${doc.existingDocId}`);
      } else if (doc.file) {
        submissionFormData.append(`securityDocument_${index}`, doc.file);
        console.log(`🔐 Security Doc ${index}: Uploading new file`);
      }
    });

    // Financial Details handling
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

        // Debug: Log what we are sending for this financial detail
        console.log(`💰 Submitting Financial Detail ${index}:`, {
          useExisting: detail.useExisting,
          existingDocId: detail.existingDocId,
          hasNewFile: !!detail.receiptImage
        });

        if (detail.useExisting && detail.existingDocId) {
          submissionFormData.append(`financialDetailRefId_${index}`, detail.existingDocId);
          console.log(`💰 Financial ${index}: Using existing ref ${detail.existingDocId}`);
        } else if (detail.receiptImage) {
          submissionFormData.append(`financialDetail_${index}_receiptImage`, detail.receiptImage);
          console.log(`💰 Financial ${index}: Uploading new receipt`);
        }
      });
    }

    submissionFormData.append('isExempt', isExempt.toString());
    if (exemptionRemarks) submissionFormData.append('exemptionRemarks', exemptionRemarks);
    if (isEditMode) submissionFormData.append('id', editId as string);

    // Final debug log
    console.log('📤 Form submission summary:', {
      photoType: photo ? 'new' : existingPhotoRef ? 'existing' : 'none',
      securityDocsCount: securityDocuments.length,
      financialDetailsCount: financialDetails.length,
      isExempt,
      isEditMode
    });

    try {
      const response = await fetch(isEditMode ? '/api/update-pass' : '/api/add-pass', {
        method: isEditMode ? 'PATCH' : 'POST',
        body: submissionFormData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccessMessage(isEditMode ? "Success! Pass Updated." : "Success! Pass Created.");
      if (!isEditMode) { (e.target as HTMLFormElement).reset(); resetFormFields('', true); }
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
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isEditMode ? 'Edit Employee Pass' : 'Add New Employee Pass'}
        </h1>
        <p className="text-gray-600 text-sm mb-6">Fill in the employee details and upload required documents</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Personal Details */}
          <section className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-blue-200">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</div>
              <h2 className="text-xl font-semibold text-gray-900">Personal Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport / CNIC <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter ID number" />
                  {autoFillStatus.isLoading && <div className="absolute right-3 top-3"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}
                </div>
                {autoFillStatus.message && (
                  <p className={`text-xs mt-2 flex items-center ${autoFillStatus.hasData ? 'text-green-600' : 'text-gray-500'}`}>
                    {autoFillStatus.hasData && <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                    {autoFillStatus.message}
                  </p>
                )}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter full name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Father&apos;s Name</label><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter father's name" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Place of Birth</label><input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Enter place of birth" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label><input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Pakistani" /></div>
            </div>
          </section>

          {/* Contact & Address */}
          <section className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-xl p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-purple-200">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</div>
              <h2 className="text-xl font-semibold text-gray-900">Contact & Address Information</h2>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label><input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="+92 XXX XXXXXXX" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Present Address</label><textarea name="presentAddress" value={formData.presentAddress} onChange={handleInputChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Enter current residential address" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Permanent Address</label><textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleInputChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Enter permanent address" /></div>
            </div>
          </section>

          {/* Employment & Pass Details */}
          <section className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-green-200">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</div>
              <h2 className="text-xl font-semibold text-gray-900">Employment & Pass Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Designation <span className="text-red-500">*</span></label><input type="text" name="designation" value={formData.designation} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" placeholder="e.g., Manager, Officer" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Organization <span className="text-red-500">*</span></label><input type="text" name="organization" value={formData.organization} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" placeholder="Enter organization name" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pass Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                  <option value="cargo">Cargo</option>
                  <option value="landside">Landside</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pass Year</label>
                <select value={selectedYear} onChange={handleYearChange} disabled={isEditMode} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100">
                  <option value="">Select Year (Manual Dates)</option>
                  {Array.from({ length: 5 }, (_, i) => currentYear + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Entry <span className="text-red-500">*</span></label><input type="date" name="dateOfEntry" value={formData.dateOfEntry} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Expiry <span className="text-red-500">*</span></label><input type="date" name="dateOfExpiry" value={formData.dateOfExpiry} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" /></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Areas Allowed <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableAreas.map(area => (
                  <label key={area} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all">
                    <input type="checkbox" checked={formData.areaAllowed.includes(area)} onChange={handleAreaChange} value={area} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <span className="text-sm text-gray-700">{area}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Security & Documents Section */}
          <section className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-xl p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-orange-200">
              <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</div>
              <h2 className="text-xl font-semibold text-gray-900">Security & Documents</h2>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Smart Document Linking</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Enter certificate/receipt numbers to search existing records</li>
                    <li>• Found documents will auto-link (no duplicate uploads needed)</li>
                    <li>• New documents will be saved for future reuse</li>
                    <li>• Bulk payments can be shared across multiple employees</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Security Clearance Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Security Clearance Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[{ v: 'special_branch', l: 'Special Branch Police', icon: '🛡️' }, { v: 'local_police', l: 'Local Police', icon: '👮' }, { v: 'na', l: 'Not Applicable', icon: '❌' }].map(o => (
                  <label key={o.v} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.securityClearance === o.v ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                    <input type="radio" name="securityClearance" value={o.v} checked={formData.securityClearance === o.v} onChange={handleInputChange} className="h-4 w-4 text-orange-600 focus:ring-orange-500" />
                    <span className="ml-3 text-2xl">{o.icon}</span>
                    <span className="ml-2 text-sm font-medium text-gray-900">{o.l}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Security Documents */}
            {formData.securityClearance !== 'na' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Security Documents</h3>
                    <p className="text-sm text-gray-500 mt-1">Upload certificates or link to existing ones</p>
                  </div>
                  <button type="button" onClick={addSecurityDocument} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Document
                  </button>
                </div>

                {securityDocuments.map((doc, index) => (
                  <div key={doc.id} className="border-2 border-gray-200 rounded-lg p-5 mb-4 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          {doc.docType === 'special_branch' ? '🛡️ Special Branch' : '👮 Local Police'} #{index + 1}
                        </div>
                        {doc.useExisting && (
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Linked
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => setSecurityDocuments(prev => prev.filter(d => d.id !== doc.id))} className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">
                        ✕ Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Number *</label>
                          <div className="relative">
                            <input type="text" value={doc.certificateNumber} onChange={(e) => handleSecurityNumberChange(doc.id, e.target.value)} placeholder="Enter certificate number to search..." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10" />
                            {doc.isChecking && (
                              <div className="absolute right-3 top-3">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                              </div>
                            )}
                            {!doc.isChecking && doc.certificateNumber.length > 2 && (
                              <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            )}
                          </div>

                          {doc.foundMessage && (
                            <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                              <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm text-green-800 font-medium">{doc.foundMessage}</p>
                                <p className="text-xs text-green-600 mt-1">Using existing document from database</p>
                              </div>
                            </div>
                          )}

                          {!doc.isChecking && !doc.useExisting && doc.certificateNumber.length > 2 && (
                            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm text-amber-800 font-medium">No existing record found</p>
                                <p className="text-xs text-amber-600 mt-1">Please upload a new document below</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                          <input type="date" value={doc.issueDate || ''} onChange={(e) => setSecurityDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, issueDate: e.target.value } : d))} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {doc.useExisting ? 'Linked Document Preview' : 'Upload New Document'}
                        </label>

                        {doc.useExisting && doc.preview ? (
                          <div className="relative rounded-lg overflow-hidden border-2 border-green-300 shadow-md">
                            <Image src={doc.preview} alt="Linked certificate" width={300} height={200} className="w-full h-48 object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-transparent p-3">
                              <div className="flex items-center gap-2 text-white text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Linked from Database
                              </div>
                            </div>
                          </div>
                        ) : doc.preview ? (
                          <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-md">
                            <Image src={doc.preview} alt="Document preview" width={300} height={200} className="w-full h-48 object-cover" />
                            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">New Upload</div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-gray-50">
                            <input type="file" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleSecurityDocumentUpload(doc.id, e.target.files[0])} className="hidden" id={`security-upload-${doc.id}`} />
                            <label htmlFor={`security-upload-${doc.id}`} className="cursor-pointer">
                              <svg className="mx-auto text-gray-400 mb-2" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-gray-600 font-medium">Click to upload</p>
                              <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF (Max 10MB)</p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Details */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <input type="checkbox" id="isExempt" checked={isExempt} onChange={(e) => setIsExempt(e.target.checked)} className="h-5 w-5 text-orange-600 rounded focus:ring-orange-500" />
                <label htmlFor="isExempt" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Mark as Exempt from Payment
                </label>
              </div>

              {isExempt ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exemption Remarks *</label>
                  <textarea value={exemptionRemarks} onChange={(e) => setExemptionRemarks(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" required={isExempt} placeholder="Explain reason for exemption..." />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Payment Records</h3>
                      <p className="text-sm text-gray-500 mt-1">Add payment details or link to existing receipts</p>
                    </div>
                    <button type="button" onClick={addFinancialDetail} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Payment
                    </button>
                  </div>

                  {financialDetails.map((detail, index) => (
                    <div key={detail.id} className="border-2 border-gray-200 rounded-lg p-5 mb-4 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">💰 Payment #{index + 1}</div>
                          {detail.useExisting && (
                            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Linked
                            </div>
                          )}
                          {detail.isMultipleEmployees && (
                            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">👥 Bulk</div>
                          )}
                        </div>
                        <button type="button" onClick={() => setFinancialDetails(prev => prev.filter(d => d.id !== detail.id))} className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors">
                          ✕ Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number *</label>
                          <div className="relative">
                            <input type="text" value={detail.receiptNumber} onChange={(e) => handleReceiptNumberChange(detail.id, e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all pr-10" placeholder="Enter receipt number to search..." />
                            {detail.isChecking && (
                              <div className="absolute right-3 top-3">
                                <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full" />
                              </div>
                            )}
                          </div>

                          {detail.foundMessage && (
                            <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                              <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <p className="text-sm text-green-800 font-medium">{detail.foundMessage}</p>
                                <p className="text-xs text-green-600 mt-1">Details auto-filled from database</p>
                              </div>
                            </div>
                          )}

                          {!detail.isChecking && !detail.useExisting && detail.receiptNumber.length > 1 && (
                            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm text-amber-800">New receipt - please fill details and upload image</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount *</label>
                          <input type="number" value={detail.totalAmount} onChange={(e) => handleFinancialDetailChange(detail.id, 'totalAmount', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" placeholder="0.00" readOnly={detail.useExisting} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                          <input type="date" value={detail.dateOfPayment} onChange={(e) => handleFinancialDetailChange(detail.id, 'dateOfPayment', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" readOnly={detail.useExisting} />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bank *</label>
                          <select value={detail.bank} onChange={(e) => handleFinancialDetailChange(detail.id, 'bank', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all" disabled={detail.useExisting}>
                            <option value="HBL">HBL</option>
                            <option value="NBP">NBP</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                          <select value={detail.paymentMethod} onChange={(e) => handleFinancialDetailChange(detail.id, 'paymentMethod', e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
                            <option value="CASH">CASH</option>
                            <option value="CHEQUE">CHEQUE</option>
                            <option value="ONLINE_TRANSFER">ONLINE_TRANSFER</option>
                            <option value="BANK_DRAFT">BANK_DRAFT</option>
                          </select>
                        </div>
                      </div>

                      {/* Bulk Payment Toggle */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={detail.isMultipleEmployees} onChange={(e) => handleFinancialDetailChange(detail.id, 'isMultipleEmployees', e.target.checked)} className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">Bulk Payment (Multiple Employees)</span>
                            <p className="text-xs text-gray-600 mt-0.5">This receipt covers payment for multiple employees</p>
                          </div>
                        </label>

                        {detail.isMultipleEmployees && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Number of Employees</label>
                              <input type="number" min="2" value={detail.employeeCount || 2} onChange={(e) => handleFinancialDetailChange(detail.id, 'employeeCount', parseInt(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Amount Per Employee</label>
                              <input type="number" value={detail.amountPerEmployee || ''} onChange={(e) => handleFinancialDetailChange(detail.id, 'amountPerEmployee', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" placeholder="Auto-calculated" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Receipt Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Receipt Image {!detail.useExisting && '*'}
                        </label>

                        {detail.useExisting && detail.receiptPreview ? (
                          <div className="relative rounded-lg overflow-hidden border-2 border-green-300 shadow-md max-w-xs">
                            <Image src={detail.receiptPreview} alt="Linked receipt" width={300} height={200} className="w-full h-48 object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-transparent p-3">
                              <div className="flex items-center gap-2 text-white text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Linked Receipt
                              </div>
                            </div>
                          </div>
                        ) : detail.receiptPreview ? (
                          <div className="relative rounded-lg overflow-hidden border-2 border-gray-300 shadow-md max-w-xs">
                            <Image src={detail.receiptPreview} alt="Receipt preview" width={300} height={200} className="w-full h-48 object-cover" />
                            <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">New Upload</div>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-gray-50 max-w-xs">
                            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFinancialDetailChange(detail.id, 'receiptImage', e.target.files[0])} className="hidden" id={`receipt-upload-${detail.id}`} />
                            <label htmlFor={`receipt-upload-${detail.id}`} className="cursor-pointer">
                              <svg className="mx-auto text-gray-400 mb-2" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm text-gray-600 font-medium">Upload receipt image</p>
                              <p className="text-xs text-gray-500 mt-1">PNG or JPG (Max 10MB)</p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Employee Photo */}
          <section className="bg-gradient-to-br from-pink-50 to-white border border-pink-100 rounded-xl p-6">
            <div className="flex items-center mb-6 pb-4 border-b border-pink-200">
              <div className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">5</div>
              <h2 className="text-xl font-semibold text-gray-900">Employee Photo</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Upload Employee Photo</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]) }}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
                onDragLeave={() => { setIsDraggingOver(false) }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDraggingOver ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400 bg-gray-50'}`}
              >
                <input ref={fileInputRef} type="file" name="photo" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                {photoPreview ? (
                  <div className="flex flex-col items-center">
                    <Image src={photoPreview} alt="Preview" width={150} height={150} className="rounded-lg border-4 border-white shadow-lg object-cover mb-3" />
                    <p className="text-sm text-gray-600">Click to change photo</p>
                    {existingPhotoRef && !photo && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Using photo from database</p>
                    )}
                    {photo && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">✓ New photo selected</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto text-gray-400 mb-3" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-base text-gray-700 font-medium mb-1">Click or Drag Photo Here</p>
                    <p className="text-sm text-gray-500">PNG, JPG or JPEG (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditMode ? 'Update Pass' : 'Create Pass'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}