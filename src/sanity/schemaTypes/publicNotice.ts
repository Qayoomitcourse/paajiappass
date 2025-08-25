import { BellIcon } from '@heroicons/react/24/outline'
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'publicNotice',
  title: 'Public Notice',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main headline of the notice.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'The main content of the notice.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Notice Type',
      type: 'string',
      description: 'Determines the color and icon of the notice banner.',
      options: {
        list: [
          { title: 'Information (Blue)', value: 'info' },
          { title: 'Warning (Yellow)', value: 'warning' },
          { title: 'Success (Green)', value: 'success' },
          { title: 'Error (Red)', value: 'error' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Controls the order in the carousel. Smaller numbers appear first.',
      initialValue: 10,
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active?',
      type: 'boolean',
      description: 'Only active notices will be shown on the website. Uncheck this to hide a notice without deleting it.',
      initialValue: true,
    }),
    defineField({
      name: 'validUntil',
      title: 'Valid Until',
      type: 'datetime',
      description: 'Optional. The notice will automatically hide after this date and time.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      isActive: 'isActive',
      type: 'type',
    },
    prepare({ title, isActive, type }) {
      const status = isActive ? 'Active' : 'Inactive';
      return {
        title: title,
        subtitle: `Type: ${type} | Status: ${status}`,
      }
    },
  },
})