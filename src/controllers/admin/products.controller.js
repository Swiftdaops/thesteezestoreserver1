// src/controllers/admin/products.controller.js
import Product from '../../models/Product.js'
import cloudinary from '../../config/cloudinary.js'
import { computePrice } from '../../utils/pricing.js'

// --- helpers ---
const ALLOWED_SIZES = ['XL','XXL','XXXL']
const parseSizes = (raw) => {
  if (!raw) return ALLOWED_SIZES
  try {
    if (Array.isArray(raw)) return raw.filter(s=>ALLOWED_SIZES.includes(s)).length ? raw : ALLOWED_SIZES
    const s = String(raw).trim()
    const arr = s.startsWith('[') ? JSON.parse(s) : s.split(',').map(v=>v.trim())
    const clean = arr.filter(v=>ALLOWED_SIZES.includes(v))
    return clean.length ? clean : ALLOWED_SIZES
  } catch { return ALLOWED_SIZES }
}

/** GET /api/admin/products */
export async function listProducts(_req, res) {
  const items = await Product.find().sort({ createdAt: -1 })
  res.json({ items })
}

/** POST /api/admin/products (raw image upload, no validation) */
export async function createProduct(req, res) {
  try {
    const { title, category = 'Standard', description = '', price } = req.body || {}
    if (!title) return res.status(400).json({ ok:false, message:'Title required' })
    if (!process.env.CLOUDINARY_URL) return res.status(500).json({ ok:false, message:'Cloudinary not configured' })

    const sizes = parseSizes(req.body?.sizes)
    const files = req.files || []
    if (!files.length) return res.status(400).json({ ok:false, message:'At least one image required (field: images)' })

    // Upload originals; we’ll resize/crop at delivery time via URL transforms
    const uploads = await Promise.all(files.map(file => new Promise((resolve,reject)=>{
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'steezestore/products',
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          timeout: 120000, // 120s
        },
        (err, result) => err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
      )
      stream.on('error', reject)
      stream.end(file.buffer)
    })))

    const finalPrice = (price && Number(price) > 0) ? Number(price) : computePrice(category)
    const doc = await Product.create({ title, description, category, sizes, price: finalPrice, images: uploads })
    res.status(201).json(doc)
  } catch (err) {
    console.error('createProduct error:', err)
    res.status(500).json({ ok:false, message:'Upload failed', detail:String(err?.message || err) })
  }
}

/** DELETE /api/admin/products/:id */
export async function removeProduct(req, res) {
  try {
    const { id } = req.params
    const prod = await Product.findById(id)
    if (!prod) return res.status(404).json({ ok:false, message:'Not found' })
    for (const img of prod.images) {
      try { await cloudinary.uploader.destroy(img.publicId) } catch(e){ console.warn('destroy fail', img.publicId, e?.message) }
    }
    await prod.deleteOne()
    res.json({ ok:true })
  } catch (e) {
    console.error('removeProduct error:', e)
    res.status(500).json({ ok:false, message:'Delete failed' })
  }
}

/** PUT /api/admin/products/:id */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params
    const { title, category = 'Standard', description = '', sizes, price } = req.body
    if (!title) return res.status(400).json({ ok: false, message: 'Title required' })
    
    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ ok: false, message: 'Product not found' })

    // Handle image deletions if any
    let deletePublicIds = []
    try {
      const rawDel = req.body?.deletePublicIds
      if (Array.isArray(rawDel)) {
        // Could be ["id1","id2"] or ["id1,id2"]
        deletePublicIds = rawDel
          .flatMap(v => typeof v === 'string' ? v.split(',') : [])
          .map(s => s.trim())
          .filter(Boolean)
      } else if (typeof rawDel === 'string') {
        const t = rawDel.trim()
        if (t.startsWith('[')) {
          // JSON array as string
          try {
            const arr = JSON.parse(t)
            if (Array.isArray(arr)) {
              deletePublicIds = arr.map(String).map(s=>s.trim()).filter(Boolean)
            }
          } catch {}
        } else {
          // Comma-separated values
          deletePublicIds = t.split(',').map(s=>s.trim()).filter(Boolean)
        }
      }
      // Deduplicate
      deletePublicIds = Array.from(new Set(deletePublicIds))
    } catch {}
    if (deletePublicIds.length) {
      // Remove from Cloudinary
      for (const publicId of deletePublicIds) {
        try {
          await cloudinary.uploader.destroy(publicId)
        } catch (e) {
          console.warn('Failed to delete image:', publicId, e?.message)
        }
      }
      // Remove from product.images
      product.images = product.images.filter(img => !deletePublicIds.includes(img.publicId))
    }

    // Handle new image uploads if any
    const files = req.files || []
    if (files.length) {
      const uploads = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'steezestore/products',
            resource_type: 'image',
            use_filename: true,
            unique_filename: true,
            timeout: 120000,
          },
          (err, result) => err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
        )
        stream.on('error', reject)
        stream.end(file.buffer)
      })))
      product.images.push(...uploads)
    }

    // Update other fields
    product.title = title
    product.description = description
    product.category = category
    product.sizes = parseSizes(sizes)
  product.price = (price && Number(price) > 0) ? Number(price) : computePrice(category)

    await product.save()
    res.json(product)
  } catch (err) {
    console.error('updateProduct error:', err)
    res.status(500).json({ ok: false, message: 'Update failed', detail: String(err?.message || err) })
  }
}
