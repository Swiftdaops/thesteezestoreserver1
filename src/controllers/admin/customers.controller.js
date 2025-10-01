import Customer from '../../models/Customer.js'
import Order from '../../models/Order.js'

export async function listCustomers(req, res) {
  const items = await Customer.find().sort({ updatedAt: -1 }).limit(200)
  res.json({ items })
}

export async function getCustomer(req, res) {
  const { cid } = req.params
  const profile = await Customer.findOne({ cid })
  if (!profile) return res.status(404).json({ ok:false, message:'Not found' })

  const orders = await Order.find({ customerName: profile.latestName }).sort({ createdAt: -1 })
  const rollups = profile.rollups
  const timeline = orders.map(o => ({ type: `ORDER_${o.status.toUpperCase()}`, ts: o.createdAt }))

  res.json({ profile, rollups, timeline })
}
