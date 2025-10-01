// src/routes/public/models.route.js
import { Router } from 'express'
import { listModels } from '../../controllers/public/models.controller.js'

const r = Router()

r.get('/', listModels)

export default r
