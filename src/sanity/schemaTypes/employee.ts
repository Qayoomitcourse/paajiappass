import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'employeePass',
  title: 'Employee Pass',
  type: 'document',
  fieldsets: [
    { name: 'personalDetails', title: 'Personal Details' },
    { name: 'contactDetails', title: 'Contact & Address Information' },
    { name: 'employmentDetails', title: 'Employment Information' },
    { name: 'passDetails', title: 'Pass Specifics' },
    { name: 'securityDetails', title: 'Security & Clearance' },
    { name: 'feeDetails', title: 'Fee & Payment', options: { collapsible: true, collapsed: false } }
  ],
  fields: [
    // --- PASS DETAILS ---
    defineField({
      name: 'passId',
      title: 'Pass ID',
      type: 'number',
      readOnly: true,
      fieldset: 'passDetails',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Pass Category',
      type: 'string',
      options: { list: ['cargo', 'landside'], layout: 'radio' },
      validation: Rule => Rule.required(),
      initialValue: 'cargo',
      fieldset: 'passDetails',
    }),
    
    // --- PERSONAL DETAILS ---
    defineField({
      name: 'name',
      title: 'Full Name',
      type: 'string',
      validation: Rule => Rule.required(),
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'fatherName',
      title: 'Father\'s Name',
      type: 'string',
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'idNumber',
      title: 'Passport No / CNIC Number',
      type: 'string',
      validation: Rule => Rule.required(),
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'cnic',
      title: 'CNIC (Legacy - for old records)',
      type: 'string',
      fieldset: 'personalDetails',
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'dateOfBirth',
      title: 'Date of Birth',
      type: 'date',
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'placeOfBirth',
      title: 'Place of Birth',
      type: 'string',
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'nationality',
      title: 'Nationality',
      type: 'string',
      initialValue: 'Pakistani',
      fieldset: 'personalDetails',
    }),

    // --- CONTACT DETAILS ---
    defineField({
      name: 'mobileNumber',
      title: 'Mobile Number',
      type: 'string',
      fieldset: 'contactDetails',
    }),
    defineField({
      name: 'permanentAddress',
      title: 'Permanent Address',
      type: 'text',
      rows: 3,
      fieldset: 'contactDetails',
    }),
    defineField({
      name: 'presentAddress',
      title: 'Present Address',
      type: 'text',
      rows: 3,
      fieldset: 'contactDetails',
    }),

    // --- EMPLOYMENT DETAILS ---
    defineField({
      name: 'photo',
      title: 'Employee Photo',
      type: 'image',
      options: { hotspot: true },
      fieldset: 'employmentDetails',
    }),
    defineField({
      name: 'designation',
      title: 'Designation',
      type: 'string',
      validation: Rule => Rule.required(),
      fieldset: 'employmentDetails',
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'string',
      validation: Rule => Rule.required(),
      fieldset: 'employmentDetails',
    }),
    
    // --- PASS SPECIFICS ---
    defineField({
      name: 'areaAllowed',
      title: 'Area(s) Allowed',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      validation: Rule => Rule.required().min(1),
      fieldset: 'passDetails',
    }),
    defineField({
      name: 'dateOfEntry',
      title: 'Date of Entry',
      type: 'date',
      validation: Rule => Rule.required(),
      fieldset: 'passDetails',
    }),
    defineField({
      name: 'dateOfExpiry',
      title: 'Date of Expiry',
      type: 'date',
      validation: Rule => Rule.required(),
      fieldset: 'passDetails',
    }),

    // --- SECURITY DETAILS ---
    defineField({
      name: 'securityClearance',
      title: 'Security Clearance From',
      type: 'string',
      options: {
        list: [
          { title: 'Special Branch Police', value: 'special_branch' },
          { title: 'Local Police', value: 'local_police' },
          { title: 'Not Applicable', value: 'na' },
        ],
        layout: 'radio',
      },
      initialValue: 'na',
      fieldset: 'securityDetails',
    }),
    
    // === UPDATED: Security Documents Field ===
    defineField({
      name: 'securityDocuments',
      title: 'Security Clearance Documents',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'docType',
            type: 'string',
            title: 'Document Type',
            options: {
              list: [
                { title: 'Special Branch', value: 'special_branch' },
                { title: 'Local Police', value: 'local_police' }
              ]
            }
          },
          // !!! ADD THIS FIELD !!!
          {
            name: 'certificateNumber',
            type: 'string',
            title: 'Certificate Number'
          },
          {
            name: 'issueDate',
            type: 'date',
            title: 'Issue Date'
          },
          // Use 'image' type instead of 'file' for easier previews
          {
            name: 'asset', // I changed this from 'document' to 'asset' to match frontend logic easier
            type: 'image',
            title: 'Document Image',
            options: {
              hotspot: true
            }
          }
        ],
        preview: {
          select: {
            title: 'docType',
            subtitle: 'certificateNumber',
            media: 'asset'
          }
        }
      }],
      fieldset: 'securityDetails',
      hidden: ({ document }) => document?.securityClearance === 'na'
    }),
    
    // --- FEE DETAILS ---
    defineField({
      name: 'isExempt',
      title: 'Is Exempt from Payment',
      type: 'boolean',
      initialValue: false,
      fieldset: 'feeDetails',
    }),
    defineField({
      name: 'exemptionRemarks',
      title: 'Exemption Remarks',
      type: 'text',
      fieldset: 'feeDetails',
      hidden: ({ document }) => !document?.isExempt,
    }),
    
    // --- FINANCIAL DETAILS ---
    defineField({
      name: 'financialDetails',
      title: 'Payment Records',
      type: 'array',
      of: [{
        type: 'object',
        title: 'Payment Record',
        fields: [
          {
            name: 'receiptNumber',
            type: 'string',
            title: 'Receipt Number',
            validation: Rule => Rule.required()
          },
          {
            name: 'totalAmount',
            type: 'string',
            title: 'Total Amount',
            validation: Rule => Rule.required()
          },
          {
            name: 'dateOfPayment',
            type: 'date',
            title: 'Date of Payment',
            validation: Rule => Rule.required()
          },
          {
            name: 'bank',
            type: 'string',
            title: 'Bank',
            options: {
              list: ['HBL', 'NBP', 'OTHER']
            },
            validation: Rule => Rule.required()
          },
          {
            name: 'otherBankName',
            type: 'string',
            title: 'Other Bank Name',
            hidden: ({ parent }) => parent?.bank !== 'OTHER'
          },
          {
            name: 'paymentMethod',
            type: 'string',
            title: 'Payment Method',
            options: {
              list: ['CASH', 'CHEQUE', 'ONLINE_TRANSFER', 'BANK_DRAFT']
            },
            initialValue: 'CASH',
            validation: Rule => Rule.required()
          },
          {
            name: 'chequeNumber',
            type: 'string',
            title: 'Cheque/Draft Number',
            hidden: ({ parent }) =>
              !['CHEQUE', 'BANK_DRAFT'].includes(parent?.paymentMethod || '')
          },
          {
            name: 'isMultipleEmployees',
            type: 'boolean',
            title: 'Payment for Multiple Employees',
            initialValue: false
          },
          {
            name: 'employeeCount',
            type: 'number',
            title: 'Number of Employees',
            hidden: ({ parent }) => !parent?.isMultipleEmployees,
            validation: Rule => Rule.min(1)
          },
          {
            name: 'amountPerEmployee',
            type: 'string',
            title: 'Amount Per Employee',
            hidden: ({ parent }) => !parent?.isMultipleEmployees
          },
          {
            name: 'remarks',
            type: 'text',
            title: 'Remarks'
          },
          {
            name: 'receiptImage',
            type: 'image',
            title: 'Receipt Image',
            validation: Rule => Rule.required()
          }
        ]
      }],
      fieldset: 'feeDetails',
      hidden: ({ document }) => Boolean(document?.isExempt),
    }),

    // --- SYSTEM FIELDS ---
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: { type: 'user' },
      readOnly: true,
    }),
  ],
});