import Order from '../../models/Order.js'
import Customer from '../../models/Customer.js'
import Event from '../../models/Event.js'
import { createOrderSchema } from '../../validators/order.schema.js'

/**
 * POST /api/orders
 * Silently saves an order (used before redirecting to WhatsApp).
 * Body: { customerName, customerPhone?, items:[{ productId?, title, price, qty, size, category? }] }
 */
export async function createOrder(req, res) {
  try {
    // 1) Validate
    const parsed = createOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ ok:false, message:'Validation failed', issues: parsed.error.issues })
    }
  const { customerName, customerPhone = '', items } = parsed.data
  const cid = (req.cid || '').trim()

    // 2) Totals
    const total = items.reduce((s,i)=> s + (i.price||0)*(i.qty||0), 0)
    const itemCount = items.reduce((s,i)=> s + (i.qty||0), 0)

    // 3) Customer upsert/merge
    const phone = (customerPhone || '').trim()
    let customer = null
    if (phone) {
      customer = await Customer.findOne({
        $or: [{ primaryPhone: phone }, { phones: phone }],
      }).exec()
    }
    // fallback by CID if no phone match
    if (!customer && cid) {
      customer = await Customer.findOne({ $or: [{ cid }, { deviceIds: cid }] }).exec()
    }

    if (!customer) {
      customer = new Customer({ cid: cid || `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}` })
    }
    customer.mergeIdentity({ name: customerName, phone, deviceId: cid })

    // 4) Save order
    const order = await Order.create({
      customerName,
      customerPhone,
      items: items.map(i => ({
        productId: i.productId || undefined,
        title: i.title,
        price: i.price,
        qty: i.qty,
        size: i.size || 'NOT_SURE',
      })),
      total,
      status: 'Pending',
      source: 'WhatsApp',
    })

    // 5) Update customer rollups
    customer.recordOrder(
      total,
      itemCount,
      order.createdAt,
      items.map(i => ({ category: i.category, productId: i.productId, title: i.title, qty: i.qty }))
    )
    await customer.save()

    // 6) (Optional) event log
    try {
      await Event.create({
        customerCid: customer.cid,
        type: 'ORDER_CREATED',
        data: {
          orderId: order._id,
          total,
          itemCount,
          items: order.items.map(li => ({ title: li.title, qty: li.qty, price: li.price, size: li.size })),
        },
        size: 'NOT_SURE',
        ts: order.createdAt,
      })
    } catch (e) {
      console.warn('Event log failed:', e?.message || e)
    }

    return res.status(201).json({ ok:true, orderId: order._id })
  } catch (err) {
    console.error('createOrder error', err)
    return res.status(500).json({ ok:false, message:'Order save failed' })
  }
}
