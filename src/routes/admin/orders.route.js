import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { listOrders, updateOrderStatus } from '../../controllers/admin/orders.controller.js'

const r = Router()
r.get('/', requireAdmin, listOrders)
r.put('/:id/status', requireAdmin, updateOrderStatus)
export default r
