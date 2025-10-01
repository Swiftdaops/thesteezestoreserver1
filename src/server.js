// src/server.js
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'
import http from 'http'
import mongoose from 'mongoose'
import app from './app.js'

// resolve backend/.env relative to this file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const PORT = Number(process.env.PORT) || 4000
const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing in .env')
  process.exit(1)
}

mongoose.set('strictQuery', true)

async function start() {
  const connect = async () => {
    try {
      const isSrv = MONGO_URI.startsWith('mongodb+srv://')
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 20000,
        // SRV URIs imply TLS with Atlas; keep explicit true for clarity
        tls: isSrv ? true : undefined,
        retryWrites: true,
      })
      console.log('✅ MongoDB connected')
    } catch (err) {
      console.error('❌ Mongo connect failed:', err?.message || err)
      // Retry after short backoff (don’t crash API process)
      setTimeout(connect, 5000)
      return
    }

    const server = http.createServer(app)
    server.listen(PORT, () => {
      console.log(`✅ API listening on http://localhost:${PORT}`)
      if (process.env.CLIENT_ORIGIN) {
        console.log(`🌐 CORS origin: ${process.env.CLIENT_ORIGIN}`)
      }
      console.log('🔎 ENV check:', {
        ADMIN_USER: process.env.ADMIN_USER,
        HAS_HASH: !!process.env.ADMIN_HASHED_PASS,
      })
    })

    const shutdown = async (signal) => {
      console.log(`\n🫡 ${signal} received. Shutting down…`)
      server.close(() => console.log('🔌 HTTP server closed'))
      try { await mongoose.connection.close(); console.log('🗃️  Mongo connection closed') } catch {}
      process.exit(0)
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    // Log runtime mongo errors
    mongoose.connection.on('error', (e) => {
      console.error('🛑 Mongo connection error:', e?.message || e)
    })
  }

  await connect()
}

start()
