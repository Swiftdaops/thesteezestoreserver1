import { Router } from 'express'
import { login, me, refresh, logout } from '../../controllers/admin/auth.controller.js'
import { loginSchema } from '../../validators/auth.schema.js'
import { validateBody } from '../../middleware/validate.js'
import { loginLimiter } from '../../middleware/rateLimit.js'

const r = Router()
r.post('/login', loginLimiter, validateBody(loginSchema), login)
r.get('/me', me)
r.post('/refresh', refresh)
r.post('/logout', logout)
export default r
