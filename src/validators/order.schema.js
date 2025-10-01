// src/validators/order.schema.js
import { z } from 'zod'

// Sizes allowed at checkout (product sizes + NOT_SURE for assistance on WhatsApp)
export const SizeEnum = z.enum(['XL', 'XXL', 'XXXL', 'NOT_SURE'])

// Quick ObjectId-like check (optional; don’t hard fail if frontend omits productId)
const objectIdLike = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id').optional()

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, 'Name is required'),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .default('')
    // very light check; keep flexible for intl numbers or WhatsApp links
    .refine(v => v === '' || /^[\d+()\-\s]{7,}$/.test(v), 'Phone format looks invalid'),
  items: z
    .array(
      z.object({
        productId: objectIdLike,         // optional: allow direct buy without id
        title: z.string().trim().min(1), // we persist title for analytics
        price: z.coerce.number().min(0), // coerce "35000" -> 35000
        qty: z.coerce.number().int().min(1),
        size: SizeEnum.default('NOT_SURE'),
        // optional: pass category so Customer.topCategories stays accurate
        category: z.string().trim().optional(),
      })
    )
    .min(1, 'At least one line item required'),
})
