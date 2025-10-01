// src/app.js
import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import { onError, notFound } from './middleware/error.js'
import cid from './middleware/cid.js'

// Routers
import productsPublicRouter from './routes/public/products.route.js'
import modelsPublicRouter from './routes/public/models.route.js'
import ordersPublicRouter from './routes/public/orders.route.js'
import authAdminRouter from './routes/admin/auth.route.js'
import productsAdminRouter from './routes/admin/products.route.js'
import ordersAdminRouter from './routes/admin/orders.route.js'
import customersAdminRouter from './routes/admin/customers.route.js'
import analyticsAdminRouter from './routes/admin/analytics.route.js'

const app = express()
const isProd = process.env.NODE_ENV === 'production'

// --- Security / middleware ---
app.set('trust proxy', 1) // if you ever put this behind a reverse proxy

// Helmet (relax CORP so external images/CDN are fine)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// CORS: allow common local hosts + explicit CLIENT_ORIGIN
const allowList = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]
const clientOrigin = process.env.CLIENT_ORIGIN // e.g. http://localhost:5173

app.use(
  cors({
    origin(origin, cb) {
      // allow server-to-server / curl / postman (no Origin header)
      if (!origin) return cb(null, true)
      const ok =
        allowList.some((rx) => rx.test(origin)) ||
        (!!clientOrigin && origin === clientOrigin)
      return ok ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`))
    },
    credentials: true, // <- required for cookie-based auth
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cid'],
  })
)
// Ensure OPTIONS preflight is handled everywhere
app.options('*', cors())

// Parsers & logs
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan(isProd ? 'combined' : 'dev'))

// Attach/ensure CID for every request
app.use(cid)

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- Public routes ---
app.use('/api/products', productsPublicRouter)
app.use('/api/models', modelsPublicRouter)
app.use('/api/orders', ordersPublicRouter)

// --- Admin routes ---
app.use('/api/admin', authAdminRouter)
app.use('/api/admin/products', productsAdminRouter)
app.use('/api/admin/orders', ordersAdminRouter)
app.use('/api/admin/customers', customersAdminRouter)
app.use('/api/admin/analytics', analyticsAdminRouter)

// --- 404 & error handler (order matters) ---
app.use(notFound)
app.use(onError)

export default app
