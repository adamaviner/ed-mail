import { mail } from './mail.js'

// A real app checks its own login here. This example lets nobody in.
const nobody = async () => {
  throw new Error('Not allowed')
}

export const { senders, startConnect, updateSender, disconnect, sendTest, retryFailed, messages, searchMessages, message, resend, failureCount, settings, updateSettings, texts, saveText, resetText } =
  mail.adminApi({ requireAdmin: nobody, requireStaff: nobody })
