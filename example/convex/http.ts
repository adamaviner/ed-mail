import { httpRouter } from 'convex/server'
import { mail } from './mail.js'

const http = httpRouter()
mail.registerRoutes(http)
export default http
