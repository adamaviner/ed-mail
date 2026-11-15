import { defineMailConfig } from '@earthdance/mail/core'

// The registry of every email this app sends (src/lib/mail/config.ts in ed-schedule).
export const mailConfig = defineMailConfig({
  senders: { accounts: { title: 'Account emails' } },
  kinds: {
    'accounts.welcome': {
      sender: 'accounts',
      title: 'Welcome',
      when: 'When someone signs up.',
      text: { builtIn: { subject: 'Welcome, {name}', body: '<p>Hello {name}.</p>' }, placeholders: [{ key: 'name', label: 'Name' }] },
    },
  },
})
