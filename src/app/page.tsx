// app/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/app/lib/auth";
import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import SignOutButton from '@/app/components/SignOutButton'
import SignInButton from '@/app/components/SignInButton';
import NoticeCarousel from '@/app/components/NoticeCarousel';
import YearWisePassDistribution from '@/app/components/YearWisePassDistribution';

// Heroicon imports
import { 
  PlusCircleIcon, 
  CircleStackIcon, 
  PrinterIcon, 
  ArrowRightIcon, 
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  BellIcon,
  PencilSquareIcon,
  BanknotesIcon,
  QrCodeIcon  // Add this line
} from '@heroicons/react/24/outline';

interface PassCounts {
  total: number;
  cargo: number;
  landside: number;
}

interface PassStatistics {
  counts: PassCounts;
  expiringThisMonth: number;
  expiredPasses: number;
  recentlyAdded: number;
  totalOrganizations: number;
  totalCreators: number;
  mostCommonArea: string;
  averagePassesPerDay: number;
}

interface PublicTemplate {
  _id: string;
  title: string;
  description: string;
  category: 'cargo' | 'landside' | 'general';
  fileUrl: string;
  fileName: string;
  fileType: string;
  isRequired: boolean;
  displayOrder: number;
  _updatedAt: string;
}

interface PublicNotice {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  displayOrder: number;
  validUntil?: string;
  _createdAt: string;
  _updatedAt: string;
}

interface EmployeePass {
  _id: string;
  dateOfEntry: string;
  category: 'cargo' | 'landside';
  dateOfExpiry?: string;
  _createdAt: string;
}

async function getPublicTemplates(): Promise<PublicTemplate[]> {
  try {
    const query = `
      *[_type == "publicTemplate" && isPublic == true] | order(category asc, displayOrder asc) {
        _id,
        title,
        description,
        category,
        "fileUrl": file.asset->url,
        "fileName": file.asset->originalFilename,
        "fileType": file.asset->mimeType,
        isRequired,
        displayOrder,
        _updatedAt
      }
    `;
    
    const templates = await client.fetch(query);
    return templates || [];
  } catch (error) {
    console.error("Failed to fetch public templates:", error);
    return [];
  }
}

async function getPublicNotices(): Promise<PublicNotice[]> {
  try {
    const today = new Date().toISOString();
    const query = `
      *[_type == "publicNotice" && isActive == true && (validUntil == null || validUntil >= "${today}")] | order(displayOrder asc, _createdAt desc) {
        _id,
        title,
        description,
        type,
        isActive,
        displayOrder,
        validUntil,
        _createdAt,
        _updatedAt
      }
    `;
    
    const notices = await client.fetch(query);
    return notices || [];
  } catch (error) {
    console.error("Failed to fetch public notices:", error);
    return [];
  }
}

async function getAllPasses(): Promise<EmployeePass[]> {
  try {
    const query = `
      *[_type == "employeePass"] {
        _id,
        dateOfEntry,
        category,
        dateOfExpiry,
        _createdAt
      }
    `;
    
    const passes = await client.fetch(query);
    return passes || [];
  } catch (error) {
    console.error("Failed to fetch passes:", error);
    return [];
  }
}

