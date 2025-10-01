import { z } from 'zod'

export const ALLOWED_SIZES = ['XL', 'XXL', 'XXXL']

// helper: turn JSON string or CSV into array
const coerceSizes = z.preprocess((val) => {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return undefined
    try {
      // try JSON first: '["XL","XXL"]'
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    // fallback: CSV 'XL,XXL'
    return s.split(',').map(v => v.trim()).filter(Boolean)
  }
  return undefined
}, z.array(z.enum(ALLOWED_SIZES)).nonempty().default(ALLOWED_SIZES))

// price: coerce from string/number to positive number
const coercePrice = z.preprocess((val) => {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = Number(val)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}, z.number().positive('Price must be a positive number'))

export const createProductSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.preprocess((v) => (typeof v === 'string' && v.trim()) || 'Standard', z.string().min(1)),
  description: z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string().default('')),
  price: coercePrice,
  sizes: coerceSizes,
})

export const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.preprocess((v) => (typeof v === 'string' && v.trim()) || undefined, z.string().min(1)).optional(),
  description: z.preprocess((v) => (typeof v === 'string' ? v : undefined), z.string()).optional(),
  price: coercePrice.optional(),
  sizes: coerceSizes.optional(),
  deletePublicIds: z.preprocess((v) => {
    if (Array.isArray(v)) return v
    if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
    return undefined
  }, z.array(z.string())).optional(),
})
