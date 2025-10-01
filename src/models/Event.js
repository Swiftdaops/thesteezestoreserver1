import mongoose from 'mongoose'

const ALLOWED_SIZES = ['XL', 'XXL', 'XXXL', 'NOT_SURE']

const EventSchema = new mongoose.Schema({
  customerCid: { type: String, index: true },
  deviceId: String,
  type: {
    type: String,
    enum: [
      'LIKE',
      'UNLIKE',
      'ADD_TO_CART',
      'REMOVE_FROM_CART',
      'CHECKOUT_START',
      'ORDER_CREATED',
    ],
    required: true,
  },
  // Optional structured data (e.g., productId, qty, etc.)
  data: mongoose.Schema.Types.Mixed,

  // Explicit size field for clothing interactions
  size: {
    type: String,
    enum: ALLOWED_SIZES,
    default: 'NOT_SURE',
  },

  ts: { type: Date, default: Date.now },
})

// Helpful compound index: most queries are by customerCid + type
EventSchema.index({ customerCid: 1, type: 1, ts: -1 })
// Ensure a customer can only LIKE a specific product once
EventSchema.index({ customerCid: 1, type: 1, 'data.productId': 1 }, { unique: true })

export default mongoose.model('Event', EventSchema)