async function getComprehensiveStatistics(): Promise<PassStatistics> {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const query = `
      {
        "counts": {
          "total": count(*[_type == "employeePass"]),
          "cargo": count(*[_type == "employeePass" && category == "cargo"]),
          "landside": count(*[_type == "employeePass" && category == "landside"])
        },
        "expiringThisMonth": count(*[_type == "employeePass" && dateOfExpiry >= "${startOfMonth.toISOString()}" && dateOfExpiry <= "${endOfMonth.toISOString()}"]),
        "expiredPasses": count(*[_type == "employeePass" && dateOfExpiry < "${today.toISOString()}"]),
        "recentlyAdded": count(*[_type == "employeePass" && _createdAt >= "${sevenDaysAgo.toISOString()}"]),
        "totalOrganizations": count(array::unique(*[_type == "employeePass"].organization)),
        "totalCreators": count(array::unique(*[_type == "employeePass"].author._ref)),
        "allAreas": *[_type == "employeePass"].areaAllowed[],
        "oldestPass": *[_type == "employeePass"] | order(_createdAt asc)[0]._createdAt,
        "newestPass": *[_type == "employeePass"] | order(_createdAt desc)[0]._createdAt
      }
    `;
    
    const result = await client.fetch(query);
    
    // Calculate most common area
    const areaCount: { [key: string]: number } = {};
    if (result.allAreas) {
      result.allAreas.forEach((area: string) => {
        if (area) {
          areaCount[area] = (areaCount[area] || 0) + 1;
        }
      });
    }
    
    const mostCommonArea = Object.keys(areaCount).reduce((a, b) => 
      areaCount[a] > areaCount[b] ? a : b, 'N/A'
    );

    // Calculate average passes per day
    let averagePassesPerDay = 0;
    if (result.oldestPass && result.newestPass) {
      const daysDiff = Math.ceil((new Date(result.newestPass).getTime() - new Date(result.oldestPass).getTime()) / (1000 * 60 * 60 * 24));
      averagePassesPerDay = daysDiff > 0 ? Math.round((result.counts?.total || 0) / daysDiff * 10) / 10 : 0;
    }

    return {
      counts: result.counts || { total: 0, cargo: 0, landside: 0 },
      expiringThisMonth: result.expiringThisMonth || 0,
      expiredPasses: result.expiredPasses || 0,
      recentlyAdded: result.recentlyAdded || 0,
      totalOrganizations: result.totalOrganizations || 0,
      totalCreators: result.totalCreators || 0,
      mostCommonArea: mostCommonArea,
      averagePassesPerDay: averagePassesPerDay
    };
  } catch (error) {
    console.error("Failed to fetch comprehensive statistics from Sanity:", error);
    return {
      counts: { total: 0, cargo: 0, landside: 0 },
      expiringThisMonth: 0,
      expiredPasses: 0,
      recentlyAdded: 0,
      totalOrganizations: 0,
      totalCreators: 0,
      mostCommonArea: 'N/A',
      averagePassesPerDay: 0
    };
  }
}

