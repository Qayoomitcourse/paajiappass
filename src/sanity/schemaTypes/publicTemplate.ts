import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@heroicons/react/24/outline'

export default defineType({
  name: 'publicTemplate',
  title: 'Public Document Template',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main title of the document (e.g., "Application Form").',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'A brief description of what this document is for.',
    }),
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      description: 'Upload the document file here (PDF, DOCX, etc.).',
      options: {
        accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Categorize the document to display it in the correct section.',
      options: {
        list: [
          {title: 'Cargo', value: 'cargo'},
          {title: 'Landside', value: 'landside'},
          {title: 'General', value: 'general'},
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'isPublic',
      title: 'Is Publicly Visible?',
      type: 'boolean',
      description: 'Turn this off to hide the document from the public page without deleting it.',
      initialValue: true,
    }),
    defineField({
      name: 'isRequired',
      title: 'Is this document required?',
      type: 'boolean',
      description: 'If checked, a "Required" badge will be shown next to the document.',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'A smaller number will appear higher in the list (e.g., 1 appears before 10).',
      initialValue: 10,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      fileName: 'file.asset.originalFilename',
    },
    prepare({title, category, fileName}) {
      return {
        title: title,
        subtitle: `${category?.toUpperCase() || 'UNCATEGORIZED'} - ${fileName || 'No file uploaded'}`,
      }
    },
  },
})