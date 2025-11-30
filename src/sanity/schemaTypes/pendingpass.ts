// studio/schemas/pendingPass.ts (Updated version with individual employee tracking)
import { defineType } from 'sanity';

export default defineType({
  name: 'pendingPass',
  title: 'Pending Pass Application',
  type: 'document',
  fields: [
    // Overall application status
    {
      name: 'status',
      title: 'Overall Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending Review', value: 'pending' },
          { title: 'All Approved', value: 'approved' },
          { title: 'All Rejected', value: 'rejected' },
          { title: 'Partially Processed', value: 'partial' }
        ]
      },
      initialValue: 'pending'
    },

    // Processing tracking fields (NEW)
    {
      name: 'processingStatus',
      title: 'Processing Status Message',
      type: 'string',
      description: 'Detailed status about employee processing'
    },
    {
      name: 'employeesProcessed',
      title: 'Employees Processed Count',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'totalEmployees',
      title: 'Total Employees Count',
      type: 'number'
    },
    {
      name: 'lastProcessedAt',
      title: 'Last Processing Date',
      type: 'datetime'
    },

    { name: 'submittedBy', title: 'Submitted By', type: 'string' },

    {
      name: 'organization',
      title: 'Organization',
      type: 'object',
      fields: [
        { name: 'organizationName', title: 'Organization Name', type: 'string' },
        { name: 'organizationHead', title: 'Organization Head', type: 'string' },
        { name: 'headDesignation', title: 'Head Designation', type: 'string' },
        { name: 'companyContact', title: 'Company Contact', type: 'string' },
        { name: 'passCategory', title: 'Pass Category', type: 'string' },
      ],
    },

    { name: 'feeReceipt', title: 'Fee Receipt', type: 'file', options: { accept: '.pdf,image/*' } },

    {
      name: 'employees',
      title: 'Employees',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            // Basic employee info (existing)
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'fatherName', title: 'Father/Husband', type: 'string' },
            { name: 'designation', title: 'Designation', type: 'string' },
            { name: 'idNumber', title: 'CNIC/Passport', type: 'string' },
            { name: 'dateOfBirth', title: 'Date of Birth', type: 'date' },
            { name: 'placeOfBirth', title: 'Place of Birth', type: 'string' },
            { name: 'presentAddress', title: 'Present Address', type: 'text' },
            { name: 'permanentAddress', title: 'Permanent Address', type: 'text' },
            { name: 'mobileNumber', title: 'Mobile', type: 'string' },
            { name: 'email', title: 'Email', type: 'string' },
            { name: 'areaRequired', title: 'Area Required', type: 'array', of: [{ type: 'string' }] },
            { name: 'justification', title: 'Justification', type: 'text' },

            // Documents (existing)
            { name: 'photo', title: 'Photo', type: 'image' },
            { name: 'cnicFront', title: 'CNIC Front', type: 'file' },
            { name: 'cnicBack', title: 'CNIC Back', type: 'file' },
            { name: 'companyCardFront', title: 'Company Card Front', type: 'file' },
            { name: 'companyCardBack', title: 'Company Card Back', type: 'file' },
            { name: 'policeClearance', title: 'Police Clearance', type: 'file' },
            { name: 'localPoliceVerification', title: 'Local Police Verification', type: 'file' },

            // Individual employee status fields (NEW)
            {
              name: 'employeeStatus',
              title: 'Individual Status',
              type: 'string',
              options: {
                list: [
                  { title: 'Pending Review', value: 'pending' },
                  { title: 'Approved', value: 'approved' },
                  { title: 'Rejected', value: 'rejected' }
                ]
              },
              initialValue: 'pending'
            },
            {
              name: 'employeeRemarks',
              title: 'Admin Remarks',
              type: 'text',
              description: 'Specific remarks for this employee'
            },
            {
              name: 'employeeId',
              title: 'Employee ID',
              type: 'string',
              description: 'Unique identifier within application'
            },
            {
              name: 'reviewedAt',
              title: 'Reviewed Date',
              type: 'datetime'
            },
            {
              name: 'reviewedBy',
              title: 'Reviewed By',
              type: 'string'
            },
            {
              name: 'approvedPassRef',
              title: 'Approved Pass Reference',
              type: 'reference',
              to: [{ type: 'employeePass' }],
              description: 'Reference to created employee pass (if approved)'
            }
          ],
        },
      ],
    },

    { name: 'submittedAt', title: 'Submitted At', type: 'datetime' },

    // Keep existing approvedPassRefs for backward compatibility
    {
      name: 'approvedPassRefs',
      title: 'All Approved Pass References',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'employeePass' }] }],
      description: 'All approved employee pass references (auto-populated)'
    },

    { name: 'adminRemarks', title: 'Overall Admin Remarks', type: 'text' },
  ],

  preview: {
    select: {
      title: 'organization.organizationName',
      subtitle: 'organization.passCategory',
      status: 'status',
      employeesCount: 'employees',
      processingStatus: 'processingStatus'
    },
    prepare(selection) {
      const { title, subtitle, status, employeesCount, processingStatus } = selection;
      const count = Array.isArray(employeesCount) ? employeesCount.length : 0;

      return {
        title: title || 'Unnamed Organization',
        subtitle: `${subtitle || 'Unknown Category'} - ${count} employees - ${status}${processingStatus ? ` (${processingStatus})` : ''}`,
      };
    }
  }
});