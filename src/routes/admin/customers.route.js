import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import { listCustomers, getCustomer } from '../../controllers/admin/customers.controller.js'

const r = Router()
r.get('/', requireAdmin, listCustomers)
r.get('/:cid', requireAdmin, getCustomer)
export default r
