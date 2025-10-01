import { Router } from 'express'
import * as products from '../../controllers/admin/products.controller.js'
import multer from 'multer'
import { requireAdmin } from '../../middleware/auth.js'
import { createProductSchema, updateProductSchema } from '../../validators/product.schema.js'
import { validateBody } from '../../middleware/validate.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per image
  fileFilter: (_req, file, cb) => {
    // accept ANY image/* (jpg, png, webp, heic, heif, etc.)
    if (/^image\//i.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image files are allowed'))
  },
})

const r = Router()
r.get('/', requireAdmin, products.listProducts)
r.post('/', requireAdmin, upload.array('images', 8), validateBody(createProductSchema), products.createProduct)
r.put('/:id', requireAdmin, upload.array('images', 8), validateBody(updateProductSchema), products.updateProduct)
r.delete('/:id', requireAdmin, products.removeProduct)

export default r
