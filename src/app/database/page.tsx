// /app/database/page.tsx

'use client';

import { useEffect, useState, useMemo, useCallback, ChangeEvent, useRef } from 'react';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass, PassCategory } from '@/app/types';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';
type DeleteState = { isDeleting: boolean; deletingId: string | null; };
type SortOrder = 'createdAt_desc' | 'passId_asc' | 'passId_desc' | 'name_asc' | 'expiry_asc';

// --- THIS IS THE CRASH-PROOF FIX ---
function getImageUrl(photo: SanityImageSource | null | undefined): string {
  if (!photo || typeof photo !== 'object' || !('asset' in photo) || !photo.asset) {
    return PLACEHOLDER_AVATAR_URL;
  }
  try { 
    const url = urlFor(photo).width(40).height(40).fit('crop').url();
    return url || PLACEHOLDER_AVATAR_URL;
  } 
  catch { 
    return PLACEHOLDER_AVATAR_URL; 
  }
}

const formatTablePassId = (pid: number | null | undefined): string => String(pid || '0').padStart(4, '0');

function formatDateSafely(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try { return format(new Date(dateString), 'dd-MM-yyyy'); } 
  catch { return 'Invalid Date'; }
}

// --- NEW HELPER FUNCTION FOR YEAR CALCULATION ---
function getPassYear(entryDate: string | null | undefined, expiryDate: string | null | undefined): string {
  if (!entryDate) return 'N/A';
  try {
    const startYear = new Date(entryDate).getFullYear();
    // If we have an expiry date, check if it falls in a different year
    if (expiryDate) {
      const endYear = new Date(expiryDate).getFullYear();
      // If years are different, show range (e.g., 2023-2024), otherwise just 2023
      if (startYear !== endYear) {
        return `${startYear}-${endYear}`;
      }
    }
    return startYear.toString();
  } catch {
    return 'N/A';
  }
}

function getIdNumber(pass: EmployeePass): string {
  return pass.idNumber || pass.cnic || 'N/A';
}

