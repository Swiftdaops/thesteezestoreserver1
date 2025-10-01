import Order from '../../models/Order.js'

/**
 * GET /api/admin/orders
 * Returns most recent orders first (includes line-item size).
 */
export async function listOrders(req, res) {
  const items = await Order.find().sort({ createdAt: -1 }).lean()
  res.json({ items })
}

/**
 * PUT /api/admin/orders/:id/status
 * Body: { status: 'Pending' | 'Shipped' | 'Delivered' }
 */
export async function updateOrderStatus(req, res) {
  const { id } = req.params
  const { status } = req.body || {}
  const allowed = ['Pending', 'Shipped', 'Delivered']
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok:false, message:'Invalid status' })
  }
  const doc = await Order.findByIdAndUpdate(id, { status }, { new: true }).lean()
  if (!doc) return res.status(404).json({ ok:false, message:'Not found' })
  return res.json({ ok:true })
}
