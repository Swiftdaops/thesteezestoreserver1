import { Router } from 'express'
import { listPublic, getOne, like } from '../../controllers/public/products.controller.js'

const r = Router()
r.get('/', listPublic)
r.get('/:id', getOne)
r.post('/:id/like', like)
export default r
