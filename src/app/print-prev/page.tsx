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


// --- DESIGN FOR 2027 AND LATER: YELLOW HORIZONTAL (UPDATED) ---
// Card size: 3.370in wide (85.598mm) x 63.975mm tall, landscape.
// Width is the standard CR80 width; height is the CR80 height (53.975mm) + 10mm (1cm) taller.
// Works for both cargo and landside.
// All sizes below are in px at 96dpi, so the card is about 323.5px x 241.8px.
const YELLOW_2027 = '#ffd400';
const INK_2027 = '#111111';

// Shared outer shell for front and back (white inside, black outline, rounded corners)
const cardShell2027: React.CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  border: `2px solid ${INK_2027}`,
  borderRadius: '12px', // CR80 standard corner radius: 3.18mm (0.125in)
  background: '#ffffff',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Arial, sans-serif',
  color: INK_2027,
  lineHeight: 1.2,
};

const IDCardFront_2027 = ({ employee }: { employee: Employee }) => {
  const displayPassId = formatDisplayPassId(employee.passId);
  const functionaryYear = new Date(employee.dateOfExpiry).getFullYear();
  const qrCodeUrl = buildQrUrl(employee, functionaryYear);
  const headingText = employee.category === 'landside' ? 'JIAP KARACHI' : 'CARGO COMPLEX JIAP';

  return (
    <div style={cardShell2027}>
      {/* Header: title, subtitle stretched to the title width, year badge */}
      <div
        style={{
          boxSizing: 'border-box',
          height: '41px',
          flexShrink: 0,
          backgroundColor: YELLOW_2027,
          borderBottom: `3px solid ${INK_2027}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        <div style={{ display: 'inline-block', lineHeight: 1 }}>
          <div style={{ fontSize: '15.5px', fontWeight: 800, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            {headingText}
          </div>
          {/* width:0 + minWidth:100% = subtitle never widens the title block, it justifies to the title width */}
          <div
            style={{
              width: 0,
              minWidth: '100%',
              marginTop: '3px',
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.34em',
              whiteSpace: 'nowrap',
              textAlign: 'justify',
              textAlignLast: 'justify',
            }}
          >
            AFU FUNCTIONARY PASS
          </div>
        </div>
        <div
          style={{
            backgroundColor: INK_2027,
            color: YELLOW_2027,
            fontSize: '17px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '4px',
            lineHeight: 1,
          }}
        >
          {functionaryYear}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 8px 0', minHeight: 0 }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, minHeight: 0 }}>
          {/* Photo frame: yellow pass number strip ABOVE the picture, so the full photo (head included) stays visible */}
          <div
            style={{
              boxSizing: 'border-box',
              width: '92px', // was 78px (bigger photo)
              height: '128px', // was 102px (bigger photo)
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              border: `2px solid ${INK_2027}`,
              borderRadius: '4px',
              backgroundColor: '#d9d9d9',
              overflow: 'hidden',
              boxShadow: `2px 2px 0 ${YELLOW_2027}`,
            }}
          >
            <div
              style={{
                boxSizing: 'border-box',
                height: '15px', // was 13px
                flexShrink: 0,
                backgroundColor: YELLOW_2027,
                borderBottom: `1.5px solid ${INK_2027}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: '5.5px', fontWeight: 700, letterSpacing: '0.2em' }}>PASS NO.</span>
              <span style={{ fontSize: '11px', fontWeight: 800 }}>{displayPassId}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {employee.photo ? (
                <Image
                  src={employee.photo}
                  alt={employee.name}
                  width={88}
                  height={113}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{ fontSize: '8px', textAlign: 'center', padding: '20px 4px 4px' }}>NO PHOTO</div>
              )}
            </div>
          </div>

          {/* Name (full width, wraps if long) and details beside the QR code */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '15px', // was 13.5px
                fontWeight: 800,
                textTransform: 'uppercase',
                lineHeight: 1.15,
                wordBreak: 'break-word',
                marginBottom: '6px', // was 4px
              }}
            >
              {employee.name}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '6px',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, wordBreak: 'break-word' }}>{employee.designation}</div>
                <div style={{ fontSize: '11.5px', color: '#333333', wordBreak: 'break-word' }}>{employee.organization}</div>
                <div style={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 700, marginTop: '2px' }}>
                  {employee.cnic}
                </div>
              </div>
            </div>

            {/* Area allowed + Valid upto on the same row (wraps if the area is long) */}
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  boxSizing: 'border-box',
                  maxWidth: '100%',
                  backgroundColor: INK_2027,
                  color: YELLOW_2027,
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '3px',
                  wordBreak: 'break-word',
                }}
              >
                {employee.areaAllowed?.join(' | ') || 'N/A'}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: YELLOW_2027,
                  border: `1px solid ${INK_2027}`,
                  borderRadius: '3px',
                  padding: '2px 5px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '5.5px', fontWeight: 700, letterSpacing: '0.16em' }}>VALID UPTO</span>
                <span style={{ width: '1px', height: '9px', backgroundColor: INK_2027 }} />
                <span style={{ fontSize: '10px', fontWeight: 800 }}>{formatDateUpper(employee.dateOfExpiry)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signature + valid upto (small, horizontal, yellow) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '2px 0 5px',
          }}
        >
          <div style={{ flex: 1, lineHeight: 1.15 }}>
            <div style={{ borderTop: `1px solid ${INK_2027}`, height: '10px' }} />
            <div style={{ fontSize: '6.5px', fontWeight: 700 }}>Signature of Issuing Officer</div>
            <div style={{ fontSize: '6px', color: '#444444' }}>Joint Director Vigilance, PAA JIAP Karachi</div>
          </div>
          {/* QR code: bottom right, in place of the old VALID UPTO box */}
          <div style={{ width: '30px', height: '30px', flexShrink: 0, marginRight: '4px' }}>
            <QRCodeSVG value={qrCodeUrl} size={80} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: YELLOW_2027,
          borderTop: `3px solid ${INK_2027}`,
          textAlign: 'center',
          fontSize: '6.5px',
          fontWeight: 700,
          padding: '3px 0',
        }}
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
    <div style={cardShell2027}>
      {/* Header */}
      <div
        style={{
          boxSizing: 'border-box',
          height: '29px',
          flexShrink: 0,
          backgroundColor: YELLOW_2027,
          borderBottom: `3px solid ${INK_2027}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.22em' }}>INSTRUCTIONS</div>
        <div
          style={{
            backgroundColor: INK_2027,
            color: YELLOW_2027,
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '3px',
            lineHeight: 1,
          }}
        >
          {functionaryYear}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '5px 8px 0', minHeight: 0 }}>
        {/* Barcode panel with larger readable text */}
        <div
          className="barcode-2027"
          style={{
            boxSizing: 'border-box',
            width: '100%',
            backgroundColor: '#ffffff',
            border: `1px solid ${INK_2027}`,
            borderRadius: '4px',
            padding: '2px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <Barcode value={barcodeData} width={0.5} height={19} format="CODE128" displayValue={false} margin={0} />
          <div
            style={{
              maxWidth: '100%',
              fontSize: '7.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              lineHeight: 1,
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {barcodeData}
          </div>
        </div>

        {/* Notice */}
        <div style={{ marginTop: '4px' }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: INK_2027,
              color: YELLOW_2027,
              borderRadius: '3px',
              fontSize: '7.5px',
              fontWeight: 700,
              padding: '2px 7px',
            }}
          >
            Pass holder is not PAA/Govt employee
          </span>
        </div>

        {/* Instructions (slightly larger to use the extra card height) */}
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {instructions.map((text, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span
                style={{
                  boxSizing: 'border-box',
                  width: '10px',
                  height: '10px',
                  flexShrink: 0,
                  borderRadius: '3px',
                  backgroundColor: YELLOW_2027,
                  border: `1px solid ${INK_2027}`,
                  fontSize: '6px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: '8px', lineHeight: '11.5px', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Date of issue (Date of Entry from the database) */}
        <div
          style={{
            marginTop: 'auto',
            marginBottom: '4px',
            display: 'flex',
            width: 'fit-content',
            border: `1.5px solid ${INK_2027}`,
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              backgroundColor: YELLOW_2027,
              fontSize: '6.5px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              padding: '0 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            DATE OF ISSUE
          </span>
          <span
            style={{
              backgroundColor: '#ffffff',
              fontSize: '9px',
              fontWeight: 800,
              padding: '1px 8px',
              minWidth: '70px',
            }}
          >
            {employee.dateOfEntry ? formatDateUpper(employee.dateOfEntry) : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: YELLOW_2027,
          borderTop: `3px solid ${INK_2027}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3px 8px',
        }}
      >
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: '5.5px', fontWeight: 700, letterSpacing: '0.14em' }}>
            FOUND THIS PASS? REPORT IMMEDIATELY TO
          </div>
          <div style={{ fontSize: '8px', fontWeight: 800 }}>Vigilance Branch, JIAP Karachi</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '7.5px', fontWeight: 700, lineHeight: 1.2 }}>
          <div>021-99071420</div>
          <div>021-99071468</div>
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
    // Mirrored columns for double-sided printing: 2 columns (2027 horizontal and portrait)
    const positions = isLandscape ? [1, 0, 3, 2, 5, 4] : [1, 0, 3, 2, 5, 4];
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
        /* ============================================================
           PRINT SETTINGS
           ============================================================ */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .print-page,
        .print-card,
        .print-card-placeholder {
          box-sizing: border-box;
        }

        /* ============================================================
           2027 HORIZONTAL PASS
           PASS SIZE:
           3.370in horizontal (85.598mm) x 63.975mm vertical
           (standard CR80 height 53.975mm + 10mm = 1cm taller)

           A4 LANDSCAPE:
           297mm x 210mm

           SHEET:
           2 columns x 3 rows = 6 passes
           Height used: 3 x 63.975mm + 2 x 4mm gap = about 199.9mm
           ============================================================ */

        .print-page.landscape-cards {
          width: 297mm;
          height: 210mm;
          display: grid;
          grid-template-columns: repeat(2, 3.370in);
          grid-template-rows: repeat(3, 63.975mm);
          column-gap: 12mm;
          row-gap: 4mm;
          justify-content: center;
          align-content: center;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
        }

        .print-page.landscape-cards .print-card,
        .print-page.landscape-cards .print-card-placeholder {
          width: 3.370in !important;
          height: 63.975mm !important;
          min-width: 3.370in !important;
          max-width: 3.370in !important;
          min-height: 63.975mm !important;
          max-height: 63.975mm !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
          overflow: hidden;
        }

        .print-page.landscape-cards .print-card > div {
          width: 3.370in !important;
          height: 63.975mm !important;
          min-width: 3.370in !important;
          max-width: 3.370in !important;
          min-height: 63.975mm !important;
          max-height: 63.975mm !important;
          margin: 0 !important;
          box-sizing: border-box;
        }

        ${isLandscape ? `
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          /*
           * PRINT ONLY:
           * Hide the complete application/UI. Only .print-root is visible.
           */
          body * {
            visibility: hidden !important;
          }

          .print-root,
          .print-root * {
            visibility: visible !important;
          }

          html,
          body {
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            overflow: hidden !important;
          }

          .no-print {
            display: none !important;
          }

          .print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .print-area {
            width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /*
           * Page 1 = FRONT
           * Page 2 = BACK
           * Both pages use exactly the same physical card positions.
           */
          .print-page.landscape-cards {
            width: 297mm !important;
            height: 210mm !important;

            display: grid !important;

            grid-template-columns:
              repeat(2, 3.370in) !important;

            grid-template-rows:
              repeat(3, 63.975mm) !important;

            column-gap: 12mm !important;
            row-gap: 4mm !important;

            justify-content: center !important;
            align-content: center !important;

            margin: 0 !important;
            padding: 0 !important;

            box-sizing: border-box !important;

            page-break-after: always !important;
            break-after: page !important;
          }

          .print-page.landscape-cards.back-page {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-page.landscape-cards .print-card,
          .print-page.landscape-cards .print-card-placeholder {
            width: 3.370in !important;
            height: 63.975mm !important;

            min-width: 3.370in !important;
            max-width: 3.370in !important;

            min-height: 63.975mm !important;
            max-height: 63.975mm !important;

            margin: 0 !important;
            padding: 0 !important;

            box-sizing: border-box !important;
            overflow: hidden !important;
          }

          .print-page.landscape-cards .print-card > div {
            width: 3.370in !important;
            height: 63.975mm !important;

            min-width: 3.370in !important;
            max-width: 3.370in !important;

            min-height: 63.975mm !important;
            max-height: 63.975mm !important;

            margin: 0 !important;
            box-sizing: border-box !important;
          }

          /*
           * Prevent the browser from applying an automatic transform
           * or scaling to the card itself.
           */
          .print-card {
            transform: none !important;
            zoom: 1 !important;
          }

          .barcode-2027 svg {
            max-width: 100%;
            height: auto;
          }
        }
        ` : ''}
        .barcode-2027 svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
