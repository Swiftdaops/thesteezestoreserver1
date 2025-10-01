import bcrypt from 'bcrypt'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../utils/jwt.js'

const isProd = process.env.NODE_ENV === 'production'
const ACCESS_COOKIE = 'admin_at'
const REFRESH_COOKIE = 'admin_rt'

const accessCookieOpts = {
  httpOnly: true, sameSite: 'lax', secure: isProd,
  path: '/api/admin', maxAge: 15 * 60 * 1000
}
const refreshCookieOpts = {
  httpOnly: true, sameSite: 'lax', secure: isProd,
  path: '/api/admin', maxAge: 7 * 24 * 60 * 60 * 1000
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
  res.cookie(ACCESS_COOKIE, at, accessCookieOpts)
     .cookie(REFRESH_COOKIE, rt, refreshCookieOpts)
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
    res.cookie(ACCESS_COOKIE, at, accessCookieOpts).json({ ok:true })
  } catch {
    res.status(401).json({ ok:false, message:'Refresh failed' })
  }
}

export async function logout(req, res) {
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOpts, maxAge: 0 })
     .clearCookie(REFRESH_COOKIE, { ...refreshCookieOpts, maxAge: 0 })
     .json({ ok:true })
}
