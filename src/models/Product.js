import mongoose from 'mongoose'
import { ALLOWED_SIZES } from '../utils/constants.js'

const ImageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false }
)

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'Standard' }, // 'Standard' | 'New Drop' | ...
    price: { type: Number, required: true },
    images: { type: [ImageSchema], default: [] },
    likes: { type: Number, default: 0, min: 0 },
    sizes: {
      type: [String],
      enum: ALLOWED_SIZES,
      default: ALLOWED_SIZES,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0 && arr.every((v) => ALLOWED_SIZES.includes(v)),
        message: 'sizes must be any of XL, XXL, XXXL (at least one)',
      },
    },
  },
  { timestamps: true }
)

// 🔧 models guard prevents OverwriteModelError on reloads
export default mongoose.models.Product || mongoose.model('Product', ProductSchema)
