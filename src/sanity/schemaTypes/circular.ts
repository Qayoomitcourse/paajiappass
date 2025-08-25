import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'circular',
  title: 'Circular / Announcement',
  type: 'document',
  icon: InformationCircleIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main headline for the circular (e.g., "Circular No. 101: Updated Security Protocols").',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'string',
      description: 'A brief summary of the circular\'s content (e.g., "Effective from Jan 2025.").',
    }),
    defineField({
      name: 'attachment',
      title: 'Attachment',
      type: 'file',
      description: 'Upload the official circular document, preferably in PDF format.',
      options: {
        accept: '.pdf', // Restrict to PDF for consistency
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      fileName: 'attachment.asset.originalFilename',
    },
    prepare({ title, fileName }) {
      return {
        title: title,
        subtitle: `File: ${fileName}`,
      }
    },
  },
})