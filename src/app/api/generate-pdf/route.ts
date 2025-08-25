// /app/api/generate-pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/lib/auth";
import { EmployeePass } from '@/app/types';
import { jsPDF } from 'jspdf';
// Import autoTable as a separate module
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Define interface for autoTable cell data
interface AutoTableCellData {
  column: {
    index: number;
  };
  cell: {
    text: string[];
    x: number;
    y: number;
    width: number;
  };
}

// This is the correct way to extend the jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { passes }: { passes: EmployeePass[] } = await request.json();

    if (!passes || !Array.isArray(passes)) {
      return NextResponse.json(
        { error: 'Invalid passes data' },
        { status: 400 }
      );
    }

    if (passes.length === 0) {
      return NextResponse.json(
        { error: 'No passes to export' },
        { status: 400 }
      );
    }

    console.log(`Generating PDF for ${passes.length} passes`);

    // Create new PDF document in landscape mode for better table fit
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper functions
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        return format(new Date(dateString), 'dd-MM-yyyy');
      } catch {
        return 'Invalid Date';
      }
    };

    const formatPassId = (pid: number | null | undefined): string => 
      String(pid || '0').padStart(4, '0');

    const formatSecurityClearance = (clearance?: string): string => {
      const clearanceMap: Record<string, string> = {
        'special_branch': 'Special Branch Police',
        'local_police': 'Local Police',
        'na': 'Not Applicable'
      };
      return clearanceMap[clearance || ''] || clearance || 'N/A';
    };

    const truncateText = (text: string, maxLength: number): string => {
      if (!text) return 'N/A';
      return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    };

    // Add header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51); // Dark gray
    doc.text('PAA Employee Pass Database Report', 40, 40);

    // Add generation info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102); // Medium gray
    doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, 40, 65);
    doc.text(`Total Records: ${passes.length}`, 40, 85);

    // Add summary statistics
    const categories = passes.reduce((acc, pass) => {
      acc[pass.category] = (acc[pass.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const expiredCount = passes.filter(pass => 
      pass.dateOfExpiry && new Date(pass.dateOfExpiry) < new Date()
    ).length;

    // FIX 1: Change let to const since yPosition is never reassigned
    const yPosition = 105;
    doc.text(`Categories: ${Object.entries(categories).map(([cat, count]) => 
      `${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count}`).join(', ')}`, 40, yPosition);
    doc.text(`Active: ${passes.length - expiredCount}, Expired: ${expiredCount}`, 40, yPosition + 20);

    // Prepare table data with proper formatting
    const tableData = passes.map((pass: EmployeePass) => [
      formatPassId(pass.passId),
      (pass.category || 'N/A').toUpperCase(),
      truncateText(pass.name || 'N/A', 15),
      truncateText(pass.fatherName || 'N/A', 15),
      formatDate(pass.dateOfBirth),
      truncateText(pass.nationality || 'N/A', 10),
      truncateText(pass.designation || 'N/A', 15),
      truncateText(pass.organization || 'N/A', 15),
      // FIX 2: Replace any with proper type casting
      pass.idNumber || (pass as EmployeePass & { cnic?: string }).cnic || 'N/A',
      pass.mobileNumber || 'N/A',
      truncateText(formatSecurityClearance(pass.securityClearance), 12),
      truncateText(Array.isArray(pass.areaAllowed) ? pass.areaAllowed.join(', ') : 'N/A', 20),
      formatDate(pass.dateOfEntry),
      formatDate(pass.dateOfExpiry),
      (pass.dateOfExpiry && new Date(pass.dateOfExpiry) < new Date()) ? 'EXPIRED' : 'ACTIVE'
    ]);

    const tableHeaders = [
      'Pass ID',
      'Category',
      'Name',
      "Father's Name",
      'DOB',
      'Nationality',
      'Designation',
      'Organization',
      'ID Number',
      'Mobile',
      'Security',
      'Areas',
      'Entry',
      'Expiry',
      'Status'
    ];

    // Use autoTable function directly instead of doc.autoTable
    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 145,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [71, 85, 105], // slate-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 45 }, // Pass ID
        1: { halign: 'center', cellWidth: 50 }, // Category
        2: { cellWidth: 60 }, // Name
        3: { cellWidth: 60 }, // Father's Name
        4: { halign: 'center', cellWidth: 50 }, // DOB
        5: { halign: 'center', cellWidth: 45 }, // Nationality
        6: { cellWidth: 60 }, // Designation
        7: { cellWidth: 60 }, // Organization
        8: { halign: 'center', cellWidth: 65 }, // ID Number
        9: { halign: 'center', cellWidth: 55 }, // Mobile
        10: { cellWidth: 50 }, // Security
        11: { cellWidth: 70 }, // Areas
        12: { halign: 'center', cellWidth: 45 }, // Entry
        13: { halign: 'center', cellWidth: 45 }, // Expiry
        14: { halign: 'center', cellWidth: 45 } // Status
      },
      // FIX 3: Replace any with proper interface
      didDrawCell: (data: AutoTableCellData) => {
        // Highlight expired passes in red
        if (data.column.index === 14 && data.cell.text[0] === 'EXPIRED') {
          doc.setFontSize(7);
          doc.setTextColor(220, 38, 38); // red-600
          doc.setFont('helvetica', 'bold');
          const textWidth = doc.getTextWidth('EXPIRED');
          const cellCenterX = data.cell.x + (data.cell.width / 2);
          doc.text('EXPIRED', cellCenterX - (textWidth / 2), data.cell.y + 12);
        }
        // Reset text color after drawing
        doc.setTextColor(0, 0, 0);
      },
      margin: { top: 145, left: 25, right: 25 },
      pageBreak: 'auto',
      showHead: 'everyPage',
      theme: 'striped'
    });

    // Add footer to all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setLineWidth(1);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(25, pageHeight - 50, pageWidth - 25, pageHeight - 50);
      
      // Footer text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('PAA Employee Pass Database - Confidential Document', 25, pageHeight - 30);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 80, pageHeight - 30);
      
      // Add timestamp
      doc.setFontSize(8);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 25, pageHeight - 15);
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="paa-passes-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}