interface Feature {
  name: string;
  href: string;
  description: string;
  icon: React.ElementType;
  bgColorClass: string;
  textColorClass: string;
  emoji: string;
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

function TemplateSection({ 
  title, 
  description, 
  templates, 
  bgColor, 
  borderColor, 
  textColor,
  icon 
}: {
  title: string;
  description: string;
  templates: PublicTemplate[];
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}) {
  return (
    <div className={`bg-white shadow-xl rounded-lg border ${borderColor} overflow-hidden`}>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <div className={`flex items-center justify-center w-12 h-12 ${bgColor} rounded-lg mr-4`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
        
        {templates.length > 0 ? (
          <div className="grid gap-4">
            {templates.map((template) => (
              <div key={template._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h3 className="font-medium text-gray-900">{template.title}</h3>
                    {template.isRequired && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{template.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updated: {new Date(template._updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <a 
                  href={template.fileUrl} 
                  download={template.fileName}
                  className={`ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${textColor} hover:opacity-90 transition-opacity`}
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No templates available at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function LoggedOutView() {
  const templates = await getPublicTemplates();
  const notices = await getPublicNotices();

  // Group templates by category
  const cargoTemplates = templates.filter(t => t.category === 'cargo');
  const landsideTemplates = templates.filter(t => t.category === 'landside');
  const generalTemplates = templates.filter(t => t.category === 'general');

  // Fallback templates if none are available from CMS
  const fallbackDocuments = [
    { 
      title: "Covering Letter", 
      description: "From the company, on official letterhead.", 
      file: "/downloads/Covering_Letter_Template.pdf",
      category: "general" as const,
      isRequired: true
    },
    { 
      title: "Undertaking of Employee", 
      description: "Prescribed format, signed by the employee.", 
      file: "/downloads/Undertaking_Template.pdf",
      category: "general" as const,
      isRequired: true
    },
    { 
      title: "Application Form", 
      description: "Official, prescribed application form.", 
      file: "/downloads/Application_Form_Template.pdf",
      category: "general" as const,
      isRequired: true
    },
    { 
      title: "ID Document Page", 
      description: "CNIC, Company Card etc. on a single A4 page.", 
      file: "/downloads/ID_Documents_Template.pdf",
      category: "general" as const,
      isRequired: true
    },
    { 
      title: "Security Clearance Guide", 
      description: "Required format from Special Branch or local Police Station.", 
      file: "/downloads/Security_Clearance_Guide.pdf",
      category: "general" as const,
      isRequired: true
    },
    { 
      title: "Prescribed Challan", 
      description: "Fee payment of Rs. 300/- for each pass.", 
      file: "/downloads/Fee_Challan_Template.pdf",
      category: "general" as const,
      isRequired: true
    },
  ];

  const fallbackCirculars = [
    { 
      title: "Circular No. 101: Updated Security Protocols", 
      description: "Effective from Jan 2025.", 
      file: "/downloads/circulars/Circular_101_Security_Protocols.pdf" 
    },
    { 
      title: "Circular No. 102: Vehicle Access Policy", 
      description: "Changes to vehicle entry and parking.", 
      file: "/downloads/circulars/Circular_102_Vehicle_Policy.pdf" 
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">✈️</div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Airport Pass Application System
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-600 sm:text-lg md:mt-5 md:text-xl">
            Complete guide and templates for applying Landside and Cargo passes at Pakistan Airports Authority
          </p>
        </div>

        {/* Notice Carousel */}
        {notices.length > 0 && (
          <div className="mb-12">
            <NoticeCarousel notices={notices} />
          </div>
        )}

        {/* Quick Info Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-200 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mr-4">
                <span className="text-2xl">🚛</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Cargo Pass</h3>
                <p className="text-blue-700">For Air Freight Unit & Cargo Sheds access</p>
              </div>
            </div>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Access to cargo complex and air freight areas</p>
              <p>• Required for logistics and cargo operations</p>
              <p>• Valid for 1 year from issue date</p>
              <p>• Special Branch Police Clearence is required</p>
              <p>• Fees for each Pass PKR300 to be deposited in HBL/NBP</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg border border-purple-200 p-6">
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mr-4">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900">Landside Pass</h3>
                <p className="text-purple-700">For Jinah Terminal&apos;s office Block and Landside area including car parking</p>
              </div>
            </div>
            <div className="text-sm text-purple-800 space-y-2">
              <p>• Access to Terminal building&apos;s Concourse Hall and offices</p>
              <p>• Required for administrative and service work</p>
              <p>• Valid for 1 year from issue date subject to Special Branch Police Clearence</p>
              <p>• Valid for 3 months from issue date in case of Local Police Verification</p>
              <p>• Frees for each Pass PKR 300 to be deposited in HBL/NBP</p>
            </div>
          </div>
        </div>

        {/* Create Case Section */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-200 p-8">
            <h2 className="text-2xl font-bold text-green-900 mb-4">Apply for Airport Entry Pass</h2>
            <p className="text-green-700 mb-6">
              Now you can can generate online application for issuance of AFU Cargo and Landside Passes.
            </p>
            <a
              href="/apply"
              className="inline-flex items-center px-6 py-3 text-lg font-medium rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              ✍️ Create a Case
            </a>
          </div>
        </div>

        {/* Template Sections */}
        <div className="space-y-8 mb-12">
          {/* Cargo Templates */}
          <TemplateSection
            title="Cargo Pass Templates"
            description="Required documents for cargo area access applications"
            templates={cargoTemplates}
            bgColor="bg-blue-100"
            borderColor="border-blue-200"
            textColor="bg-blue-600"
            icon="🚛"
          />

          {/* Landside Templates */}
          <TemplateSection
            title="Landside Pass Templates"
            description="Required documents for landside area access applications"
            templates={landsideTemplates}
            bgColor="bg-purple-100"
            borderColor="border-purple-200"
            textColor="bg-purple-600"
            icon="🏢"
          />

          {/* General Templates */}
          <TemplateSection
            title="General Documents"
            description="Common documents required for both pass types"
            templates={generalTemplates.length > 0 ? generalTemplates : fallbackDocuments.map(doc => ({
              _id: doc.title.replace(/\s+/g, '_').toLowerCase(),
              title: doc.title,
              description: doc.description,
              category: doc.category,
              fileUrl: doc.file,
              fileName: doc.file.split('/').pop() || '',
              fileType: 'application/pdf',
              isRequired: doc.isRequired,
              displayOrder: 0,
              _updatedAt: new Date().toISOString()
            }))}
            bgColor="bg-gray-100"
            borderColor="border-gray-200"
            textColor="bg-gray-600"
            icon="📄"
          />
        </div>

        {/* Latest Circulars */}
        <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8 mb-12">
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4">
              <InformationCircleIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Latest Circulars & Notifications</h2>
              <p className="text-sm text-gray-600 mt-1">Important policy updates and announcements</p>
            </div>
          </div>
          <div className="grid gap-4">
            {fallbackCirculars.map((circular, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{circular.title}</h3>
                  <p className="text-sm text-gray-500">{circular.description}</p>
                </div>
                <a 
                  href={circular.file} 
                  download 
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Application Process */}
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl shadow-lg border border-sky-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-sky-900 mb-6 text-center">Application Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">1</div>
              <h3 className="font-semibold text-sky-900 mb-2">Download Forms</h3>
              <p className="text-sm text-sky-700">Get required templates and fill them completely</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">2</div>
              <h3 className="font-semibold text-sky-900 mb-2">Prepare Documents</h3>
              <p className="text-sm text-sky-700">Gather all required documents and attestations</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">3</div>
              <h3 className="font-semibold text-sky-900 mb-2">Pay Fee</h3>
              <p className="text-sm text-sky-700">Submit Rs. 300/- fee with prescribed challan</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">4</div>
              <h3 className="font-semibold text-sky-900 mb-2">Submit Application</h3>
              <p className="text-sm text-sky-700">Submit to PAA office for processing</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contact Information</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📞</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">+92-021-99071624</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">✉️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">airportpassapp@gmail.com</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Office Hours</h3>
              <p className="text-gray-600">Mon-Fri: 09:00 AM - 5:00 PM</p>
            </div>
          </div>
        </div>

        {/* Sign In Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-8">
            <h2 className="text-2xl font-bold text-indigo-900 mb-4">For Authorized Personnel</h2>
            <p className="text-indigo-700 mb-6">
              Access the management system to create, manage, and print airport passes
            </p>
            <SignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;

  if (!session || !user) {
    return <LoggedOutView />;
  }

  const statistics = await getComprehensiveStatistics();
  const allPasses = await getAllPasses();

  const features: Feature[] = [
  { 
    name: 'Add New Pass', 
    href: '/add-pass',
    description: 'Create a new employee pass record quickly and easily.',
    icon: PlusCircleIcon,
    bgColorClass: 'bg-green-100 dark:bg-green-900/50',
    textColorClass: 'text-green-600 dark:text-green-400',
    emoji: '➕'
  },
  { 
    name: 'QR Scanner', 
    href: '/scan-cards',
    description: 'Scan and verify QR codes or barcodes on ID cards.',
    icon: QrCodeIcon,
    bgColorClass: 'bg-cyan-100 dark:bg-cyan-900/50',
    textColorClass: 'text-cyan-600 dark:text-cyan-400',
    emoji: '📷'
  },
  { 
    name: 'Pending Application', 
    href: '/admin/pending',
    description: 'Review Pending Application and approve / reject.',
    icon: PlusCircleIcon,
    bgColorClass: 'bg-green-100 dark:bg-green-900/50',
    textColorClass: 'text-green-600 dark:text-green-400',
    emoji: '➕'
  },
  { 
    name: 'Upload Excel', 
    href: '/bulk-add-passes',
    description: 'Bulk import multiple passes from Excel spreadsheet.',
    icon: DocumentArrowUpIcon,
    bgColorClass: 'bg-emerald-100 dark:bg-emerald-900/50',
    textColorClass: 'text-emerald-600 dark:text-emerald-400',
    emoji: '📊'
  },
  { 
    name: 'View Database', 
    href: '/database',
    description: 'Browse, search, and manage all existing passes.',
    icon: CircleStackIcon,
    bgColorClass: 'bg-blue-100 dark:bg-blue-900/50',
    textColorClass: 'text-blue-600 dark:text-blue-400',
    emoji: '🗃️'
  },
  { 
    name: 'Print ID Cards', 
    href: '/print-prev',
    description: 'View gallery and print official identification cards.',
    icon: PrinterIcon,
    bgColorClass: 'bg-purple-100 dark:bg-purple-900/50',
    textColorClass: 'text-purple-600 dark:text-purple-400',
    emoji: '🖨️'
  },
  { 
    name: 'Financial Statistics', 
    href: '/financial-stats',
    description: 'View revenue analytics and financial reports.',
    icon: BanknotesIcon,
    bgColorClass: 'bg-amber-100 dark:bg-amber-900/50',
    textColorClass: 'text-amber-600 dark:text-amber-400',
    emoji: '💰'
  },
];


  const cargoDocuments = [
    { name: "Cargo Pass Application Form", description: "Official cargo area access form", file: "/downloads/cargo/Cargo_Application_Form_Template.pdf", icon: DocumentTextIcon },
    { name: "Cargo Covering Letter", description: "Company letterhead for cargo pass", file: "/downloads/cargo/Cargo_Covering_Letter_Template.pdf", icon: DocumentTextIcon },
    { name: "Cargo Undertaking", description: "Employee undertaking for cargo area", file: "/downloads/cargo/Cargo_Undertaking_Template.pdf", icon: DocumentTextIcon },
    { name: "Cargo Fee Challan", description: "Payment form for cargo pass (Rs. 300)", file: "/downloads/cargo/Cargo_Fee_Challan_Template.pdf", icon: DocumentTextIcon },
  ];

  const landsideDocuments = [
    { name: "Landside Pass Application Form", description: "Official landside area access form", file: "/downloads/landside/Landside_Application_Form_Template.pdf", icon: DocumentTextIcon },
    { name: "Landside Covering Letter", description: "Company letterhead for landside pass", file: "/downloads/landside/Landside_Covering_Letter_Template.pdf", icon: DocumentTextIcon },
    { name: "Landside Undertaking", description: "Employee undertaking for landside area", file: "/downloads/landside/Landside_Undertaking_Template.pdf", icon: DocumentTextIcon },
    { name: "Landside Fee Challan", description: "Payment form for landside pass (Rs. 300)", file: "/downloads/landside/Landside_Fee_Challan_Template.pdf", icon: DocumentTextIcon },
  ];

  const generalDocuments = [
    { name: "ID Document Template", description: "CNIC, Company Card layout guide", file: "/downloads/general/ID_Documents_Template.pdf", icon: DocumentTextIcon },
    { name: "Security Clearance Guide", description: "Requirements and format guide", file: "/downloads/general/Security_Clearance_Guide.pdf", icon: DocumentTextIcon },
  ];

  const circulars = [
    { name: "Security Protocols Update", description: "Circular No. 101 - Effective Jan 2025", file: "/downloads/circulars/Circular_101_Security_Protocols.pdf" },
    { name: "Vehicle Access Policy", description: "Circular No. 102 - Parking & Entry Rules", file: "/downloads/circulars/Circular_102_Vehicle_Policy.pdf" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        
        {/* Header Section */}
        <header className="mb-6 sm:mb-8 lg:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-800 dark:text-sky-400 mb-2">
                Airport Pass Management System
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                Welcome back, <span className="font-semibold text-sky-600 dark:text-sky-300 break-words">
                  {user.name || user.email?.split('@')[0] || 'User'}
                </span>! 👋
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Alert Section for Expired/Expiring Passes */}
        {(statistics.expiredPasses > 0 || statistics.expiringThisMonth > 0) && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Pass Expiration Alert
                  </h3>
                  <div className="text-sm text-amber-700 dark:text-amber-400">
                    {statistics.expiredPasses > 0 && (
                      <p className="mb-1">
                        <span className="font-semibold">{statistics.expiredPasses}</span> pass(es) have already expired.
                      </p>
                    )}
                    {statistics.expiringThisMonth > 0 && (
                      <p>
                        <span className="font-semibold">{statistics.expiringThisMonth}</span> pass(es) expiring this month.
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <Link 
                      href="/database?sort=expiry_asc" 
                      className="text-sm text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline"
                    >
                      View expiring passes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {features.map((feature) => (
            <Link
              key={feature.name}
              href={feature.href}
              className="group block transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative h-full p-4 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 hover:border-sky-500/70 dark:hover:border-sky-500/70 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className={`inline-flex items-center justify-center p-2 sm:p-3 rounded-lg ${feature.bgColorClass} shadow-sm mr-3`}>
                    <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.textColorClass}`} />
                  </div>
                  <span className="text-2xl sm:hidden">{feature.emoji}</span>
                </div>
                
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-100 mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {feature.name}
                </h2>
                
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>
                
                <div className="flex justify-end">
                  <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-all duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Year-Wise Pass Distribution - NEW SECTION */}
        <YearWisePassDistribution passes={allPasses} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 mb-8">
          
          {/* Statistics Section - Takes 2 columns */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Activity & Status Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg mr-3">
                      <ClockIcon className="w-5 h-5 text-green-600 dark:text-green-400"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Recent Activity</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📝</span>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">New Passes</p>
                          <p className="text-xs text-green-600 dark:text-green-400">This week</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {statistics.recentlyAdded}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">⚡</span>
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-300">Daily Average</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">All time</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {statistics.averagePassesPerDay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pass Status */}
              <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg mr-3">
                      <CalendarDaysIcon className="w-5 h-5 text-red-600 dark:text-red-400"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Expiration Status</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Renewal tracking</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">❌</span>
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-300">Expired</p>
                          <p className="text-xs text-red-600 dark:text-red-400">Need renewal</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {statistics.expiredPasses}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">⚠️</span>
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">Expiring Soon</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">This month</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {statistics.expiringThisMonth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resources & Templates Section - Takes 1 column */}
          <div className="space-y-6">
            
            {/* Admin Upload Section */}
            {user?.role === 'admin' && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl shadow-lg border border-emerald-200 dark:border-emerald-700/50">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg mr-3">
                      <CloudArrowUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Admin Controls</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Manage templates & notifications</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <Link 
                      href="/admin/upload-templates"
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200 dark:border-emerald-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-800/30 transition-colors group"
                    >
                      <div className="flex items-center">
                        <DocumentArrowUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload Templates</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                    </Link>
                    
                    <Link 
                      href="/admin/manage-circulars"
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200 dark:border-emerald-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-800/30 transition-colors group"
                    >
                      <div className="flex items-center">
                        <InformationCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Circulars</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                    </Link>
                    
                    <Link 
                      href="/admin/notifications"
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200 dark:border-emerald-600/50 hover:bg-emerald-50 dark:hover:bg-emerald-800/30 transition-colors group"
                    >
                      <div className="flex items-center">
                        <BellIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Notifications</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Cargo Pass Templates */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-3">
                      <span className="text-lg">🚛</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Cargo Pass Templates</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Required for cargo area access</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Link 
                      href="/admin/upload-templates?type=cargo"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                    >
                      <PencilSquareIcon className="w-3 h-3 mr-1" />
                      Edit
                    </Link>
                  )}
                </div>
                
                <div className="space-y-3">
                  {cargoDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600/50 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors">
                      <div className="flex items-center flex-1 min-w-0">
                        <doc.icon className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">{doc.name}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{doc.description}</p>
                        </div>
                      </div>
                      <a 
                        href={doc.file} 
                        download 
                        className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors flex-shrink-0"
                      >
                        <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                        PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Landside Pass Templates */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg mr-3">
                      <span className="text-lg">🏢</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Landside Pass Templates</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Required for landside area access</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Link 
                      href="/admin/upload-templates?type=landside"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                    >
                      <PencilSquareIcon className="w-3 h-3 mr-1" />
                      Edit
                    </Link>
                  )}
                </div>
                
                <div className="space-y-3">
                  {landsideDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-600/50 hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors">
                      <div className="flex items-center flex-1 min-w-0">
                        <doc.icon className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200 truncate">{doc.name}</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 truncate">{doc.description}</p>
                        </div>
                      </div>
                      <a 
                        href={doc.file} 
                        download 
                        className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors flex-shrink-0"
                      >
                        <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                        PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* General Documents */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-900/50 rounded-lg mr-3">
                      <DocumentArrowDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">General Documents</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Common for both pass types</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Link 
                      href="/admin/upload-templates?type=general"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <PencilSquareIcon className="w-3 h-3 mr-1" />
                      Edit
                    </Link>
                  )}
                </div>
                
                <div className="space-y-3">
                  {generalDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center flex-1 min-w-0">
                        <doc.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.description}</p>
                        </div>
                      </div>
                      <a 
                        href={doc.file} 
                        download 
                        className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors flex-shrink-0"
                      >
                        <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                        PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Latest Circulars */}
            <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg mr-3">
                      <InformationCircleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">Latest Circulars</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Policy updates</p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Link 
                      href="/admin/manage-circulars"
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
                    >
                      <PencilSquareIcon className="w-3 h-3 mr-1" />
                      Manage
                    </Link>
                  )}
                </div>
                
                <div className="space-y-3">
                  {circulars.map((circular, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-600/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 pr-2">{circular.name}</h4>
                        <a 
                          href={circular.file} 
                          download 
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors flex-shrink-0"
                        >
                          <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                          PDF
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{circular.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Info Box */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-xl shadow-lg border border-sky-200 dark:border-sky-700/50">
              <div className="p-4 sm:p-6">
                <div className="flex items-center mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-sky-100 dark:bg-sky-900/50 rounded-lg mr-2">
                    <span className="text-lg">💡</span>
                  </div>
                  <h3 className="text-sm font-semibold text-sky-800 dark:text-sky-300">Application Guidelines</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1 flex items-center">
                      <span className="text-sm mr-1">🚛</span> Cargo Pass
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400">For cargo area, freight handling, and warehouse access</p>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg">
                    <h4 className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-1 flex items-center">
                      <span className="text-sm mr-1">🏢</span> Landside Pass
                    </h4>
                    <p className="text-xs text-purple-700 dark:text-purple-400">For terminal building, offices, and public areas</p>
                  </div>
                  <div className="pt-2 border-t border-sky-200 dark:border-sky-700">
                    <div className="text-xs text-sky-700 dark:text-sky-400 space-y-1">
                      <p>• Fee: Rs. 300/- per pass</p>
                      <p>• Processing: 3-5 business days</p>
                      <p>• Valid for: 1 year from issue</p>
                      <p>• Security clearance mandatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organizational Statistics - Full Width */}
        <div className="bg-white dark:bg-slate-800/70 rounded-xl shadow-lg dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg mr-3 sm:mr-4">
                <UserGroupIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-700 dark:text-slate-100">
                  System Insights
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Organizational overview and key metrics
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg border border-indigo-200 dark:border-indigo-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300">Organizations</p>
                  <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {statistics.totalOrganizations}
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                  Registered companies
                </p>
              </div>
              
              <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-lg border border-cyan-200 dark:border-cyan-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-cyan-700 dark:text-cyan-300">Pass Creators</p>
                  <UserGroupIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                  {statistics.totalCreators}
                </p>
                <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">
                  Active administrators
                </p>
              </div>
              
              <div className="p-4 sm:p-5 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-lg border border-teal-200 dark:border-teal-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300">Most Common Area</p>
                  <MapPinIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400 leading-tight">
                  {statistics.mostCommonArea}
                </p>
                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">
                  Primary access zone
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
