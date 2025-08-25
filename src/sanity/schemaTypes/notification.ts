// schemas/notification.ts
import {defineField, defineType} from 'sanity'
import {BellIcon} from '@heroicons/react/24/outline'

export default defineType({
  name: 'notification',
  title: 'Site Notification',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main title of the notification (e.g., "System Maintenance").',
      validation: Rule => Rule.required().max(200),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description: 'Detailed description of the notification.',
      validation: Rule => Rule.max(1000),
    }),
    defineField({
      name: 'type',
      title: 'Notification Type',
      type: 'string',
      description: 'The type affects the color and styling of the notification.',
      options: {
        list: [
          {title: 'Info (Blue)', value: 'info'},
          {title: 'Warning (Yellow)', value: 'warning'},
          {title: 'Success (Green)', value: 'success'},
          {title: 'Error (Red)', value: 'error'},
        ],
        layout: 'radio',
      },
      initialValue: 'info',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active?',
      type: 'boolean',
      description: 'Turn this off to hide the notification without deleting it.',
      initialValue: true,
    }),
    defineField({
      name: 'validUntil',
      title: 'Valid Until',
      type: 'date',
      description: 'Optional: Set an expiry date for this notification. Leave empty for permanent notifications.',
      options: {
        dateFormat: 'YYYY-MM-DD',
      },
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'number',
      description: 'Higher priority notifications appear first. Use 1-10 scale.',
      initialValue: 5,
      validation: Rule => Rule.min(1).max(10),
    }),
    defineField({
      name: 'targetAudience',
      title: 'Target Audience',
      type: 'string',
      description: 'Who should see this notification?',
      options: {
        list: [
          {title: 'All Users', value: 'all'},
          {title: 'Public Users Only', value: 'public'},
          {title: 'Logged In Users Only', value: 'authenticated'},
          {title: 'Admin Users Only', value: 'admin'},
        ],
      },
      initialValue: 'all',
    }),
    defineField({
      name: 'showOnPages',
      title: 'Show On Pages',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Specify page paths where this notification should appear. Leave empty to show on all pages.',
      options: {
        list: [
          {title: 'Home Page', value: '/'},
          {title: 'Passes Page', value: '/passes'},
          {title: 'Documents Page', value: '/documents'},
          {title: 'Admin Dashboard', value: '/admin'},
        ],
      },
    }),
    defineField({
      name: 'isDismissible',
      title: 'Can be dismissed?',
      type: 'boolean',
      description: 'Allow users to close/dismiss this notification.',
      initialValue: true,
    }),
    defineField({
      name: 'actionButton',
      title: 'Action Button',
      type: 'object',
      description: 'Optional: Add a button to the notification.',
      fields: [
        defineField({
          name: 'text',
          title: 'Button Text',
          type: 'string',
          validation: Rule => Rule.max(50),
        }),
        defineField({
          name: 'url',
          title: 'Button URL',
          type: 'url',
          description: 'Where the button should link to.',
        }),
        defineField({
          name: 'isExternal',
          title: 'External Link?',
          type: 'boolean',
          description: 'Check if this links to an external website.',
          initialValue: false,
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      isActive: 'isActive',
      validUntil: 'validUntil',
      priority: 'priority',
    },
    prepare({title, type, isActive, validUntil, priority}) {
      const typeEmojiMap: Record<string, string> = {
        info: '🔵',
        warning: '🟡',
        success: '🟢',
        error: '🔴',
      };
      
      const typeEmoji = typeEmojiMap[type] || '🔵';
      const status = isActive ? '✅' : '❌';
      const expired = validUntil && new Date(validUntil) < new Date() ? '⏰ EXPIRED' : '';
      
      return {
        title: `${typeEmoji} ${title}`,
        subtitle: `${status} ${isActive ? 'Active' : 'Inactive'} | Priority: ${priority} ${expired}`,
      }
    },
  },
  orderings: [
    {
      title: 'Priority (High to Low)',
      name: 'priorityDesc',
      by: [
        {field: 'priority', direction: 'desc'},
        {field: '_createdAt', direction: 'desc'}
      ]
    },
    {
      title: 'Created Date (Newest First)',
      name: 'createdDesc',
      by: [{field: '_createdAt', direction: 'desc'}]
    },
    {
      title: 'Status (Active First)',
      name: 'statusDesc',
      by: [
        {field: 'isActive', direction: 'desc'},
        {field: 'priority', direction: 'desc'}
      ]
    },
  ],
})