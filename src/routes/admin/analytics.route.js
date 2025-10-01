// src/routes/admin/analytics.route.js
import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { overview } from '../../controllers/admin/analytics.controller.js' // <-- named import

const r = Router()

r.get('/overview', requireAdmin, overview)

export default r
