import { verifyAccessToken } from '../utils/jwt.js'

const ACCESS_COOKIE = 'admin_at'

export function requireAdmin(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE]
  if (!token) return res.status(401).json({ ok:false, message: 'No session' })
  try {
    const decoded = verifyAccessToken(token)
    req.admin = decoded
    next()
  } catch {
    return res.status(401).json({ ok:false, message: 'Invalid session' })
  }
}