function MultiLineCell({ text }: { text: string | undefined | null }) {
  if (!text) return <span className="text-gray-400">N/A</span>;
  return (
    <div className="max-w-xs">
      {text.split('\n').map((line, index) => (
        <div key={index} className="text-sm leading-tight">
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
}

function ActionsCell({ pass, onDelete, deleteState }: { 
  pass: EmployeePass; 
  onDelete: (passId: string, passName: string) => Promise<void>; 
  deleteState: DeleteState; 
}) {
  return (
    <div className="flex space-x-1">
      <Link 
        href={`/add-pass?edit=${pass._id}`} 
        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
        title="Edit Pass"
        onClick={(e) => e.stopPropagation()} 
      >
        Edit
      </Link>
      <button
        onClick={(e) => {
          e.stopPropagation(); 
          onDelete(pass._id, pass.name || 'Unknown');
        }}
        disabled={deleteState.isDeleting && deleteState.deletingId === pass._id}
        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-600 bg-red-100 hover:bg-red-200 disabled:opacity-50"
        title="Delete Pass"
      >
        {deleteState.isDeleting && deleteState.deletingId === pass._id ? '...' : 'Delete'}
      </button>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-10">
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={onRetry} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Retry
      </button>
    </div>
  );
}

function LoadingSkeleton() { 
  return ( 
    <div className="text-center py-20"> 
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div> 
      <p className="mt-4 text-gray-600">Loading Passes...</p> 
    </div> 
  ); 
}

function EmptyState({ year, category, search }: { year: string; category: string; search: string; }) {
  return (
    <tr>
      {/* Updated colSpan from 19 to 20 to account for new Year column */}
      <td colSpan={20} className="px-6 py-14 text-center">
        <div className="space-y-2">
          <p className="text-gray-500">No passes found</p>
          {(year !== 'all' || category !== 'all' || search) && (
            <p className="text-sm text-gray-400">
              Try adjusting your filters
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

function formatSecurityClearance(clearance?: string): string {
  const clearanceMap: Record<string, string> = {
    'special_branch': 'Special Branch Police',
    'local_police': 'Local Police',
    'na': 'Not Applicable'
  };
  return clearanceMap[clearance || ''] || clearance || 'N/A';
}

export default function DatabasePage() {
  const { status } = useSession();
  const router = useRouter();
  const [passes, setPasses] = useState<EmployeePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState>({ isDeleting: false, deletingId: null });
  const [filters, setFilters] = useState({ category: 'all' as PassCategory | 'all', search: '' });
  const [selectedPassIds, setSelectedPassIds] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('createdAt_desc');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/passes');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setPasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading passes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load passes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.push('/auth/signin');
      return;
    }
    loadData();
  }, [status, router, loadData]);

  const handleRowClick = (pass: EmployeePass) => {
    const year = new Date(pass.dateOfEntry).getFullYear();
    const categoryPath = pass.category === 'cargo' ? 'cargo-id' : 'landside-id';
    router.push(`/${categoryPath}/${pass.passId}/${year}`);
  };

  const handleDelete = useCallback(async (passId: string, passName: string) => {
    if (!confirm(`Are you sure you want to delete the pass for ${passName}?`)) return;
    try {
      setDeleteState({ isDeleting: true, deletingId: passId });
      const response = await fetch(`/api/passes/${passId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete pass');
      await loadData();
      setSelectedPassIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(passId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting pass:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete pass');
    } finally {
      setDeleteState({ isDeleting: false, deletingId: null });
    }
  }, [loadData]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirm(`Are you sure you want to delete ${selectedPassIds.size} selected passes?`)) return;
    try {
      setLoading(true);
      await Promise.all(Array.from(selectedPassIds).map(id => 
        fetch(`/api/passes/${id}`, { method: 'DELETE' })
      ));
      await loadData();
      setSelectedPassIds(new Set());
    } catch (err) {
      console.error('Error deleting passes:', err);
      alert('Failed to delete some passes');
    }
  }, [selectedPassIds, loadData]);

  const handleDownloadPDF = async (selectedOnly = false) => {
    try {
      setIsGeneratingPDF(true);
      
      const passesToDownload = selectedOnly 
        ? filteredAndSortedPasses.filter(pass => selectedPassIds.has(pass._id))
        : filteredAndSortedPasses;
      
      if (passesToDownload.length === 0) {
        alert('No passes to export. Please select passes or adjust your filters.');
        return;
      }

      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Generating PDF... (${passesToDownload.length} records)
          </div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
      `;
      document.body.appendChild(loadingToast);

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passes: passesToDownload }),
      });

      document.body.removeChild(loadingToast);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to generate PDF`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        throw new Error(`Server returned invalid content type: ${contentType}. Expected PDF.`);
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Generated PDF is empty');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `paa-passes-${selectedOnly ? 'selected' : 'all'}-${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 100);
      
      const successToast = document.createElement('div');
      successToast.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          ✅ PDF generated successfully!
        </div>
      `;
      document.body.appendChild(successToast);
      setTimeout(() => document.body.removeChild(successToast), 3000);

    } catch (err) {
      console.error('Error generating PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`PDF Generation Failed: ${errorMessage}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    passes.forEach(pass => {
      if (pass.dateOfEntry) {
        years.add(new Date(pass.dateOfEntry).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [passes]);

  const filteredAndSortedPasses = useMemo(() => {
    const passesToProcess = Array.isArray(passes) ? passes : [];
    return passesToProcess
      .filter(pass => yearFilter === 'all' || (pass.dateOfEntry ? new Date(pass.dateOfEntry).getFullYear().toString() === yearFilter : false))
      .filter(pass => filters.category === 'all' || pass.category === filters.category)
      .filter(pass => {
        if (!filters.search) return true;
        const searchTerm = filters.search.toLowerCase().trim();
        const fieldsToSearch = [ 
          pass.name, pass.fatherName, getIdNumber(pass), pass.mobileNumber, 
          pass.organization, pass.designation, pass.author?.name, 
          String(pass.passId), pass.nationality, pass.placeOfBirth
        ];
        return fieldsToSearch.some(field => field && typeof field === 'string' && field.toLowerCase().includes(searchTerm));
      })
      .sort((a, b) => {
        switch (sortOrder) {
            case 'passId_asc': return (a.passId || 0) - (b.passId || 0);
            case 'passId_desc': return (b.passId || 0) - (a.passId || 0);
            case 'name_asc': return (a.name || '').localeCompare(b.name || '');
            case 'expiry_asc': return (new Date(a.dateOfExpiry || 0).getTime()) - (new Date(b.dateOfExpiry || 0).getTime());
            case 'createdAt_desc': default: return (new Date(b._createdAt || 0).getTime()) - (new Date(a._createdAt || 0).getTime());
        }
      });
  }, [passes, filters, sortOrder, yearFilter]);

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPassIds(new Set(filteredAndSortedPasses.map(pass => pass._id)));
    } else {
      setSelectedPassIds(new Set());
    }
  };

  const handleSelectSingle = (passId: string, isChecked: boolean) => {
    setSelectedPassIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(passId);
      } else {
        newSet.delete(passId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const checkbox = selectAllCheckboxRef.current;
      if (selectedPassIds.size === 0) {
        checkbox.checked = false;
        checkbox.indeterminate = false;
      } else if (selectedPassIds.size === filteredAndSortedPasses.length) {
        checkbox.checked = true;
        checkbox.indeterminate = false;
      } else {
        checkbox.checked = false;
        checkbox.indeterminate = true;
      }
    }
  }, [selectedPassIds, filteredAndSortedPasses]);

  if (status === 'loading' || (loading && !deleteState.isDeleting)) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={loadData} />;
  if (status !== 'authenticated') return <div className="text-center py-10"><p>Access Denied.</p></div>;

  // Updated headers to include YEAR
  const tableHeaders = [
    'SELECT',
    'ACTIONS',
    'CATEGORY', 
    'PASS ID', 
    'PHOTO', 
    'NAME', 
    "FATHER'S NAME", 
    'DOB',
    'PLACE OF BIRTH',
    'NATIONALITY',
    'DESIGNATION', 
    'ORGANIZATION', 
    'ID NUMBER', 
    'MOBILE NO.', 
    'PERMANENT ADDRESS',
    'PRESENT ADDRESS',
    'SECURITY', 
    'AREAS',
    'YEAR', // <--- Added YEAR header
    'ENTRY', 
    'EXPIRY'
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* --- HEADER --- */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">PAA PASS DATA ({yearFilter === 'all' ? 'All Years' : yearFilter}) <span className="text-lg font-normal text-gray-500">({filteredAndSortedPasses.length})</span></h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-2">
            <button onClick={() => handleDownloadPDF(false)} disabled={isGeneratingPDF || filteredAndSortedPasses.length === 0} className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50">
              {isGeneratingPDF ? '...' : 'Download PDF'}
            </button>
            <Link href="/bulk-add-passes" className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">Bulk Add</Link>
            <Link href="/add-pass" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                + Add New Pass
            </Link>
        </div>
      </div>

      {/* --- FILTERS --- */}
      <div className="mt-4 grid grid-cols-1 gap-y-4 md:grid-cols-4 md:gap-x-4">
          <div className="md:col-span-2"><input type="search" placeholder="Search by Name, ID, Phone, etc..." value={filters.search} onChange={(e) => setFilters(prev => ({...prev, search: e.target.value}))} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2" /></div>
          <select value={filters.category} onChange={(e) => setFilters(prev => ({...prev, category: e.target.value as PassCategory | 'all'}))} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2">
            <option value="all">All Categories</option><option value="cargo">Cargo</option><option value="landside">Landside</option>
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2">
            <option value="all">All Years</option>{availableYears.map(year => (<option key={year} value={year}>{year}</option>))}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2">
            <option value="createdAt_desc">Sort by: Newest First</option><option value="passId_asc">Sort by: Pass ID (Asc)</option><option value="passId_desc">Sort by: Pass ID (Desc)</option><option value="name_asc">Sort by: Name (A-Z)</option><option value="expiry_asc">Sort by: Expiry Date</option></select>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="relative overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              {selectedPassIds.size > 0 && (
                  <div className="absolute left-14 top-0 flex h-12 items-center space-x-3 bg-gray-50 sm:left-12">
                      <button onClick={handleBulkDelete} disabled={loading} className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50">
                          Delete selected ({selectedPassIds.size})
                      </button>
                      <button onClick={() => handleDownloadPDF(true)} disabled={isGeneratingPDF} className="inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50">
                          PDF selected ({selectedPassIds.size})
                      </button>
                  </div>
              )}
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {tableHeaders.map((header, index) => (
                      <th
                        key={index}
                        scope="col"
                        className={`px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide ${
                          index === 0 ? 'relative w-12' : ''
                        }`}
                      >
                        {index === 0 ? (
                          <input
                            type="checkbox"
                            ref={selectAllCheckboxRef}
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600"
                            onChange={handleSelectAll}
                          />
                        ) : (
                          header
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAndSortedPasses.length > 0 ? (
                    filteredAndSortedPasses.map(pass => (
                      <tr 
                        key={pass._id} 
                        className={`${selectedPassIds.has(pass._id) ? 'bg-indigo-50' : ''} cursor-pointer hover:bg-gray-50 transition-colors`}
                        onClick={() => handleRowClick(pass)}
                      >
                        {/* SELECT */}
                        <td className="relative w-12 px-6 sm:w-16 sm:px-8" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600"
                            checked={selectedPassIds.has(pass._id)}
                            onChange={(e) => handleSelectSingle(pass._id, e.target.checked)}
                          />
                        </td>
                        
                        {/* ACTIONS */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                          <ActionsCell pass={pass} onDelete={handleDelete} deleteState={deleteState} />
                        </td>

                        {/* CATEGORY */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pass.category === 'cargo' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {pass.category?.toUpperCase()}
                          </span>
                        </td>
                        
                        {/* PASS ID */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {formatTablePassId(pass.passId)}
                        </td>
                        
                        {/* PHOTO */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Image
                              src={getImageUrl(pass.photo)}
                              alt={pass.name || 'Employee'}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          </div>
                        </td>
                        
                        {/* NAME */}
                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                          {pass.name || 'N/A'}
                        </td>
                        
                        {/* FATHER'S NAME */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {pass.fatherName || 'N/A'}
                        </td>
                        
                        {/* DOB */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDateSafely(pass.dateOfBirth)}
                        </td>
                        
                        {/* PLACE OF BIRTH */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {pass.placeOfBirth || 'N/A'}
                        </td>
                        
                        {/* NATIONALITY */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {pass.nationality || 'N/A'}
                        </td>
                        
                        {/* DESIGNATION */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {pass.designation || 'N/A'}
                        </td>
                        
                        {/* ORGANIZATION */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {pass.organization || 'N/A'}
                        </td>
                        
                        {/* ID NUMBER */}
                        <td className="px-3 py-4 text-sm text-gray-500 font-mono">
                          {getIdNumber(pass)}
                        </td>
                        
                        {/* MOBILE NO */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                          {pass.mobileNumber || 'N/A'}
                        </td>
                        
                        {/* PERMANENT ADDRESS */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <MultiLineCell text={pass.permanentAddress} />
                        </td>
                        
                        {/* PRESENT ADDRESS */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <MultiLineCell text={pass.presentAddress} />
                        </td>
                        
                        {/* SECURITY */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {formatSecurityClearance(pass.securityClearance)}
                        </td>
                        
                        {/* AREAS */}
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="max-w-xs">
                            {pass.areaAllowed && Array.isArray(pass.areaAllowed) 
                              ? pass.areaAllowed.join(', ') 
                              : 'N/A'
                            }
                          </div>
                        </td>

                         {/* --- NEW YEAR COLUMN --- */}
                         <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-semibold">
                          {getPassYear(pass.dateOfEntry, pass.dateOfExpiry)}
                        </td>
                        
                        {/* ENTRY */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDateSafely(pass.dateOfEntry)}
                        </td>
                        
                        {/* EXPIRY */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`${
                            pass.dateOfExpiry && new Date(pass.dateOfExpiry) < new Date()
                              ? 'text-red-600 font-medium'
                              : 'text-gray-500'
                          }`}>
                            {formatDateSafely(pass.dateOfExpiry)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyState year={yearFilter} category={filters.category} search={filters.search} />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}