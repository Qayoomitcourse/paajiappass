// /app/scan-cards/page.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  X,
  Keyboard,
  Upload,
  User,
  ScanLine,
  Building2,
  Calendar,
  CreditCard,
  Phone,
  MapPin,
  FileBadge
} from "lucide-react";

// --- Types ---
interface PassData {
  _id: string;
  passId: number;
  name: string;
  designation?: string;
  organization?: string;
  cnic?: string;
  idNumber?: string;
  category?: "cargo" | "landside";
  year?: number;
  dateOfExpiry?: string;
  dateOfEntry?: string;
  areaAllowed?: string[];
  photo?: string;
  fatherName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  securityClearance?: string;
  permanentAddress?: string;
  presentAddress?: string;
}

interface ScanResult {
  status: "valid" | "invalid" | "expired" | "error";
  message: string;
  pass?: PassData;
}

export default function ScanCardsPage() {
  // --- State ---
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState<string>("");
  const [imageError, setImageError] = useState(false);

  // --- Refs ---
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const cameraIdRef = useRef<string | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedRef = useRef<string>("");

  // --- Audio Logic ---
  const playSound = useCallback((status: string) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const audioContext = new AudioContext();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      if (status === "valid") {
        osc.frequency.value = 800;
        osc.type = "sine";
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
      } else {
        osc.frequency.value = 150;
        osc.type = "sawtooth";
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(audioContext.currentTime + 0.3);
      }
    } catch (err) {
      console.warn("Audio not supported:", err);
    }
  }, []);

  // --- Helpers ---
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- Validation Logic ---
  const validatePass = useCallback((pass: PassData): ScanResult => {
    const issues: string[] = [];

    if (pass.dateOfExpiry) {
      const expiryDate = new Date(pass.dateOfExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        return {
          status: "expired",
          message: `Expired: ${formatDate(pass.dateOfExpiry)}`,
          pass,
        };
      }
    } else {
      issues.push("No expiry date");
    }

    if (!pass.name) issues.push("Missing name");
    if (!pass.passId) issues.push("Missing pass ID");
    if (!pass.category) issues.push("Missing category");
    if (!pass.organization) issues.push("Missing organization");

    if (!pass.idNumber && !pass.cnic) {
      issues.push("Missing ID number/CNIC");
    }

    if (issues.length > 0) {
      return {
        status: "invalid",
        message: `Incomplete: ${issues.join(", ")}`,
        pass,
      };
    }

    return {
      status: "valid",
      message: "Access Granted",
      pass,
    };
  }, []);

  // --- Scan Handling ---
  const handleScanInternal = useCallback(async (qrText: string) => {
    if (qrText === lastScannedRef.current || isScanningRef.current) {
      return;
    }

    lastScannedRef.current = qrText;
    isScanningRef.current = true;
    setIsScanning(true);
    setScanResult(null);
    setImageError(false);

    try {
      let passId = "";
      let category = "";
      let year = "";

      // 1. URL Parsing
      try {
        const url = new URL(qrText);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0].includes('-id')) {
          category = pathParts[0].replace('-id', '');
          passId = pathParts[1];
          year = url.searchParams.get('year') || new Date().getFullYear().toString();
        }
      } catch {}

      // 2. Barcode Parsing
      if (!passId) {
        if (qrText.includes(' | ')) {
          const parts = qrText.split(' | ');
          passId = parts[0].replace(/^0+/, '');
        } else if (qrText.includes('-')) {
          const parts = qrText.split('-');
          passId = parts[0].replace(/^0+/, '');
          year = parts[1] || '';
        } else {
          passId = qrText.trim();
        }
      }

      if (!passId) {
        throw new Error("Unable to extract Pass ID");
      }

      // 3. Fetch Data
      let foundPass: PassData | null = null;
      
      const fetchPass = async (c: string, y: string) => {
        const res = await fetch('/api/get-passes-by-ids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passIds: [passId], category: c, year: y })
        });
        const data = await res.json();
        return data.employees?.[0] || null;
      };

      if (category && year) {
        foundPass = await fetchPass(category, year);
      } else {
        const currentYear = new Date().getFullYear().toString();
        const cats = ['cargo', 'landside'];
        for (const cat of cats) {
          foundPass = await fetchPass(cat, year || currentYear);
          if (foundPass) break;
        }
      }

      if (foundPass) {
        const result = validatePass(foundPass);
        setScanResult(result);
        playSound(result.status);
      } else {
        const result: ScanResult = {
          status: "invalid",
          message: `ID ${passId} not found`,
        };
        setScanResult(result);
        playSound("invalid");
      }

    } catch (error) {
      console.error(error);
      setScanResult({
        status: "error",
        message: "Scan failed",
      });
      playSound("error");
    } finally {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        isScanningRef.current = false;
        lastScannedRef.current = "";
        setIsScanning(false);
      }, 3000);
    }
  }, [playSound, validatePass]);

  // --- Camera Management ---
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current.clear();
      }
    };
  }, []);

  const startCamera = async () => {
    if (!readerRef.current || isCameraActive) return;
    
    // Stop any existing instance first
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.log("No active scanner to stop");
      }
      html5QrcodeRef.current = null;
    }
    
    try {
      const html5Qrcode = new Html5Qrcode(readerRef.current.id, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        verbose: false,
      });
      html5QrcodeRef.current = html5Qrcode;
      const devices = await Html5Qrcode.getCameras();
      if (devices?.length) {
        const camId = devices.find(d => d.label.toLowerCase().includes("back"))?.id || devices[0].id;
        cameraIdRef.current = camId;
        await html5Qrcode.start(
          camId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleScanInternal,
          () => {}
        );
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error(err);
      alert("Camera error. Please try again.");
      html5QrcodeRef.current = null;
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (!html5QrcodeRef.current || !isCameraActive) return;
    
    try {
      await html5QrcodeRef.current.stop();
      html5QrcodeRef.current.clear();
      html5QrcodeRef.current = null;
      setIsCameraActive(false);
    } catch (err) {
      console.error("Error stopping camera:", err);
      // Force cleanup even if stop fails
      html5QrcodeRef.current = null;
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !readerRef.current) return;
    
    const file = e.target.files[0];
    
    // Stop camera if active
    if (isCameraActive && html5QrcodeRef.current) {
      try {
        await stopCamera();
        // Wait a bit for the camera to fully stop
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
    }
    
    try {
      const html5Qrcode = new Html5Qrcode(readerRef.current.id);
      const result = await html5Qrcode.scanFile(file, true);
      await handleScanInternal(result);
    } catch (err) {
      console.error("File scan error:", err);
      setScanResult({ status: "error", message: "Image scan failed" });
      playSound("error");
    }
  };

  const handleManualScan = () => {
    if (manualInput.trim()) {
      handleScanInternal(manualInput.trim());
      setManualInput("");
    }
  };

  // --- Styles ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid": return "bg-green-600";
      case "expired": return "bg-amber-500";
      case "invalid": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 opacity-90">
          <ScanLine className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-light">
            Security <span className="font-bold text-white">Scanner</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: SCANNER CONTROLS (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
              <div className="relative bg-black h-64 w-full flex items-center justify-center">
                <div id="reader" ref={readerRef} className="w-full h-full" />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Camera className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Camera inactive</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-800">
                <button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all ${
                    isCameraActive 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {isCameraActive ? "Stop Camera" : "Start Camera"}
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl">
              <div className="flex gap-2 mb-4">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                  placeholder="Pass ID / CNIC"
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleManualScan}
                  className="bg-slate-700 hover:bg-blue-600 text-white px-4 rounded-lg"
                >
                  Go
                </button>
              </div>
              
              <label className="flex items-center justify-center w-full px-4 py-3 border border-dashed border-slate-600 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors text-slate-400 hover:text-white">
                <Upload className="w-4 h-4 mr-2" />
                <span className="text-sm">Upload Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* RIGHT: RESULT DISPLAY (8 Columns) */}
          <div className="lg:col-span-8">
            {!scanResult ? (
              <div className="h-[400px] bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                <ScanLine className="w-16 h-16 mb-4 opacity-40" />
                <p className="text-xl font-light">Ready to Scan</p>
              </div>
            ) : (
              // --- CARD DESIGN START ---
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                
                {/* STATUS BANNER - FULL WIDTH TOP */}
                <div className={`w-full py-4 px-6 ${getStatusColor(scanResult.status)} text-white flex items-center justify-between shadow-lg`}>
                  <div className="flex items-center gap-3">
                    {scanResult.status === "valid" ? <CheckCircle2 className="w-8 h-8"/> : <XCircle className="w-8 h-8"/>}
                    <div>
                      <p className="font-black uppercase tracking-wider text-2xl">
                        {scanResult.status === "valid" ? "ACCESS GRANTED" : scanResult.status.toUpperCase()}
                      </p>
                      <p className="text-sm opacity-90 font-medium">{scanResult.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-75 uppercase font-bold">Pass ID</p>
                    <p className="text-3xl font-mono font-black">
                      {String(scanResult.pass?.passId || "----").padStart(4, "0")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row">
                  
                  {/* PHOTO SECTION */}
                  <div className="relative w-full md:w-2/5 bg-gradient-to-br from-gray-100 to-gray-200 min-h-[350px] md:min-h-[520px]">
                    {scanResult.pass?.photo && !imageError ? (
                      <Image
                        src={scanResult.pass.photo}
                        alt="Pass Holder"
                        fill
                        className="object-cover object-top"
                        onError={() => setImageError(true)}
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <User className="w-24 h-24 mb-3" />
                        <p className="text-lg font-medium">No Photo Available</p>
                      </div>
                    )}
                  </div>

                  {/* DETAILS SECTION */}
                  <div className="w-full md:w-3/5 p-6 md:p-8 bg-white">
                    
                    {/* NAME & DESIGNATION - PROMINENT */}
                    <div className="mb-6 pb-5 border-b-2 border-gray-200">
                      <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2">
                        {scanResult.pass?.name || "Unknown"}
                      </h2>
                      <p className="text-2xl text-slate-900 font-black">
                        {scanResult.pass?.designation || "Visitor"}
                      </p>
                    </div>

                    {/* ACCESS AREAS - PROMINENT AT TOP */}
                    {scanResult.pass?.areaAllowed && scanResult.pass.areaAllowed.length > 0 && (
                      <div className="mb-6 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-5 h-5 text-emerald-700" />
                          <span className="text-sm uppercase font-black text-emerald-950 tracking-wide">Authorized Access Areas</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {scanResult.pass.areaAllowed.map((area, i) => (
                            <span key={i} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-lg font-black border-2 border-emerald-700 shadow-md">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KEY INFORMATION GRID - LARGER TEXT */}
                    <div className="grid grid-cols-2 gap-5 mb-6">
                      
                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-xs uppercase font-black tracking-wide">Organization</span>
                        </div>
                        <p className="font-black text-slate-900 text-xl leading-tight">
                          {scanResult.pass?.organization || "N/A"}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                          <FileBadge className="w-4 h-4" />
                          <span className="text-xs uppercase font-black tracking-wide">Category</span>
                        </div>
                        <p className="font-black text-slate-900 capitalize text-xl">
                          {scanResult.pass?.category || "N/A"}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-xs uppercase font-black tracking-wide">CNIC / ID Number</span>
                        </div>
                        <p className="font-mono font-black text-slate-900 text-xl">
                          {scanResult.pass?.cnic || scanResult.pass?.idNumber || "N/A"}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs uppercase font-black tracking-wide">Expiry Date</span>
                        </div>
                        <p className={`font-black text-2xl ${scanResult.status === 'expired' ? 'text-red-700' : 'text-emerald-700'}`}>
                          {scanResult.pass?.dateOfExpiry ? formatDate(scanResult.pass.dateOfExpiry) : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="pt-5 border-t border-gray-200 flex justify-between items-center">
                      <button 
                        onClick={() => setScanResult(null)}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                      >
                        Clear & Scan New
                      </button>
                      <span className="text-xs text-gray-400 font-mono">
                        Scanned: {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}