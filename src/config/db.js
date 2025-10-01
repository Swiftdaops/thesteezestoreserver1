import mongoose from 'mongoose'

export default function connectDB(uri) {
  if (!uri) {
    console.error('❌ MONGO_URI not provided')
    process.exit(1)
  }

  mongoose.set('strictQuery', true)

  return mongoose.connect(uri)
    .then(() => {
      console.log('✅ MongoDB connected')
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message)
      process.exit(1)
    })
}
