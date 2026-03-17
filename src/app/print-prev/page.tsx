// /app/print-cards/page.tsx
"use client";

import React, { useState, FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import Image from 'next/image';

interface Employee {
  _id: string;
  passId: number;
  name: string;
  designation: string;
  organization: string;
  cnic: string;
  dateOfExpiry: string;
  category: 'cargo' | 'landside';
  photo?: string | null;
  areaAllowed?: string[];
}

const formatDisplayPassId = (pid: number): string => String(pid).padStart(4, '0');
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// --- DESIGN FOR 2025 AND EARLIER (UNCHANGED) ---
const IDCardFront_2025 = ({ employee }: { employee: Employee }) => {
    const displayPassId = formatDisplayPassId(employee.passId);
    const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const qrCodeUrl = `${baseUrl}/${employee.category}-id/${employee.passId}?year=${functionaryYear}`;
    const headingText = employee.category === 'landside' ? "JINNAH INT'L AIRPORT" : "CARGO COMPLEX";
    return (
        <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: "Arial, sans-serif", border: '2px solid black' }}>
            <div className="text-center text-white" style={{ backgroundColor: 'rgb(47, 117, 181)' }}><p className="font-bold text-[23px] leading-tight">{headingText}</p></div>
            <div className="text-center font-bold" style={{ backgroundColor: 'rgb(47, 117, 181)', color: 'rgb(255, 192, 0)', fontSize: '22px' }}><p>FUNCTIONARY {functionaryYear}</p></div>
            <div className="flex-1 flex flex-col bg-white p-1 relative">
                <div className="flex justify-between items-start">
                    <div className="border border-gray-200 rounded overflow-hidden" style={{ width: '28mm', height: '30mm' }}>
                        {employee.photo ? <Image src={employee.photo} alt={employee.name} width={106} height={113} style={{ width: '100%', height: '100%', objectFit: "cover" }} /> : <div className="text-xs text-center p-1">NO PHOTO</div>}
                    </div>
                    <div className="mt-1" style={{ width: '25mm', height: '24mm' }}>
                        <QRCodeSVG value={qrCodeUrl} size={80} style={{ width: '100%', height: '100%' }} />
                    </div>
                </div>
                <div className="text-center text-white font-bold mt-1" style={{ backgroundColor: 'rgb(47, 117, 181)', fontSize: '22px' }}><p>{employee.areaAllowed?.join(' | ') || 'N/A'}</p></div>
                <div className="text-center flex-grow flex flex-col leading-tight mt-1">
                    <p className="font-bold text-[15px]">{employee.name}</p>
                    <p className="font-medium text-[13px]">{employee.designation}</p>
                    <p className="font-medium text-[13px]">{employee.organization}</p>
                    <p className="font-medium text-[13px]">{employee.cnic}</p>
                </div>
                <div className="flex justify-center items-end pt-1">
                    <div className="text-center flex-1 leading-tight">
                        <p className="font-bold text-[13px]">Dy. Director Vigilance</p>
                        <p className="text-[10px] leading-tight">Pakistan Airports Authority</p>
                        <p className="text-[10px] leading-tight">JIAP - Karachi</p>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0">
                    <div className="bg-yellow-400 font-bold px-5 text-center text-[16px]">PASS ID</div>
                    <div className="font-bold px-1 border border-black border-t-0 text-center text-[17px]">{displayPassId}</div>
                </div>
            </div>
        </div>
    );
};
const IDCardBack_2025 = ({ employee }: { employee: Employee }) => {
    const barcodeData = `${formatDisplayPassId(employee.passId)}-${new Date(employee.dateOfExpiry).getFullYear()}`;
    return (
        <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: "Arial, sans-serif", border: '2px solid black', fontSize: '8px' }}>
            <div className="flex flex-col items-center border-b border-black py-1"><Barcode value={barcodeData} width={0.95} height={20} format="CODE128" displayValue={true} fontSize={11} /></div>
            <div className="text-center border-b border-black"><p className="text-black font-bold text-[18px]">Date of Expiry</p></div>
            <div className="text-center border-b border-black"><p className="text-black font-bold text-[18px]">{formatDate(employee.dateOfExpiry)}</p></div>
            <div className="flex items-center justify-between text-black px-1"><div className="w-13 h-9 flex items-center"><Image src="/logo.png" alt="Logo" width={52} height={36} className="object-contain" /></div><p className="text-center flex-grow text-[24px] font-bold">INSTRUCTIONS</p><div style={{ width: '52px' }}></div></div>
            <div className="text-center bg-yellow-400 border-y border-black"><p className="text-black font-bold text-[11px]">Pass holder is not PAA/Govt employee</p></div>
            <div className="flex-1 flex flex-col text-justify font-bold py-1 leading-tight"><div className="space-y-0.5 px-1"><p className="flex items-start text-[11px]"><span className="mr-1 text-[9px]">➤</span>Pass is only valid if display.</p><p className="flex items-start text-[11px]"><span className="mr-1 text-[9px]">➤</span>Pass holder is not exempted from body/baggage search.</p><p className="flex items-start text-[11px]"><span className="mr-1 text-[9px]">➤</span>Do not utilize for other than specified area of Validity / Route indicated in this Pass.</p><p className="flex items-start text-[11px]"><span className="mr-1 text-[9px]">➤</span>Pass is liable to be cancelled if misused / photo copied / utilized for any other department/individual.</p><p className="flex items-start text-[11px]"><span className="mr-1 text-[9px]">➤</span>Must be surrendered immediately on relinquishing charge of the post for which issued.</p></div><div className="mt-auto text-[13px] py-1 bg-gray-800 text-white text-center"><p className="font-semibold leading-tight">If found report immediately to </p><p className="leading-tight">Vigilance Branch JIAP Karachi</p><p className="font-bold leading-tight">021-99071420 & 99071468</p></div></div>
        </div>
    );
};


