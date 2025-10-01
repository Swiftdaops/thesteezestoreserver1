import mongoose from 'mongoose'
import { ALLOWED_SIZES, ORDER_STATUSES } from '../utils/constants.js'

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  price: Number,
  qty: Number,
  size: { type: String, enum: [...ALLOWED_SIZES, 'NOT_SURE'], default: 'NOT_SURE' },
}, { _id: false })

const OrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, default: '' },
  items: { type: [OrderItemSchema], required: true, default: [] },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
  source: { type: String, default: 'WhatsApp' },
}, { timestamps: true })

// 🔧 guard
export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
