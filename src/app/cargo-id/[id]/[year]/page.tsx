'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { urlFor } from '@/sanity/lib/image';
import { EmployeePass } from '@/app/types';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

// A local type to safely handle a legacy 'cnic' field for backward compatibility.
type LegacyEmployeePass = EmployeePass & { cnic?: string };

export default function EmployeeDetailsPageWrapper() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EmployeeDetailsPage />
    </Suspense>
  )
}

const PLACEHOLDER_AVATAR_URL = '/placeholder-avatar.png';

interface EmployeeData {
  personDetails: EmployeePass;
  passHistory: EmployeePass[];
}

function getImageUrl(photo: SanityImageSource | null | undefined): string {
  if (!photo || typeof photo !== 'object' || !('asset' in photo) || !photo.asset) {
    return PLACEHOLDER_AVATAR_URL;
  }
  try { 
    const url = urlFor(photo).width(200).height(200).fit('crop').url();
    return url || PLACEHOLDER_AVATAR_URL;
  } 
  catch { 
    return PLACEHOLDER_AVATAR_URL; 
  }
}

function formatDateSafely(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'dd MMMM yyyy'); } 
    catch { return 'Invalid Date'; }
}

function LoadingSpinner() {
    return ( 
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 text-lg font-medium">Loading Employee Profile...</p>
            </div>
        </div> 
    );
}

function ErrorMessage({ error, onRetry }: { error: string; onRetry: () => void }) {
    return ( 
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.882 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={onRetry} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                        Try Again
                    </button>
                    <Link href="/database" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors">
                        Back to Database
                    </Link>
                </div>
            </div>
        </div> 
    );
}

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) {
    return ( 
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-xl">{icon}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                </div>
            </div>
            <div className="p-6">{children}</div>
        </div> 
    );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return ( 
        <div className="group">
            <dt className="text-sm font-medium text-slate-500 mb-1">{label}</dt>
            <dd className="text-sm text-slate-900 font-medium group-hover:text-blue-700 transition-colors">
                {value || <span className="text-slate-400 italic">Not specified</span>}
            </dd>
        </div> 
    );
}

function formatSecurityClearance(clearance?: string): string {
    if (!clearance) return 'N/A';
    switch (clearance) {
        case 'special_branch': return 'Special Branch Police';
        case 'local_police': return 'Local Police';
        case 'na': return 'Not Applicable';
        default: return clearance;
    }
}

function EmployeeDetailsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract parameters from the URL path
  // URL format: /landside-id/444/2025 or /cargo-id/1592/2025
  const passId = params.id as string; // This will be the pass ID (444, 1592, etc.)
  const year = params.year as string; // This will be the year (2025, etc.)
  const pageCategory = pathname.includes('/cargo-id/') ? 'cargo' : 'landside';

  console.log('URL Parameters:', { passId, year, pageCategory, pathname });

  const fetchEmployeeDetails = useCallback(async () => {
    if (!passId || !year || !pageCategory) {
      console.log('Missing required parameters:', { passId, year, pageCategory });
      setError('Missing required parameters to load employee details');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching employee details with:', { passId, year, pageCategory });
      
      // First, let's try to get the employee by passId and year to find the document ID
      const response = await fetch(`/api/passes?passId=${passId}&year=${year}&category=${pageCategory}`, { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        throw new Error(`Failed to find pass (${response.status})`);
      }
      
      const passes = await response.json();
      const matchingPass = passes.find((pass: EmployeePass) => 
        pass.passId === parseInt(passId) && 
        new Date(pass.dateOfEntry).getFullYear().toString() === year &&
        pass.category === pageCategory
      );
      
      if (!matchingPass) {
        throw new Error(`No pass found with ID ${passId} for year ${year} in ${pageCategory} category`);
      }
      
      // Now get the detailed employee data using the document ID
      const detailResponse = await fetch(`/api/get-pass-details?id=${matchingPass._id}&year=${year}&category=${pageCategory}`, { 
        cache: 'no-store' 
      });
      
      if (!detailResponse.ok) {
        const errorData = await detailResponse.json();
        throw new Error(errorData.error || `Failed to fetch details (${detailResponse.status})`);
      }
      
      const data: EmployeeData = await detailResponse.json();
      console.log('Employee data loaded successfully:', data);
      setEmployeeData(data);
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  }, [passId, year, pageCategory]);

  useEffect(() => {
    console.log('Session status:', sessionStatus);
    if (sessionStatus === 'unauthenticated') {
      router.push('/');
      return;
    }
    
    if (sessionStatus === 'authenticated') {
      fetchEmployeeDetails();
    }
  }, [sessionStatus, router, fetchEmployeeDetails]);

  if (sessionStatus === 'loading' || loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={fetchEmployeeDetails} />;
  if (!employeeData) return <ErrorMessage error="Employee data could not be found." onRetry={fetchEmployeeDetails} />;
  
  const { personDetails, passHistory } = employeeData;
  const personDetailsWithLegacy = personDetails as LegacyEmployeePass;
  const latestPass = passHistory[0];
  const isExpired = new Date(latestPass.dateOfExpiry) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/database" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-700 group transition-colors">
            <svg className="w-5 h-5 mr-2 text-slate-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Database
          </Link>
        </div>

        {/* Professional Header */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-blue-900 rounded-3xl shadow-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-40 h-40 p-1 bg-gradient-to-br from-blue-400 to-slate-400 rounded-full">
                <Image
                  src={getImageUrl(personDetailsWithLegacy.photo)}
                  alt={`${personDetailsWithLegacy.name}'s photo`}
                  width={200} height={200}
                  className="w-full h-full rounded-full object-cover bg-white"
                />
              </div>
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white ${isExpired ? 'bg-red-500' : 'bg-green-500'} flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  {isExpired ? (
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  )}
                </svg>
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="text-white text-center lg:text-left flex-grow">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                {personDetailsWithLegacy.name}
              </h1>
              <div className="space-y-2">
                <p className="text-xl text-blue-200 font-medium">{personDetailsWithLegacy.designation}</p>
                <p className="text-lg text-slate-300">{personDetailsWithLegacy.organization}</p>
                <div className="flex items-center justify-center lg:justify-start gap-2 mt-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${isExpired ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-green-500/20 text-green-200 border border-green-500/30'}`}>
                    {isExpired ? '🔴 Pass Expired' : '🟢 Active Pass'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30">
                    ID: {String(latestPass.passId).padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Left Column - Personal & Contact Info */}
          <div className="xl:col-span-3 space-y-8">
            <InfoCard title="Personal Information" icon="👤">
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                <InfoField label="Full Name" value={
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{personDetailsWithLegacy.name}</span>
                  </div>
                } />
                <InfoField label="Father's Name" value={
                  <span className="text-slate-700">{personDetailsWithLegacy.fatherName}</span>
                } />
                <InfoField label="ID Number (CNIC / Passport)" value={
                  <div className="bg-gradient-to-r from-slate-100 to-blue-50 px-3 py-2 rounded-lg border border-slate-200">
                    <span className="font-mono text-slate-800 font-medium">
                      {personDetailsWithLegacy.idNumber || personDetailsWithLegacy.cnic}
                    </span>
                  </div>
                } />
                <InfoField label="Date of Birth" value={
                  <div className="flex items-center gap-2">
                    <span>🎂</span>
                    <span className="font-medium text-slate-800">{formatDateSafely(personDetailsWithLegacy.dateOfBirth)}</span>
                  </div>
                } />
                <InfoField label="Place of Birth" value={
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="text-slate-700">{personDetailsWithLegacy.placeOfBirth}</span>
                  </div>
                } />
                <InfoField label="Nationality" value={
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-slate-50 px-3 py-1 rounded-full border border-blue-200">
                    <span>🌍</span>
                    <span className="font-medium text-blue-800">{personDetailsWithLegacy.nationality}</span>
                  </div>
                } />
              </dl>
            </InfoCard>
            
            <InfoCard title="Contact Details" icon="📞">
              <dl className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoField label="Mobile Number" value={
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">📱</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {personDetailsWithLegacy.mobileNumber}
                      </span>
                    </div>
                  </div>
                } />
                <div className="lg:col-span-2">
                  <InfoField label="Present Address" value={
                    <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-600 mt-0.5">🏠</span>
                        <span className="text-slate-700 leading-relaxed">{personDetailsWithLegacy.presentAddress}</span>
                      </div>
                    </div>
                  } />
                </div>
                <div className="lg:col-span-2">
                  <InfoField label="Permanent Address" value={
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-lg border-l-4 border-slate-400">
                      <div className="flex items-start gap-3">
                        <span className="text-slate-600 mt-0.5">🏘️</span>
                        <span className="text-slate-700 leading-relaxed">{personDetailsWithLegacy.permanentAddress}</span>
                      </div>
                    </div>
                  } />
                </div>
              </dl>
            </InfoCard>
          </div>

          {/* Right Column - Enhanced Info Cards */}
          <div className="xl:col-span-2 space-y-8">
            {/* Current Pass Status with Enhanced Design */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-slate-700 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span>🎫</span>
                  </div>
                  Current Pass Status
                </h3>
                <p className="text-blue-100 mt-2">Active security clearance & access details</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 rounded-xl border-l-4 border-blue-500">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <span>🏷️</span> Pass Category
                    </span>
                    <span className="text-sm font-bold text-slate-900 capitalize bg-white px-3 py-1 rounded-full shadow-sm">
                      {latestPass.category} Access
                    </span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-xl border-l-4 border-slate-500">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <span>🛡️</span> Security Level
                    </span>
                    <span className="text-sm font-bold text-slate-900 bg-white px-3 py-1 rounded-full shadow-sm">
                      {formatSecurityClearance(latestPass.securityClearance)}
                    </span>
                  </div>
                </div>
                
                <div className={`bg-gradient-to-r p-4 rounded-xl border-l-4 ${isExpired ? 'from-red-50 to-pink-50 border-red-500' : 'from-green-50 to-emerald-50 border-green-500'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <span>{isExpired ? '⏰' : '📅'}</span> Valid Until
                    </span>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm bg-white ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                      {formatDateSafely(latestPass.dateOfExpiry)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Statistics Card */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-blue-700 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span>📊</span>
                  </div>
                  Profile Statistics
                </h3>
                <p className="text-slate-200 mt-2">Access history & key metrics</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-700">{passHistory.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Total Passes</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
                    <div className="text-2xl font-bold text-slate-700">
                      {new Date(passHistory[0]?.dateOfEntry || '').getFullYear()}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Latest Year</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-700">
                      {passHistory.filter(pass => new Date(pass.dateOfExpiry) > new Date()).length}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Active Passes</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200">
                    <div className="text-2xl font-bold text-amber-700">
                      {[...new Set(passHistory.flatMap(pass => pass.areaAllowed))].length}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Access Areas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pass History Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span>📋</span> Pass History
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {passHistory.length} Records
              </span>
            </h2>
          </div>
          
          <div className="space-y-6">
            {passHistory.map((pass, index) => {
              const isPassExpired = new Date(pass.dateOfExpiry) < new Date();
              const passYear = new Date(pass.dateOfEntry).getFullYear();
              const isLatest = index === 0;
              
              return (
                <div key={pass._id} className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all hover:shadow-xl ${isLatest ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        {isLatest && <span className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full font-medium">Latest</span>}
                        <h3 className="text-xl font-bold text-slate-800">
                          Pass #{String(pass.passId).padStart(4, '0')}
                        </h3>
                        <span className="text-lg text-slate-500">({passYear})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${isPassExpired ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                          {isPassExpired ? '❌ Expired' : '✅ Active'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 pt-6">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <InfoField label="Pass Category" value={
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                            🎫 {pass.category.charAt(0).toUpperCase() + pass.category.slice(1)} Pass
                          </span>
                        } />
                        <InfoField label="Organization" value={pass.organization} />
                        <InfoField label="Security Clearance" value={
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-700 rounded-md text-sm font-medium">
                            🛡️ {formatSecurityClearance(pass.securityClearance)}
                          </span>
                        } />
                        <InfoField label="Issue Date" value={formatDateSafely(pass.dateOfEntry)} />
                        <InfoField label="Expiry Date" value={
                          <span className={isPassExpired ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {formatDateSafely(pass.dateOfExpiry)}
                          </span>
                        } />
                        <div></div>
                        <div className="sm:col-span-2 lg:col-span-3">
                          <InfoField label="Authorized Access Areas" value={
                            <div className="flex flex-wrap gap-2 mt-2">
                              {pass.areaAllowed.map(area => (
                                <span key={area} className="px-3 py-1 text-sm font-medium bg-gradient-to-r from-slate-100 to-blue-50 text-slate-700 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                  📍 {area}
                                </span>
                              ))}
                            </div>
                          } />
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}