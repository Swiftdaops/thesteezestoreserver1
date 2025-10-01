import mongoose from 'mongoose'

const { Schema } = mongoose

// Subdocs with defaults
const TopCategorySchema = new Schema(
  {
    category: { type: String, trim: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const TopProductSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' }, // keep as String if you prefer
    title: { type: String, trim: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const CustomerSchema = new Schema(
  {
    // Identity
    cid: { type: String, required: true, unique: true, index: true },
    latestName: { type: String, default: '', trim: true },

    // Aliases & devices
    aliases: { type: [String], default: [] },
    phones: { type: [String], default: [] },
    primaryPhone: { type: String, default: '' },
    deviceIds: { type: [String], default: [] },

    // Activity timestamps
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastOrderAt: { type: Date },

    // Aggregates (source of truth)
    rollups: {
      orderCount: { type: Number, default: 0, min: 0 },
      totalSpent: { type: Number, default: 0, min: 0 },
      avgBasketSize: { type: Number, default: 0, min: 0 },
      likeCount: { type: Number, default: 0, min: 0 },
    },

    // Leaderboards / prefs
    topCategories: { type: [TopCategorySchema], default: [] },
    topProducts: { type: [TopProductSchema], default: [] },
  },
  {
    timestamps: true, // adds createdAt/updatedAt
    minimize: false,
    toJSON: { virtuals: true, versionKey: false, transform: (_, ret) => { delete ret.__v } },
    toObject: { virtuals: true, versionKey: false },
  }
)

// -------------------------
// Indexes for quick lookups
// -------------------------
CustomerSchema.index({ latestName: 1 })
CustomerSchema.index({ primaryPhone: 1 })
CustomerSchema.index({ phones: 1 })
CustomerSchema.index({ updatedAt: -1 })
CustomerSchema.index({ 'rollups.totalSpent': -1 })
CustomerSchema.index({ 'rollups.orderCount': -1 })

// -----------------------------------
// Virtuals (back-compat with old code)
// -----------------------------------
CustomerSchema.virtual('orderCount').get(function () { return this.rollups?.orderCount ?? 0 })
CustomerSchema.virtual('totalSpent').get(function () { return this.rollups?.totalSpent ?? 0 })
CustomerSchema.virtual('avgBasketSize').get(function () { return this.rollups?.avgBasketSize ?? 0 })
CustomerSchema.virtual('likeCount').get(function () { return this.rollups?.likeCount ?? 0 })

// ---------------------------------------------------------
// Helpers: call these from controllers when events happen
// ---------------------------------------------------------

/**
 * Record a completed order.
 * @param {number} orderTotal - sum of line items (price * qty)
 * @param {number} itemCount - total quantity across items
 * @param {Date}   when - optional timestamp
 * @param {Array<{category?:string, productId?:ObjectId, title?:string, qty?:number}>} lines - optional lines to update top lists
 */
CustomerSchema.methods.recordOrder = function (orderTotal, itemCount = 0, when = new Date(), lines = []) {
  // update rollups
  this.rollups.orderCount = (this.rollups.orderCount ?? 0) + 1
  this.rollups.totalSpent = (this.rollups.totalSpent ?? 0) + (orderTotal || 0)

  // running average basket size (by items)
  const prevCount = (this.rollups.orderCount ?? 1) - 1
  const prevAvg = this.rollups.avgBasketSize ?? 0
  const newAvg = prevCount <= 0 ? (itemCount || 0) : ((prevAvg * prevCount + (itemCount || 0)) / (prevCount + 1))
  this.rollups.avgBasketSize = Number.isFinite(newAvg) ? Number(newAvg.toFixed(2)) : 0

  this.lastOrderAt = when
  this.lastSeenAt = when

  // optional: update top categories/products
  if (Array.isArray(lines) && lines.length) {
    for (const line of lines) {
      if (line?.category) {
        const idx = this.topCategories.findIndex(c => c.category === line.category)
        if (idx >= 0) this.topCategories[idx].count += (line.qty || 1)
        else this.topCategories.push({ category: line.category, count: line.qty || 1 })
      }
      if (line?.productId || line?.title) {
        const keyMatch = (p) => (line.productId && p.productId?.toString() === String(line.productId)) || (line.title && p.title === line.title)
        const idx = this.topProducts.findIndex(keyMatch)
        if (idx >= 0) this.topProducts[idx].count += (line.qty || 1)
        else this.topProducts.push({ productId: line.productId, title: line.title || '', count: line.qty || 1 })
      }
    }
    // keep lists small & sorted
    this.topCategories.sort((a,b)=> b.count - a.count)
    this.topProducts.sort((a,b)=> b.count - a.count)
    this.topCategories = this.topCategories.slice(0, 20)
    this.topProducts = this.topProducts.slice(0, 50)
  }
}

/**
 * Record an engagement (like, view, etc.). Currently bumps likeCount and lastSeenAt.
 * @param {string} type - e.g. 'LIKE'
 */
CustomerSchema.methods.recordEngagement = function (type = 'LIKE') {
  if (type === 'LIKE') {
    this.rollups.likeCount = (this.rollups.likeCount ?? 0) + 1
  }
  this.lastSeenAt = new Date()
}

/**
 * Merge contact info safely (adds alias/phone if new).
 * Keeps primaryPhone if present.
 */
CustomerSchema.methods.mergeIdentity = function ({ name, phone, deviceId } = {}) {
  if (name && name.trim()) {
    const n = name.trim()
    this.latestName = n
    if (!this.aliases.includes(n)) this.aliases.push(n)
  }
  if (phone && phone.trim()) {
    const p = phone.trim()
    if (!this.phones.includes(p)) this.phones.push(p)
    if (!this.primaryPhone) this.primaryPhone = p
  }
  if (deviceId && deviceId.trim()) {
    const d = deviceId.trim()
    if (!this.deviceIds.includes(d)) this.deviceIds.push(d)
  }
  if (!this.firstSeenAt) this.firstSeenAt = new Date()
  this.lastSeenAt = new Date()
}

export default mongoose.model('Customer', CustomerSchema)
