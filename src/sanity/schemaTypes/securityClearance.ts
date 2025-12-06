// /sanity/schemaTypes/securityClearance.ts
// This schema stores reusable security clearance certificates

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'securityClearance',
  title: 'Security Clearance Certificate',
  type: 'document',
  fields: [
    defineField({
      name: 'certificateNumber',
      title: 'Certificate Number',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'organization',
      title: 'Organization Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
      description: 'Company/Organization this certificate is issued for',
    }),
    defineField({
      name: 'clearanceType',
      title: 'Clearance Type',
      type: 'string',
      options: {
        list: [
          { title: 'Special Branch', value: 'special_branch' },
          { title: 'Local Police', value: 'local_police' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'issueDate',
      title: 'Issue Date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'expiryDate',
      title: 'Expiry Date',
      type: 'date',
    }),
    defineField({
      name: 'document',
      title: 'Certificate Document',
      type: 'file',
      validation: (Rule) => Rule.required(),
      description: 'Upload the security clearance certificate',
    }),
    defineField({
      name: 'numberOfEmployees',
      title: 'Number of Employees Covered',
      type: 'number',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'issuingAuthority',
      title: 'Issuing Authority',
      type: 'string',
      description: 'Police station or authority that issued this certificate',
    }),
    defineField({
      name: 'remarks',
      title: 'Remarks',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      initialValue: true,
      description: 'Mark as inactive if expired or no longer valid',
    }),
    defineField({
      name: 'createdBy',
      title: 'Created By',
      type: 'reference',
      to: [{ type: 'user' }],
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'certificateNumber',
      subtitle: 'organization',
      clearanceType: 'clearanceType',
      isActive: 'isActive',
    },
    prepare(selection) {
      const { title, subtitle, clearanceType, isActive } = selection;
      const type = clearanceType === 'special_branch' ? 'Special Branch' : 'Local Police';
      return {
        title: `${title} - ${subtitle}`,
        subtitle: `${type} ${isActive ? '✓ Active' : '✗ Inactive'}`,
      };
    },
  },
});