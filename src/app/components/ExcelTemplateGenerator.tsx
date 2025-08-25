// /app/components/ExcelTemplateGenerator.tsx

"use client";
import * as XLSX from 'xlsx';

interface ExcelTemplateGeneratorProps {
  onGenerate?: () => void;
}

// Define the structure for the sample data to ensure type safety
interface TemplateRowData {
  'Name (*)': string;
  'Father Name': string;
  'ID Number (*)': string;
  'Date of Birth': string;
  'Place of Birth': string;
  'Nationality': string;
  'Mobile Number': string;
  'Permanent Address': string;
  'Present Address': string;
  'Designation (*)': string;
  'Organization (*)': string;
  'Category (*)': string;
  'Area Allowed (*)': string;
  'Date of Entry (*)': string;
  'Date of Expiry (*)': string;
  'Security Clearance': string;
}

const ExcelTemplateGenerator: React.FC<ExcelTemplateGeneratorProps> = ({ onGenerate }) => {
  
  const availableAreas = [
    "Import", 
    "Export", 
    "Dom", 
    "JTC Office Block", 
    "JTC Concourse Halls", 
    "JTC Car Parking Only"
  ];

  const generateTemplate = () => {
    // Create detailed instructions sheet
    const instructionsData = [
      ['EMPLOYEE PASS BULK UPLOAD TEMPLATE'],
      [''],
      ['INSTRUCTIONS:'],
      ['1. Fill in all required fields marked with (*) in the Data sheet'],
      ['2. Use the exact column names as provided - do not modify headers'],
      ['3. Date format must be YYYY-MM-DD (e.g., 2025-01-01)'],
      ['4. Category must be either "cargo" or "landside" (lowercase)'],
      ['5. ID Number can be CNIC (12345-1234567-1) or Passport (AB1234567)'],
      ['6. Area Allowed should be comma-separated values'],
      ['7. Security Clearance options: special_branch, local_police, na'],
      ['8. Do not leave required fields empty'],
      [''],
      ['FIELD DESCRIPTIONS:'],
      ['Name (*): Full name of the employee (minimum 3 characters)'],
      ['Father Name: Father\'s full name (optional)'],
      ['ID Number (*): CNIC or Passport number'],
      ['Date of Birth: Employee\'s birth date (YYYY-MM-DD)'],
      ['Place of Birth: Birth place/city (optional)'],
      ['Nationality: Employee\'s nationality (default: Pakistani)'],
      ['Mobile Number: Contact number with country code'],
      ['Permanent Address: Permanent residential address'],
      ['Present Address: Current residential address'],
      ['Designation (*): Job title/position (minimum 2 characters)'],
      ['Organization (*): Company/organization name (minimum 2 characters)'],
      ['Category (*): Pass category - cargo or landside'],
      ['Area Allowed (*): Comma-separated areas from the list below'],
      ['Date of Entry (*): Pass validity start date (YYYY-MM-DD)'],
      ['Date of Expiry (*): Pass validity end date (YYYY-MM-DD)'],
      ['Security Clearance: Type of security clearance'],
      [''],
      ['AVAILABLE AREAS:'],
      ...availableAreas.map(area => [`- ${area}`]),
      [''],
      ['SAMPLE AREA COMBINATIONS:'],
      ['- Import, Export'],
      ['- JTC Office Block, JTC Car Parking Only'],
      ['- Dom, JTC Concourse Halls'],
      [''],
      ['NOTE: Required fields are marked with (*) in the header row of Data sheet']
    ];

    // Create sample data with comprehensive examples
    const sampleData: TemplateRowData[] = [
      {
        'Name (*)': 'John Doe',
        'Father Name': 'Robert Doe',
        'ID Number (*)': '12345-1234567-1',
        'Date of Birth': '1990-01-15',
        'Place of Birth': 'Karachi',
        'Nationality': 'Pakistani',
        'Mobile Number': '+92-300-1234567',
        'Permanent Address': '123 Main Street, Block A, Gulshan-e-Iqbal, Karachi',
        'Present Address': '456 Current Street, DHA Phase 2, Karachi',
        'Designation (*)': 'Manager',
        'Organization (*)': 'ABC Logistics Ltd',
        'Category (*)': 'cargo',
        'Area Allowed (*)': 'Import, Export',
        'Date of Entry (*)': '2025-01-01',
        'Date of Expiry (*)': '2025-12-31',
        'Security Clearance': 'na'
      },
      {
        'Name (*)': 'Jane Smith',
        'Father Name': 'Michael Smith',
        'ID Number (*)': 'AB1234567',
        'Date of Birth': '1985-05-20',
        'Place of Birth': 'Lahore',
        'Nationality': 'Pakistani',
        'Mobile Number': '+92-301-7654321',
        'Permanent Address': '789 Sample Road, Model Town, Lahore',
        'Present Address': '321 Work Street, Johar Town, Lahore',
        'Designation (*)': 'Supervisor',
        'Organization (*)': 'XYZ Shipping Co',
        'Category (*)': 'landside',
        'Area Allowed (*)': 'JTC Office Block, JTC Car Parking Only',
        'Date of Entry (*)': '2025-02-01',
        'Date of Expiry (*)': '2025-12-31',
        'Security Clearance': 'local_police'
      },
      {
        'Name (*)': 'Ahmed Ali',
        'Father Name': 'Muhammad Ali',
        'ID Number (*)': '54321-9876543-2',
        'Date of Birth': '1988-08-10',
        'Place of Birth': 'Islamabad',
        'Nationality': 'Pakistani',
        'Mobile Number': '+92-333-9876543',
        'Permanent Address': '456 Capital Avenue, F-7, Islamabad',
        'Present Address': '789 Business District, Blue Area, Islamabad',
        'Designation (*)': 'Operations Officer',
        'Organization (*)': 'Port Operations Ltd',
        'Category (*)': 'cargo',
        'Area Allowed (*)': 'Dom, JTC Concourse Halls',
        'Date of Entry (*)': '2025-03-15',
        'Date of Expiry (*)': '2025-12-31',
        'Security Clearance': 'special_branch'
      }
    ];

    // Create validation sheet with dropdown options
    const validationData = [
      ['VALIDATION REFERENCE'],
      [''],
      ['Valid Categories:'],
      ['cargo'],
      ['landside'],
      [''],
      ['Valid Security Clearance Options:'],
      ['special_branch'],
      ['local_police'],
      ['na'],
      [''],
      ['Available Areas (use comma-separated):'],
      ...availableAreas.map(area => [area]),
      [''],
      ['Date Format Examples:'],
      ['2025-01-01'],
      ['2025-12-31'],
      ['2024-06-15'],
      [''],
      ['ID Number Format Examples:'],
      ['CNIC: 12345-1234567-1'],
      ['CNIC: 1234512345671'],
      ['Passport: AB1234567'],
      ['Passport: XY9876543']
    ];

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    // Style the instructions sheet
    instructionsSheet['!cols'] = [{ width: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Data sheet with sample data
    const dataSheet = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths for better readability
    dataSheet['!cols'] = [
      { width: 15 }, // Name
      { width: 15 }, // Father Name
      { width: 18 }, // ID Number
      { width: 12 }, // Date of Birth
      { width: 12 }, // Place of Birth
      { width: 12 }, // Nationality
      { width: 16 }, // Mobile Number
      { width: 30 }, // Permanent Address
      { width: 30 }, // Present Address
      { width: 15 }, // Designation
      { width: 20 }, // Organization
      { width: 10 }, // Category
      { width: 25 }, // Area Allowed
      { width: 12 }, // Date of Entry
      { width: 12 }, // Date of Expiry
      { width: 15 }, // Security Clearance
    ];
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    // Validation reference sheet
    const validationSheet = XLSX.utils.aoa_to_sheet(validationData);
    validationSheet['!cols'] = [{ width: 30 }];
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Reference');

    // Create empty template sheet for actual data entry
    const emptyTemplateData: TemplateRowData[] = [sampleData[0]]; // Just the header row
    // Add 50 empty rows for data entry
    for (let i = 0; i < 50; i++) {
      const emptyRow: TemplateRowData = {
        'Name (*)': '',
        'Father Name': '',
        'ID Number (*)': '',
        'Date of Birth': '',
        'Place of Birth': '',
        'Nationality': '',
        'Mobile Number': '',
        'Permanent Address': '',
        'Present Address': '',
        'Designation (*)': '',
        'Organization (*)': '',
        'Category (*)': '',
        'Area Allowed (*)': '',
        'Date of Entry (*)': '',
        'Date of Expiry (*)': '',
        'Security Clearance': ''
      };
      emptyTemplateData.push(emptyRow);
    }

    const templateSheet = XLSX.utils.json_to_sheet(emptyTemplateData);
    templateSheet['!cols'] = dataSheet['!cols']; // Same column widths
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Empty Template');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Employee_Passes_Template_${timestamp}.xlsx`;
    
    // Download the file
    XLSX.writeFile(workbook, filename);

    // Call onGenerate callback if provided
    if (onGenerate) {
      onGenerate();
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={generateTemplate}
        className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Download Excel Template
      </button>

      <div className="text-sm text-gray-600">
        <p className="font-medium mb-2">The template includes:</p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Detailed instructions and field descriptions</li>
          <li>Sample data with proper formatting examples</li>
          <li>Validation reference with accepted values</li>
          <li>Empty template sheet for your data</li>
        </ul>
      </div>
    </div>
  );
};

export default ExcelTemplateGenerator;