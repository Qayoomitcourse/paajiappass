// /app/bulk-add-passes/page.tsx

"use client";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface TargetPassData {
  name?: string;
  fatherName?: string;
  idNumber?: string; // Updated from cnic
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  mobileNumber?: string;
  permanentAddress?: string;
  presentAddress?: string;
  designation?: string;
  organization?: string;
  category?: string;
  areaAllowed?: string;
  dateOfEntry?: string;
  dateOfExpiry?: string;
  securityClearance?: string;
}

interface ImportResult {
  row: number;
  status: 'Success' | 'Error';
  message: string | object;
  passId?: number;
  name?: string;
}

export default function BulkAddPassesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailedResults, setDetailedResults] = useState<ImportResult[]>([]);
  const [previewData, setPreviewData] = useState<TargetPassData[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push('/');
  }, [status, router]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = [
        'application/vnd.ms-excel', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'text/csv'
      ];
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
        previewFile(selectedFile);
      } else {
        setFile(null);
        setError('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
        setPreviewData([]);
        setShowPreview(false);
      }
    } else {
      setFile(null);
      setPreviewData([]);
      setShowPreview(false);
    }
  };

  const formatDateForExcel = (date: Date): string | undefined => {
    if (date && !isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return undefined;
  };

  const previewFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const binaryStr = event.target?.result;
          if (!binaryStr) return;

          const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData: (string | number | Date)[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            range: 5 // Only preview first 5 rows + header
          });

          if (jsonData.length < 2) {
            setError("Excel sheet is empty or has no data rows.");
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => h?.trim().toLowerCase().replace(/\s+/g, '') || '');
          const dataRows = jsonData.slice(1);

          // Updated header mapping to include new fields
          const headerMap: Record<string, keyof TargetPassData> = {
            'name': 'name',
            'fathername': 'fatherName',
            'idnumber': 'idNumber', // Updated from cnic
            'cnic': 'idNumber', // Keep backward compatibility
            'dateofbirth': 'dateOfBirth',
            'placeofbirth': 'placeOfBirth',
            'nationality': 'nationality',
            'mobilenumber': 'mobileNumber',
            'permanentaddress': 'permanentAddress',
            'presentaddress': 'presentAddress',
            'designation': 'designation',
            'organization': 'organization',
            'category': 'category',
            'areaallowed': 'areaAllowed',
            'dateofentry': 'dateOfEntry',
            'dateofexpiry': 'dateOfExpiry',
            'securityclearance': 'securityClearance',
          };

          const preview: TargetPassData[] = dataRows.map(rowArray => {
            const rowObject: Partial<TargetPassData> = {};
            headers.forEach((header, index) => {
              if (headerMap[header]) {
                const key = headerMap[header];
                const value = rowArray[index];
                if ((key === 'dateOfEntry' || key === 'dateOfExpiry' || key === 'dateOfBirth') && value instanceof Date) {
                  rowObject[key] = formatDateForExcel(value);
                } else if (value != null) {
                  rowObject[key] = String(value).trim();
                }
              }
            });
            return rowObject as TargetPassData;
          }).filter(obj => Object.keys(obj).length > 0 && obj.name);

          setPreviewData(preview);
          setShowPreview(true);
        } catch (err) {
          setError(`Failed to parse Excel file: ${(err as Error).message}`);
          setPreviewData([]);
          setShowPreview(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError(`Failed to read file: ${(err as Error).message}`);
    }
  };

  const validatePreviewData = () => {
    const issues: string[] = [];
    
    previewData.forEach((row, index) => {
      const rowNum = index + 2; // +2 for Excel row numbering (header + 1-indexed)
      
      if (!row.name || row.name.length < 3) {
        issues.push(`Row ${rowNum}: Name is required and must be at least 3 characters.`);
      }
      
      if (!row.idNumber) {
        issues.push(`Row ${rowNum}: ID Number (CNIC/Passport) is required.`);
      }
      
      if (!row.designation || row.designation.length < 2) {
        issues.push(`Row ${rowNum}: Designation is required and must be at least 2 characters.`);
      }
      
      if (!row.organization || row.organization.length < 2) {
        issues.push(`Row ${rowNum}: Organization is required and must be at least 2 characters.`);
      }
      
      if (!row.category || !['cargo', 'landside'].includes(row.category.toLowerCase())) {
        issues.push(`Row ${rowNum}: Category must be either 'cargo' or 'landside'.`);
      }
      
      if (!row.areaAllowed || row.areaAllowed.trim().length === 0) {
        issues.push(`Row ${rowNum}: Area Allowed is required.`);
      }
      
      if (!row.dateOfEntry || isNaN(Date.parse(row.dateOfEntry))) {
        issues.push(`Row ${rowNum}: Valid Date of Entry is required (YYYY-MM-DD format).`);
      }
      
      if (!row.dateOfExpiry || isNaN(Date.parse(row.dateOfExpiry))) {
        issues.push(`Row ${rowNum}: Valid Date of Expiry is required (YYYY-MM-DD format).`);
      }
    });
    
    return issues;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    // Validate preview data
    const validationIssues = validatePreviewData();
    if (validationIssues.length > 0) {
      setError(`Please fix the following issues before uploading:\n${validationIssues.slice(0, 5).join('\n')}${validationIssues.length > 5 ? `\n...and ${validationIssues.length - 5} more issues.` : ''}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setDetailedResults([]);

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        const binaryStr = event.target?.result;
        if (!binaryStr) throw new Error("Could not read file data.");

        const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: (string | number | Date)[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '' 
        });

        if (jsonData.length < 2) throw new Error("Excel sheet is empty or has no data rows.");

        const headers = (jsonData[0] as string[]).map(h => h?.trim().toLowerCase().replace(/\s+/g, '') || '');
        const dataRows = jsonData.slice(1);

        // Updated header mapping
        const headerMap: Record<string, keyof TargetPassData> = {
          'name': 'name',
          'fathername': 'fatherName',
          'idnumber': 'idNumber',
          'cnic': 'idNumber', // Backward compatibility
          'dateofbirth': 'dateOfBirth',
          'placeofbirth': 'placeOfBirth',
          'nationality': 'nationality',
          'mobilenumber': 'mobileNumber',
          'permanentaddress': 'permanentAddress',
          'presentaddress': 'presentAddress',
          'designation': 'designation',
          'organization': 'organization',
          'category': 'category',
          'areaallowed': 'areaAllowed',
          'dateofentry': 'dateOfEntry',
          'dateofexpiry': 'dateOfExpiry',
          'securityclearance': 'securityClearance',
        };

        const passesToUpload: TargetPassData[] = dataRows.map(rowArray => {
          const rowObject: Partial<TargetPassData> = {};
          headers.forEach((header, index) => {
            if (headerMap[header]) {
              const key = headerMap[header];
              const value = rowArray[index];
              if ((key === 'dateOfEntry' || key === 'dateOfExpiry' || key === 'dateOfBirth') && value instanceof Date) {
                rowObject[key] = formatDateForExcel(value);
              } else if (value != null) {
                rowObject[key] = String(value).trim();
              }
            }
          });
          return rowObject as TargetPassData;
        }).filter(obj => Object.keys(obj).length > 0 && obj.name);

        if (passesToUpload.length === 0) {
          throw new Error("No valid data rows found in the Excel sheet.");
        }

        const response = await fetch('/api/bulk-add-passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passes: passesToUpload }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || `Server error: ${response.status}`);

        setSuccessMessage(result.message || "Bulk import processed.");
        setDetailedResults(result.results || []);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unknown error occurred during processing.");
        setDetailedResults([]);
      } finally {
        setIsProcessing(false);
        setFile(null);
        setPreviewData([]);
        setShowPreview(false);
        if (e.target instanceof HTMLFormElement) e.target.reset();
      }
    };
    reader.readAsBinaryString(file);
  };

  const generateExcelTemplate = () => {
    // Create sample data with all fields
    const sampleData = [
      {
        'Name': 'John Doe',
        'Father Name': 'Robert Doe',
        'ID Number': '12345-1234567-1',
        'Date of Birth': '1990-01-15',
        'Place of Birth': 'Karachi',
        'Nationality': 'Pakistani',
        'Mobile Number': '+92-300-1234567',
        'Permanent Address': '123 Main Street, Karachi',
        'Present Address': '456 Current Street, Karachi',
        'Designation': 'Manager',
        'Organization': 'ABC Company Ltd',
        'Category': 'cargo',
        'Area Allowed': 'Import, Export',
        'Date of Entry': '2025-01-01',
        'Date of Expiry': '2025-12-31',
        'Security Clearance': 'na'
      },
      {
        'Name': 'Jane Smith',
        'Father Name': 'Michael Smith',
        'ID Number': 'AB1234567',
        'Date of Birth': '1985-05-20',
        'Place of Birth': 'Lahore',
        'Nationality': 'Pakistani',
        'Mobile Number': '+92-301-7654321',
        'Permanent Address': '789 Sample Road, Lahore',
        'Present Address': '321 Work Street, Lahore',
        'Designation': 'Supervisor',
        'Organization': 'XYZ Logistics',
        'Category': 'landside',
        'Area Allowed': 'JTC Office Block, JTC Car Parking Only',
        'Date of Entry': '2025-02-01',
        'Date of Expiry': '2025-12-31',
        'Security Clearance': 'local_police'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pass Data');
    
    // Generate file and download
    XLSX.writeFile(workbook, 'employee_passes_template.xlsx');
  };

  const handleErrorDetails = (message: string | object) => {
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && message !== null) {
      return Object.entries(message)
        .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
        .join('; ');
    }
    return "Invalid error format.";
  };

  if (status === 'loading') return <div className="text-center py-10"><p>Loading session...</p></div>;
  if (!session) return <div className="text-center py-10"><p>Access Denied. Please log in.</p></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">Bulk Add Employee Passes</h1>
      
      <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-700">
        <p className="font-semibold mb-2">Instructions:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Download the Excel template below or generate a new one with sample data.</li>
          <li>Fill in the details for each employee. All dates must be in <strong>YYYY-MM-DD</strong> format.</li>
          <li>Category must be either <strong>cargo</strong> or <strong>landside</strong> (all lowercase).</li>
          <li>ID Number can be CNIC (12345-1234567-1) or Passport (AB1234567) format.</li>
          <li>Area Allowed should be comma-separated (e.g., &quot;Import, Export&quot;).</li>
          <li>Upload the completed Excel file. The system will validate and create passes with unique IDs.</li>
        </ol>
        <div className="mt-4 flex gap-4">
          <button 
            onClick={generateExcelTemplate}
            className="text-blue-600 hover:text-blue-800 font-medium underline bg-transparent border-none cursor-pointer"
          >
            Generate Excel Template with Sample Data
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded break-words whitespace-pre-line">
          {error}
        </div>
      )}
      
      {successMessage && !isProcessing && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="excelFile" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Excel File <span className="text-red-500">*</span>
          </label>
          <input 
            type="file" 
            name="excelFile" 
            id="excelFile" 
            accept=".xlsx,.xls,.csv" 
            onChange={handleFileChange} 
            required 
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
          />
        </div>

        {showPreview && previewData.length > 0 && (
          <div className="mt-6 p-4 border border-gray-200 rounded-md">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              File Preview ({previewData.length} rows found)
            </h3>
            <div className="max-h-64 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Area Allowed</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">{row.name || 'N/A'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700 font-mono">{row.idNumber || 'N/A'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">{row.designation || 'N/A'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">{row.organization || 'N/A'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          row.category?.toLowerCase() === 'cargo' 
                            ? 'bg-blue-100 text-blue-800' 
                            : row.category?.toLowerCase() === 'landside'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {row.category || 'Invalid'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-700 max-w-32 truncate" title={row.areaAllowed}>
                        {row.areaAllowed || 'N/A'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">{row.dateOfEntry || 'N/A'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-700">{row.dateOfExpiry || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-center text-gray-500 py-2 text-sm">
                  ... and {previewData.length - 10} more rows
                </p>
              )}
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isProcessing || !file || (showPreview && validatePreviewData().length > 0)} 
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing File...' : 'Upload and Create Passes'}
        </button>
        
        {showPreview && validatePreviewData().length > 0 && (
          <div className="text-center text-sm text-gray-600">
            <p>⚠️ Please fix validation errors before uploading</p>
          </div>
        )}
      </form>

      {detailedResults.length > 0 && !isProcessing && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Import Results:</h2>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {detailedResults.filter(r => r.status === 'Success').length}
              </div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {detailedResults.filter(r => r.status === 'Error').length}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {detailedResults.length}
              </div>
              <div className="text-sm text-blue-700">Total Processed</div>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pass ID</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailedResults.map((result, index) => (
                  <tr key={index} className={result.status === 'Success' ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{result.row}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                      {result.name || 'N/A'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        result.status === 'Success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700 break-words max-w-md">
                      {handleErrorDetails(result.message)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 font-mono">
                      {result.passId ? String(result.passId).padStart(4, '0') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export Results */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                const csvContent = [
                  ['Row', 'Name', 'Status', 'Details', 'Pass ID'],
                  ...detailedResults.map(result => [
                    result.row,
                    result.name || 'N/A',
                    result.status,
                    handleErrorDetails(result.message),
                    result.passId ? String(result.passId).padStart(4, '0') : 'N/A'
                  ])
                ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bulk_import_results_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Export Results to CSV
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/database" className="text-blue-600 hover:text-blue-800">
          ← Back to Database
        </Link>
      </div>
    </div>
  );
}