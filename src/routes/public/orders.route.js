import { Router } from 'express'
import { createOrder } from '../../controllers/public/orders.controller.js'

const r = Router()
r.post('/', createOrder)
export default r
