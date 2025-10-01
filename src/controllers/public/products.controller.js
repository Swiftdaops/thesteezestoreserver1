import Product from '../../models/Product.js'
import Event from '../../models/Event.js'

export async function listPublic(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10))
  const limit = Math.min(50, parseInt(req.query.limit || '24', 10))
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(),
  ])

  res.json({ items, page, total })
}

export async function getOne(req, res) {
  const { id } = req.params
  const doc = await Product.findById(id)
  if (!doc) return res.status(404).json({ ok: false, message: 'Not found' })
  res.json(doc)
}

export async function like(req, res) {
  const { id } = req.params
  const cid = req.cid || (req.get('x-cid') || '').trim()
  const product = await Product.findById(id)
  if (!product) return res.status(404).json({ ok: false, message: 'Not found' })

  try {
    // Insert a like event; if it violates unique index, this will throw
    await Event.create({ customerCid: cid || 'anon', type: 'LIKE', data: { productId: product._id } })
    // First like by this CID for this product: increment counter
    const updated = await Product.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
    return res.json({ ok: true, likes: updated.likes, firstTime: true })
  } catch (e) {
    // Duplicate like - return current count without incrementing
    if (e?.code === 11000) {
      return res.json({ ok: true, likes: product.likes, firstTime: false })
    }
    console.error('like error', e)
    return res.status(500).json({ ok: false, message: 'Like failed' })
  }
}
