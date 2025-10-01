import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../utils/jwt.js'

const isProd = process.env.NODE_ENV === 'production'
const ACCESS_COOKIE = 'admin_at'
const REFRESH_COOKIE = 'admin_rt'

// For cross-site admin dashboard (e.g., Netlify frontend to Render backend),
// use SameSite=None and Secure in production so cookies are sent.
const sameSiteValue = isProd ? 'none' : 'lax'
const baseAccessCookieOpts = {
  httpOnly: true, sameSite: sameSiteValue, secure: isProd,
  path: '/api/admin', maxAge: 15 * 60 * 1000
}
const baseRefreshCookieOpts = {
  httpOnly: true, sameSite: sameSiteValue, secure: isProd,
  path: '/api/admin', maxAge: 7 * 24 * 60 * 60 * 1000
}

function cookieOptsFor(req, base) {
  // If the frontend origin is a Netlify domain, pin cookie Domain to that host
  // so when responses are proxied through Netlify, cookies are set for the
  // site origin (first-party for Safari).
  try {
    const origin = req.get('origin') || ''
    const h = new URL(origin).hostname
    if (h && /\.netlify\.app$/.test(h)) {
      return { ...base, domain: h }
    }
  } catch {}
  return base
}

export async function login(req, res) {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ ok:false, message: 'Missing credentials' })
  const ADMIN_USER = process.env.ADMIN_USER
  const ADMIN_HASHED_PASS = process.env.ADMIN_HASHED_PASS
  if (!ADMIN_USER || !ADMIN_HASHED_PASS) return res.status(500).json({ ok:false, message:'Auth not configured' })
  if (username !== ADMIN_USER) return res.status(401).json({ ok:false, message:'Invalid credentials' })

  const valid = await bcrypt.compare(password, ADMIN_HASHED_PASS)
  if (!valid) return res.status(401).json({ ok:false, message:'Invalid credentials' })

  const payload = { sub:'admin', username }
  const at = signAccessToken(payload)
  const rt = signRefreshToken(payload)
  res.cookie(ACCESS_COOKIE, at, cookieOptsFor(req, baseAccessCookieOpts))
    .cookie(REFRESH_COOKIE, rt, cookieOptsFor(req, baseRefreshCookieOpts))
     .json({ ok:true, user:{ username } })
}

export async function me(req, res) {
  const token = req.cookies?.[ACCESS_COOKIE]
  if (!token) return res.status(401).json({ ok:false, message:'No session' })
  try {
    const decoded = verifyAccessToken(token)
    res.json({ ok:true, user:{ username: decoded.username || 'admin' } })
  } catch {
    res.status(401).json({ ok:false, message:'Invalid session' })
  }
}

export async function refresh(req, res) {
  const rt = req.cookies?.[REFRESH_COOKIE]
  if (!rt) return res.status(401).json({ ok:false, message:'No refresh token' })
  try {
    const decoded = verifyRefreshToken(rt)
    const at = signAccessToken({ sub:'admin', username: decoded.username || 'admin' })
    res.cookie(ACCESS_COOKIE, at, cookieOptsFor(req, baseAccessCookieOpts)).json({ ok:true })
  } catch {
    res.status(401).json({ ok:false, message:'Refresh failed' })
  }
}

export async function logout(req, res) {
  const ac = { ...cookieOptsFor(req, baseAccessCookieOpts), maxAge: 0 }
  const rc = { ...cookieOptsFor(req, baseRefreshCookieOpts), maxAge: 0 }
  res.clearCookie(ACCESS_COOKIE, ac)
     .clearCookie(REFRESH_COOKIE, rc)
     .json({ ok:true })
}
