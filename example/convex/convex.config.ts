import { defineApp } from 'convex/server'
import mail from '@earthdance/mail/convex.config.js'

// A minimal app that mounts the component, for `convex dev` while working on the library.
const app = defineApp()
app.use(mail)

export default app
