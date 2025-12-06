// /sanity/schemaTypes/paymentReceipt.ts
// This schema stores reusable payment receipts that can be referenced by multiple employee passes

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'paymentReceipt',
  title: 'Payment Receipt',
  type: 'document',
  fields: [
    defineField({
      name: 'receiptNumber',
      title: 'Receipt Number',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Unique receipt/challan number',
    }),
    defineField({
      name: 'organization',
      title: 'Organization Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Company/Organization that made this payment',
    }),
    defineField({
      name: 'totalAmount',
      title: 'Total Amount (PKR)',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Total amount paid in Pakistani Rupees',
    }),
    defineField({
      name: 'dateOfPayment',
      title: 'Date of Payment',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bank',
      title: 'Bank',
      type: 'string',
      options: {
        list: [
          { title: 'HBL (Habib Bank Limited)', value: 'HBL' },
          { title: 'NBP (National Bank of Pakistan)', value: 'NBP' },
          { title: 'Other Bank', value: 'OTHER' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'otherBankName',
      title: 'Other Bank Name',
      type: 'string',
      hidden: ({ parent }) => parent?.bank !== 'OTHER',
      validation: (Rule) => 
        Rule.custom((otherBankName, context) => {
          const parent = context.parent as { bank?: string };
          if (parent?.bank === 'OTHER' && !otherBankName) {
            return 'Please specify the bank name when "Other Bank" is selected';
          }
          return true;
        }),
    }),
    defineField({
      name: 'paymentMethod',
      title: 'Payment Method',
      type: 'string',
      options: {
        list: [
          { title: 'Cash', value: 'CASH' },
          { title: 'Cheque', value: 'CHEQUE' },
          { title: 'Online Transfer', value: 'ONLINE_TRANSFER' },
          { title: 'Bank Draft', value: 'BANK_DRAFT' },
        ],
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'chequeNumber',
      title: 'Cheque/Draft Number',
      type: 'string',
      hidden: ({ parent }) => 
        parent?.paymentMethod !== 'CHEQUE' && parent?.paymentMethod !== 'BANK_DRAFT',
      validation: (Rule) => 
        Rule.custom((chequeNumber, context) => {
          const parent = context.parent as { paymentMethod?: string };
          const method = parent?.paymentMethod;
          if ((method === 'CHEQUE' || method === 'BANK_DRAFT') && !chequeNumber) {
            return 'Cheque/Draft number is required for this payment method';
          }
          return true;
        }),
    }),
    defineField({
      name: 'numberOfEmployees',
      title: 'Number of Employees Covered',
      type: 'number',
      validation: (Rule) => Rule.required().min(1).integer(),
      description: 'Total number of employees covered by this single payment',
      initialValue: 1,
    }),
    defineField({
      name: 'amountPerEmployee',
      title: 'Amount Per Employee (PKR)',
      type: 'string',
      description: 'Individual fee per employee (if applicable)',
    }),
    defineField({
      name: 'receiptImage',
      title: 'Receipt/Challan Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
      description: 'Upload the scanned copy of payment receipt or bank challan',
    }),
    defineField({
      name: 'remarks',
      title: 'Remarks/Notes',
      type: 'text',
      rows: 3,
      description: 'Any additional information about this payment',
    }),
    defineField({
      name: 'fiscalYear',
      title: 'Fiscal Year',
      type: 'string',
      description: 'Year of payment (e.g., 2024-2025)',
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
      description: 'Mark as inactive if this receipt is no longer valid or has been superseded',
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'reference',
      to: [{ type: 'user' }],
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      readOnly: true,
      hidden: true,
    }),
  ],

  preview: {
    select: {
      receiptNumber: 'receiptNumber',
      organization: 'organization',
      amount: 'totalAmount',
      numberOfEmployees: 'numberOfEmployees',
      isActive: 'isActive',
      media: 'receiptImage',
    },
    prepare(selection) {
      const { receiptNumber, organization, amount, numberOfEmployees, isActive, media } = selection;
      const status = isActive ? '✅ Active' : '⛔ Inactive';
      return {
        title: `${receiptNumber} - ${organization}`,
        subtitle: `Rs. ${amount || 'N/A'} • ${numberOfEmployees || 0} employee(s) • ${status}`,
        media,
      };
    },
  },

  orderings: [
    {
      title: 'Receipt Number',
      name: 'receiptNumberAsc',
      by: [{ field: 'receiptNumber', direction: 'asc' }],
    },
    {
      title: 'Date (Newest First)',
      name: 'dateDesc',
      by: [{ field: 'dateOfPayment', direction: 'desc' }],
    },
    {
      title: 'Organization',
      name: 'organizationAsc',
      by: [{ field: 'organization', direction: 'asc' }],
    },
    {
      title: 'Amount (High to Low)',
      name: 'amountDesc',
      by: [{ field: 'totalAmount', direction: 'desc' }],
    },
  ],
});