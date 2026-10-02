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
  dateOfEntry?: string | null; // Date of Entry in the database = Date of Issue printed on the 2027 card back
  category: 'cargo' | 'landside';
  photo?: string | null;
  areaAllowed?: string[];
}

const formatDisplayPassId = (pid: number): string => String(pid).padStart(4, '0');
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const formatDateUpper = (dateString: string) => formatDate(dateString).replace(/\./g, '').toUpperCase();

// Shared helper so every design builds the QR link the same way
const buildQrUrl = (employee: Employee, year: number) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}/${employee.category}-id/${employee.passId}?year=${year}`;
};

// --- DESIGN FOR 2025 AND EARLIER (UNCHANGED) ---
const IDCardFront_2025 = ({ employee }: { employee: Employee }) => {
    const displayPassId = formatDisplayPassId(employee.passId);
    const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
    const qrCodeUrl = buildQrUrl(employee, functionaryYear);
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
                        <p className="font-bold text-[13px]">Joint Director Vigilance</p>
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


// --- DESIGN FOR 2026 (UNCHANGED) ---
const IDCardFront_2026 = ({ employee }: { employee: Employee }) => {
  const displayPassId = formatDisplayPassId(employee.passId);
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const qrCodeUrl = buildQrUrl(employee, functionaryYear);
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

      <div className="flex-1 flex flex-col bg-white p-1 relative">
        <div className="flex justify-between items-start">
          <div className="flex flex-col mt-2 items-center" style={{ width: "25mm" }}>
            <div style={{ width: "25mm", height: "24mm" }}>
              <QRCodeSVG
                value={qrCodeUrl}
                size={90}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>

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

        <div
          className="text-center text-white font-bold leading-tight"
          style={{ backgroundColor: "#006400", fontSize: "22px" }}
        >
          <p>{employee.areaAllowed?.join(" | ") || "N/A"}</p>
        </div>

        <div className="text-center flex-grow flex flex-col leading-tight mt-1">
          <div>
            <p className="font-bold text-[15px]">{employee.name}</p>
            <p className="font-medium text-[13px]">{employee.designation}</p>
            <p className="font-medium text-[13px]">{employee.organization}</p>
            <p className="font-medium text-[13px]">{employee.cnic}</p>
          </div>

          <div className="mt-auto text-right leading-tight">
            <p className="font-bold text-[13px]">Joint Director Vigilance</p>
            <p className="text-[10px] leading-tight">
              Pakistan Airports Authority
            </p>
            <p className="text-[10px] leading-tight">JIAP - Karachi</p>
          </div>
        </div>

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
      <div
        className="text-center font-bold text-white py-1"
        style={{ backgroundColor: "red", fontSize: "16px", lineHeight: "1.2" }}
      >
        <p>FUNCTIONARY {functionaryYear}</p>
      </div>

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

      <div
        className="text-center border-y border-black"
        style={{ backgroundColor: "#FFD700" }}
      >
        <p className="text-black font-bold text-[11px]">
          Pass holder is not PAA/Govt employee
        </p>
      </div>

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


// --- DESIGN FOR 2027 AND LATER: YELLOW HORIZONTAL (NEW) ---
// Landscape card, 86mm x 54mm. Works for both cargo and landside.
const YELLOW_2027 = '#ffd400';

const IDCardFront_2027 = ({ employee }: { employee: Employee }) => {
  const displayPassId = formatDisplayPassId(employee.passId);
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const qrCodeUrl = buildQrUrl(employee, functionaryYear);
  const headingText = employee.category === 'landside' ? 'JIAP KARACHI' : 'CARGO COMPLEX JIAP';

  return (
    <div
      className="w-full h-full bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Arial, sans-serif', border: '2px solid black', borderRadius: '6px', color: '#000' }}
    >
      {/* Header */}
      <div
        className="flex items-end justify-between px-2 py-0.5"
        style={{ backgroundColor: YELLOW_2027, borderBottom: '3px solid black' }}
      >
        <div className="leading-none">
          <p className="font-black text-[17px] tracking-wide leading-none">{headingText}</p>
          <p className="font-bold text-[7px] mt-0.5" style={{ letterSpacing: '0.18em' }}>
            AFU FUNCTIONARY PASS
          </p>
        </div>
        <p className="font-black text-[24px] leading-none">{functionaryYear}</p>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-2 pt-1.5 min-h-0">
        <div className="flex gap-2 flex-1 min-h-0">
          {/* Photo */}
          <div
            className="shrink-0 border border-gray-300 overflow-hidden"
            style={{ width: '22mm', height: '26mm', backgroundColor: '#e5e5e5' }}
          >
            {employee.photo ? (
              <Image
                src={employee.photo}
                alt={employee.name}
                width={83}
                height={98}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="text-[8px] text-center p-1">NO PHOTO</div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col leading-tight">
            <p className="font-black text-[12px] leading-tight break-words">{employee.name}</p>
            <p className="text-[8.5px] leading-tight break-words">{employee.designation}</p>
            <p className="text-[8.5px] leading-tight break-words">{employee.organization}</p>
            <p className="text-[8.5px] leading-tight">{employee.cnic}</p>
            <div className="mt-auto">
              <span
                className="inline-block font-black text-[9px] px-1"
                style={{ backgroundColor: YELLOW_2027, border: '1.5px solid black' }}
              >
                {employee.areaAllowed?.join(' | ') || 'N/A'}
              </span>
            </div>
          </div>

          {/* Valid upto + QR */}
          <div className="shrink-0 flex flex-col items-center gap-1" style={{ width: '17mm' }}>
            <div
              className="w-full text-center leading-none py-0.5"
              style={{ backgroundColor: YELLOW_2027, border: '1.5px solid black' }}
            >
              <p className="font-bold text-[5.5px]" style={{ letterSpacing: '0.2em' }}>VALID UPTO</p>
              <p className="font-black text-[8px] whitespace-nowrap">{formatDateUpper(employee.dateOfExpiry)}</p>
            </div>
            <div style={{ width: '17mm', height: '17mm' }}>
              <QRCodeSVG value={qrCodeUrl} size={80} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </div>

        {/* Signature + Pass No */}
        <div className="flex items-end justify-between gap-2 pb-1 pt-0.5">
          <div className="flex-1 leading-tight">
            <div style={{ borderTop: '1px solid black', height: '10px' }} />
            <p className="font-bold text-[6.5px]">Signature of Issuing Officer</p>
            <p className="text-[6.5px]">Joint Director Vigilance, PAA JIAP Karachi</p>
          </div>
          <div className="text-center leading-none px-2 py-0.5" style={{ border: '1.5px solid black' }}>
            <p className="font-bold text-[5.5px]" style={{ letterSpacing: '0.2em' }}>PASS NO.</p>
            <p className="font-black text-[14px]">{displayPassId}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center font-bold text-[6.5px] py-0.5"
        style={{ backgroundColor: YELLOW_2027, borderTop: '3px solid black' }}
      >
        Pakistan Airports Authority · Vigilance Branch · JIAP Karachi
      </div>
    </div>
  );
};

const IDCardBack_2027 = ({ employee }: { employee: Employee }) => {
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const barcodeData = `${formatDisplayPassId(employee.passId)} | ${employee.name} | ${employee.cnic}`;
  const instructions = [
    'Valid only when worn and displayed.',
    'Holder is not exempt from body or baggage search.',
    'Use only in the area and route of validity shown on this pass.',
    'Misuse, photocopying or use by any other person or department leads to cancellation.',
    'Surrender immediately on leaving the post for which it was issued.',
  ];

  return (
    <div
      className="w-full h-full bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Arial, sans-serif', border: '2px solid black', borderRadius: '6px', color: '#000' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-0.5"
        style={{ backgroundColor: YELLOW_2027, borderBottom: '3px solid black' }}
      >
        <p className="font-black text-[13px]" style={{ letterSpacing: '0.12em' }}>INSTRUCTIONS</p>
        <p className="font-black text-[9px] px-1.5" style={{ backgroundColor: 'black', color: YELLOW_2027 }}>
          {functionaryYear}
        </p>
      </div>

      <div className="flex-1 flex flex-col px-2 pt-1 min-h-0">
        {/* Barcode */}
        <div className="barcode-2027 w-full flex flex-col items-center overflow-hidden">
          <Barcode value={barcodeData} width={0.5} height={22} format="CODE128" displayValue={false} margin={0} />
          <p className="text-[5.5px] leading-none mt-0.5 font-mono">{barcodeData}</p>
        </div>

        {/* Notice */}
        <div className="mt-1">
          <span className="inline-block font-bold text-[7px] px-1.5 py-0.5" style={{ backgroundColor: 'black', color: YELLOW_2027 }}>
            Pass holder is not PAA/Govt employee
          </span>
        </div>

        {/* Instructions */}
        <div className="mt-1 space-y-[2px]">
          {instructions.map((text, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span
                className="shrink-0 font-black text-[6.5px] w-[10px] h-[10px] flex items-center justify-center"
                style={{ backgroundColor: YELLOW_2027 }}
              >
                {i + 1}
              </span>
              <p className="text-[6.5px] leading-[10px]">{text}</p>
            </div>
          ))}
        </div>

        {/* Date of issue */}
        <div className="mt-auto mb-1 flex items-stretch w-fit" style={{ border: '1.5px solid ' + YELLOW_2027 }}>
          <span className="font-black text-[6.5px] px-1.5 flex items-center" style={{ backgroundColor: YELLOW_2027, letterSpacing: '0.1em' }}>
            DATE OF ISSUE
          </span>
          <span className="font-black text-[9px] px-2 min-w-[22mm]">
            {employee.dateOfEntry ? formatDateUpper(employee.dateOfEntry) : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-2 py-0.5"
        style={{ backgroundColor: YELLOW_2027, borderTop: '3px solid black' }}
      >
        <div className="leading-tight">
          <p className="font-bold text-[5.5px]" style={{ letterSpacing: '0.12em' }}>FOUND THIS PASS? REPORT IMMEDIATELY TO</p>
          <p className="font-black text-[8px]">Vigilance Branch, JIAP Karachi</p>
        </div>
        <div className="text-right leading-tight font-mono font-bold text-[7.5px]">
          <p>021-99071420</p>
          <p>021-99071468</p>
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
    // for...of (instead of forEach) so an invalid range really stops the request
    for (const token of tokens) {
      if (token.includes('-')) {
        const [start, end] = token.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) expandedIds.push(i.toString());
        } else { setError(`Invalid range: "${token}"`); setLoading(false); return; }
      } else if (!isNaN(Number(token))) expandedIds.push(token);
    }
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
  
  // Fixed range so older passes (2025) can still be reprinted: 2025 to 2030
  const availableYears = Array.from({ length: 6 }, (_, i) => (2025 + i).toString());

  // Pick the design by year: 2027+ yellow horizontal, 2026 green, 2025 and earlier blue
  const selectedYearNumber = parseInt(year, 10);
  const isLandscape = selectedYearNumber >= 2027;
  const CardFront =
    selectedYearNumber >= 2027 ? IDCardFront_2027 :
    selectedYearNumber >= 2026 ? IDCardFront_2026 : IDCardFront_2025;
  const CardBack =
    selectedYearNumber >= 2027 ? IDCardBack_2027 :
    selectedYearNumber >= 2026 ? IDCardBack_2026 : IDCardBack_2025;
  const pageClass = isLandscape ? 'landscape-cards' : '';
  
  const frontSideSlots = Array(6).fill(null).map((_, i) => employeesToPrint[i] || ({ _id: `ph-f-${i}` } as Employee));
  const arrangedBackSide = (() => {
    const result: (Employee | null)[] = Array(6).fill(null);
    const positions = [1, 0, 3, 2, 5, 4]; // mirrored columns for double-sided printing
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
            <div className={`print-page front-page ${pageClass}`}>
              {frontSideSlots.map((employee, index) => (
                employee.passId ? (
                  <div key={`${employee._id}-front-${index}`} className="print-card"><CardFront employee={employee} /></div>
                ) : <div key={`ph-f-${index}`} className="print-card-placeholder"></div>
              ))}
            </div>
            <div className={`print-page back-page ${pageClass}`}>
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
        /* ... KEEP YOUR EXISTING PRINT CSS HERE (unchanged) ... */

        /* --- 2027 landscape cards (86mm x 54mm), 2 columns x 3 rows per A4 page --- */
        .print-page.landscape-cards {
          display: grid;
          grid-template-columns: repeat(2, 86mm);
          grid-auto-rows: 54mm;
          gap: 6mm 4mm;
          justify-content: center;
          align-content: start;
        }
        .print-page.landscape-cards .print-card,
        .print-page.landscape-cards .print-card-placeholder {
          width: 86mm;
          height: 54mm;
        }
        .barcode-2027 svg { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}
