// schemas/rejectedEmployee.ts
import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'rejectedEmployee',
  title: 'Rejected Employee',
  type: 'document',
  fieldsets: [
    { name: 'personalDetails', title: 'Personal Details' },
    { name: 'employmentDetails', title: 'Employment Information' },
    { name: 'rejectionDetails', title: 'Rejection Information' },
    { name: 'documents', title: 'Documents', options: { collapsible: true, collapsed: true } }
  ],
  fields: [
    // Personal Details
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
      title: 'CNIC/Passport Number',
      type: 'string',
      validation: Rule => Rule.required(),
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'dateOfBirth',
      title: 'Date of Birth',
      type: 'date',
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'mobileNumber',
      title: 'Mobile Number',
      type: 'string',
      fieldset: 'personalDetails',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      fieldset: 'personalDetails',
    }),

    // Employment Details
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
    defineField({
      name: 'passCategory',
      title: 'Applied Pass Category',
      type: 'string',
      options: {
        list: [
          { title: 'AFU Cargo Pass', value: 'AFU Cargo Pass' },
          { title: 'Landside Pass', value: 'Landside Pass' }
        ]
      },
      fieldset: 'employmentDetails',
    }),
    defineField({
      name: 'areaRequired',
      title: 'Areas Requested',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      fieldset: 'employmentDetails',
    }),

    // Rejection Details
    defineField({
      name: 'rejectionReason',
      title: 'Rejection Reason',
      type: 'text',
      validation: Rule => Rule.required(),
      fieldset: 'rejectionDetails',
    }),
    defineField({
      name: 'rejectedAt',
      title: 'Rejected Date & Time',
      type: 'datetime',
      validation: Rule => Rule.required(),
      fieldset: 'rejectionDetails',
    }),
    defineField({
      name: 'rejectedBy',
      title: 'Rejected By',
      type: 'string',
      fieldset: 'rejectionDetails',
    }),
    defineField({
      name: 'canReapply',
      title: 'Can Reapply',
      type: 'boolean',
      initialValue: true,
      fieldset: 'rejectionDetails',
    }),
    defineField({
      name: 'reapplyAfter',
      title: 'Can Reapply After',
      type: 'date',
      fieldset: 'rejectionDetails',
      hidden: ({ document }) => !document?.canReapply,
    }),

    // Application Reference
    defineField({
      name: 'applicationRef',
      title: 'Original Application',
      type: 'reference',
      to: [{ type: 'pendingPass' }], // Changed from 'pendingApplication' to 'pendingPass'
      fieldset: 'rejectionDetails',
    }),

    // Documents (for record keeping)
    defineField({
      name: 'photo',
      title: 'Employee Photo',
      type: 'image',
      fieldset: 'documents',
    }),
    defineField({
      name: 'cnicFront',
      title: 'CNIC Front',
      type: 'image',
      fieldset: 'documents',
    }),
    defineField({
      name: 'cnicBack',
      title: 'CNIC Back',
      type: 'image',
      fieldset: 'documents',
    }),
    defineField({
      name: 'companyCardFront',
      title: 'Company Card Front',
      type: 'image',
      fieldset: 'documents',
    }),
    defineField({
      name: 'companyCardBack',
      title: 'Company Card Back',
      type: 'image',
      fieldset: 'documents',
    }),
    defineField({
      name: 'policeClearance',
      title: 'Police Clearance',
      type: 'file',
      fieldset: 'documents',
    }),

    // Additional tracking fields
    defineField({
      name: 'rejectionCategory',
      title: 'Rejection Category',
      type: 'string',
      options: {
        list: [
          { title: 'Incomplete Documents', value: 'incomplete_docs' },
          { title: 'Security Clearance Issues', value: 'security_issues' },
          { title: 'Invalid Information', value: 'invalid_info' },
          { title: 'Policy Violation', value: 'policy_violation' },
          { title: 'Other', value: 'other' }
        ]
      },
      fieldset: 'rejectionDetails',
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      description: 'Internal notes for admin use only',
      fieldset: 'rejectionDetails',
    }),
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'organization',
      media: 'photo',
      rejectionReason: 'rejectionReason',
      rejectedAt: 'rejectedAt'
    },
    prepare(selection) {
      const { title, subtitle, media, rejectionReason, rejectedAt } = selection;
      const date = rejectedAt ? new Date(rejectedAt).toLocaleDateString() : 'No date';
      // FIX: Use the 'rejectionReason' to create a more informative subtitle.
      const reasonSnippet = rejectionReason ? ` - ${rejectionReason.substring(0, 40)}...` : '';

      return {
        title: title || 'Unnamed Employee',
        subtitle: `${subtitle || 'No Org'} | Rejected on ${date}${reasonSnippet}`,
        media: media
      };
    }
  },

  orderings: [
    {
      title: 'Rejected Date (Newest First)',
      name: 'rejectedAtDesc',
      by: [{ field: 'rejectedAt', direction: 'desc' }]
    },
    {
      title: 'Name (A-Z)',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }]
    },
    {
      title: 'Organization (A-Z)',
      name: 'organizationAsc',
      by: [{ field: 'organization', direction: 'asc' }]
    }
  ]
});