// --- DESIGN FOR 2026 AND LATER (UPDATED LAYOUT) ---
const IDCardFront_2026 = ({ employee }: { employee: Employee }) => {
  const displayPassId = formatDisplayPassId(employee.passId);
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const qrCodeUrl = `${baseUrl}/${employee.category}-id/${employee.passId}?year=${functionaryYear}`;
  const headingText =
    employee.category === "landside" ? "JIAP KARACHI" : "CARGO COMPLEX";

  return (
    <div
      className="w-full h-full bg-white flex flex-col"
      style={{ fontFamily: "Arial, sans-serif", border: "2px solid black" }}
    >
      <div
        className="text-center text-white font-bold leading-tight"
        style={{ backgroundColor: "#006400", fontSize: "23px" }}
      >
        <p>{headingText}</p>
      </div>

      <div
        className="text-center font-bold"
        style={{
          backgroundColor: "#006400",
          color: "#FFD700",
          fontSize: "20px",
          whiteSpace: "nowrap",
        }}
      >
        <p>VALID UPTO {formatDate(employee.dateOfExpiry)}</p>
      </div>

      {/* Main Card Content */}
      <div className="flex-1 flex flex-col bg-white p-1 relative">
        <div className="flex justify-between items-start">
          {/* QR Code (kept in previous position) */}
          <div className="flex flex-col mt-2 items-center" style={{ width: "25mm" }}>
            <div style={{ width: "25mm", height: "24mm" }}>
              <QRCodeSVG
                value={qrCodeUrl}
                size={90}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* Photo */}
          <div className="relative" style={{ width: "30mm", height: "30mm" }}>
            <div className="border border-gray-200 rounded overflow-hidden w-full h-full">
              {employee.photo ? (
                <Image
                  src={employee.photo}
                  alt={employee.name}
                  width={106}
                  height={113}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="text-xs text-center p-1">NO PHOTO</div>
              )}
            </div>
          </div>
        </div>

        {/* Area Allowed */}
        <div
          className="text-center text-white font-bold leading-tight"
          style={{ backgroundColor: "#006400", fontSize: "22px" }}
        >
          <p>{employee.areaAllowed?.join(" | ") || "N/A"}</p>
        </div>

        {/* Person Info */}
        <div className="text-center flex-grow flex flex-col leading-tight mt-1">
          <div>
            <p className="font-bold text-[15px]">{employee.name}</p>
            <p className="font-medium text-[13px]">{employee.designation}</p>
            <p className="font-medium text-[13px]">{employee.organization}</p>
            <p className="font-medium text-[13px]">{employee.cnic}</p>
          </div>

          <div className="mt-auto text-right leading-tight">
            <p className="font-bold text-[13px]">Dy. Director Vigilance</p>
            <p className="text-[10px] leading-tight">
              Pakistan Airports Authority
            </p>
            <p className="text-[10px] leading-tight">JIAP - Karachi</p>
          </div>
        </div>

        {/* Pass ID */}
        <div className="absolute bottom-0 left-0">
          <div
            style={{ backgroundColor: "#FFD700" }}
            className="font-bold px-5 text-center text-[16px]"
          >
            PASS ID
          </div>
          <div className="font-bold px-1 border border-black border-t-0 text-center text-[17px]">
            {displayPassId}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- UPDATED BACK SIDE (FUNCTIONARY + YEAR MOVED HERE) ---
const IDCardBack_2026 = ({ employee }: { employee: Employee }) => {
  const barcodeData = `${formatDisplayPassId(employee.passId)} | ${employee.name} | ${employee.cnic}`;
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();

  return (
    <div
      className="w-full h-full bg-white flex flex-col"
      style={{
        fontFamily: "Arial, sans-serif",
        border: "2px solid black",
        fontSize: "8px",
      }}
    >
      {/* Top: FUNCTIONARY & YEAR */}
      <div
        className="text-center font-bold text-white py-1"
        style={{ backgroundColor: "red", fontSize: "16px", lineHeight: "1.2" }}
      >
        <p>FUNCTIONARY {functionaryYear}</p>
      </div>

      {/* Barcode */}
      <div className="flex flex-col items-center border-b border-black py-0">
        <Barcode
          value={barcodeData}
          width={0.8}
          height={25}
          format="CODE128"
          displayValue={true}
          fontSize={8}
        />
      </div>

      {/* Header Row */}
      <div className="flex items-center justify-between text-black px-1 mt-0">
        <div className="w-13 h-9 flex items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={52}
            height={36}
            className="object-contain"
          />
        </div>
        <p className="text-center flex-grow text-[24px] font-bold">
          INSTRUCTIONS
        </p>
        <div style={{ width: "52px" }}></div>
      </div>

      {/* Notice */}
      <div
        className="text-center border-y border-black"
        style={{ backgroundColor: "#FFD700" }}
      >
        <p className="text-black font-bold text-[11px]">
          Pass holder is not PAA/Govt employee
        </p>
      </div>

      {/* Instructions */}
      <div className="flex-1 flex flex-col text-justify font-bold leading-tight">
        <div className="space-y-0.5 px-1">
          <p className="flex items-start text-[11px]">
            <span className="mr-1 text-[9px]">➤</span>Pass is only valid if
            display.
          </p>
          <p className="flex items-start text-[11px]">
            <span className="mr-1 text-[9px]">➤</span>Pass holder is not
            exempted from body/baggage search.
          </p>
          <p className="flex items-start text-[11px]">
            <span className="mr-1 text-[9px]">➤</span>Do not utilize for other
            than specified area of Validity / Route indicated in this Pass.
          </p>
          <p className="flex items-start text-[11px]">
            <span className="mr-1 text-[9px]">➤</span>Pass is liable to be
            cancelled if misused / photo copied / utilized for any other
            department/individual.
          </p>
          <p className="flex items-start text-[11px]">
            <span className="mr-1 text-[9px]">➤</span>Must be surrendered
            immediately on relinquishing charge of the post for which issued.
          </p>
        </div>

        {/* Contact Info */}
        <div
          className="mt-auto text-[13px] py-1 text-white text-center"
          style={{ backgroundColor: "#006400" }}
        >
          <p className="font-semibold leading-tight">
            If found report immediately to
          </p>
          <p className="leading-tight">Vigilance Branch JIAP Karachi</p>
          <p className="font-bold leading-tight">021-99071420 & 99071468</p>
        </div>
      </div>
    </div>
  );
};


export default function PrintCardsPage() {
  const [passIdsInput, setPassIdsInput] = useState('');
  const [category, setCategory] = useState<'cargo' | 'landside'>('cargo');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [employeesToPrint, setEmployeesToPrint] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFetchCards = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccessMessage(null); setEmployeesToPrint([]);
    const tokens = passIdsInput.split(/[\s,]+/).filter(Boolean);
    const expandedIds: string[] = [];
    tokens.forEach(token => {
      if (token.includes('-')) {
        const [start, end] = token.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) for (let i = start; i <= end; i++) expandedIds.push(i.toString());
        else { setError(`Invalid range: "${token}"`); setLoading(false); return; }
      } else if (!isNaN(Number(token))) expandedIds.push(token);
    });
    const uniqueIds = Array.from(new Set(expandedIds));
    if (uniqueIds.length === 0) { setError('Please enter at least one valid Pass ID.'); setLoading(false); return; }
    if (uniqueIds.length > 6) { setError('You can print a maximum of 6 cards at a time.'); setLoading(false); return; }
    try {
      const response = await fetch('/api/get-passes-by-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passIds: uniqueIds, category, year }) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Failed to fetch card data.'); }
      const { employees, notFoundIds, totalFound } = await response.json();
      setEmployeesToPrint(employees.map((e: Employee) => ({...e, passId: Number(e.passId)})));
      setSuccessMessage(`Successfully loaded ${totalFound} ${category} pass(es) for the year ${year}.`);
      if (notFoundIds?.length > 0) setError(`Warning: The following IDs were not found for '${category}' in ${year}: ${notFoundIds.join(', ')}`);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unknown error occurred.'); } 
    finally { setLoading(false); }
  };
  
  const handleCategoryChange = (newCategory: 'cargo' | 'landside') => {
    setCategory(newCategory); setEmployeesToPrint([]); setError(null); setSuccessMessage(null); setPassIdsInput('');
  };
  
  const availableYears = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() + i).toString());

  const selectedYearNumber = parseInt(year, 10);
  const CardFront = selectedYearNumber >= 2026 ? IDCardFront_2026 : IDCardFront_2025;
  const CardBack = selectedYearNumber >= 2026 ? IDCardBack_2026 : IDCardBack_2025;
  
  const frontSideSlots = Array(6).fill(null).map((_, i) => employeesToPrint[i] || ({ _id: `ph-f-${i}` } as Employee));
  const arrangedBackSide = (() => {
    const result: (Employee | null)[] = Array(6).fill(null);
    const positions = [1, 0, 3, 2, 5, 4];
    employeesToPrint.forEach((employee, index) => { if(index < 6) result[positions[index]] = employee; });
    return result;
  })();

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="no-print p-4 bg-white shadow-md">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Generate ID Cards for Printing</h1>
            <form onSubmit={handleFetchCards} className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select id="year" value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select id="category" value={category} onChange={(e) => handleCategoryChange(e.target.value as 'cargo' | 'landside')} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="cargo">Cargo Pass</option>
                        <option value="landside">Landside Pass</option>
                    </select>
                </div>
                <div className="flex-grow w-full">
                    <label htmlFor="passIds" className="block text-sm font-medium text-gray-700 mb-1">Enter Pass IDs (up to 6)</label>
                    <textarea id="passIds" value={passIdsInput} onChange={(e) => setPassIdsInput(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g. 1, 2, 3 or 1-3" />
                </div>
                <div className="flex items-center gap-4">
                    <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">{loading ? 'Fetching...' : 'Fetch Cards'}</button>
                    <button type="button" onClick={() => window.print()} disabled={employeesToPrint.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">Print</button>
                </div>
            </form>
            {successMessage && !error && <div className="mt-3 p-3 bg-green-100 text-green-700 rounded">{successMessage}</div>}
            {error && <div className="mt-3 p-3 bg-yellow-100 text-yellow-800 rounded">{error}</div>}
        </div>
      </header>
      <main className="print-root">
        {employeesToPrint.length > 0 && (
          <div className="print-area">
            <div className="print-page front-page">
              {frontSideSlots.map((employee, index) => (
                employee.passId ? (
                  <div key={`${employee._id}-front-${index}`} className="print-card"><CardFront employee={employee} /></div>
                ) : <div key={`ph-f-${index}`} className="print-card-placeholder"></div>
              ))}
            </div>
            <div className="print-page back-page">
              {arrangedBackSide.map((employee, index) => (
                employee ? (
                  <div key={`${employee._id}-back-${index}`} className="print-card"><CardBack employee={employee} /></div>
                ) : <div key={`ph-b-${index}`} className="print-card-placeholder"></div>
              ))}
            </div>
          </div>
        )}
      </main>
      <style jsx global>{`
        /* ... Your print CSS is correct and unchanged ... */
      `}</style>
    </div>
  );
}
