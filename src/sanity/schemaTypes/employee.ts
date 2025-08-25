// /src/sanity/schemaTypes/employee.ts

import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'employeePass',
  title: 'Employee Pass',
  type: 'document',
  fieldsets: [
    { name: 'personalDetails', title: 'Personal Details' },
    { name: 'contactDetails', title: 'Contact & Address Information' },
    { name: 'securityDetails', title: 'Security & Clearance' },
    { name: 'passDetails', title: 'Pass Specifics', options: { collapsible: true, collapsed: false } }
  ],
  fields: [
    // --- PASS DETAILS ---
    defineField({
      name: 'passId',
      title: 'Pass ID',
      type: 'number',
      description: 'System-generated unique Pass ID for the year and category.',
      readOnly: true,
      fieldset: 'passDetails',
      validation: (Rule) => Rule.required().integer().positive(),
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
      description: 'Enter the unique identification number (e.g., 42201-1234567-1).',
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

    // --- PHOTO AND EMPLOYMENT (No Fieldset) ---
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'designation',
      title: 'Designation',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'string',
      validation: Rule => Rule.required(),
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
    
    // --- PASS SPECIFICS (Continued) ---
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

    // --- SYSTEM FIELDS ---
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: { type: 'user' },
      readOnly: true,
    }),
  ],
  // --- (Orderings and Preview are unchanged) ---
});