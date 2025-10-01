// src/middleware/cid.js
// Ensures each browser/request has a stable Customer ID (CID)
// - Accepts from 'x-cid' header or 'cid' cookie
// - Generates a new CID if none provided
// - Sets/refreshes a non-HttpOnly cookie so client can mirror into localStorage

function genCid() {
  const ts = Date.now().toString(36)
  const rnd = Math.random().toString(36).slice(2, 8)
  return `cid_${ts}_${rnd}`
}

export default function cid(req, res, next) {
  try {
    const headerCid = (req.get('x-cid') || '').trim()
    const cookieCid = (req.cookies?.cid || '').trim()
    let cid = headerCid || cookieCid
    if (!cid) cid = genCid()

    // attach for downstream handlers
    req.cid = cid

    // sync cookie if missing or differs
  const isProd = process.env.NODE_ENV === 'production'
    if (cookieCid !== cid) {
      res.cookie('cid', cid, {
        httpOnly: false, // allow frontend to read & sync to localStorage
        // In cross-site contexts (Netlify -> Render), use None in prod so cookie is accepted
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        path: '/',
      })
    }

    return next()
  } catch (e) {
    // Do not block request on CID failure
    return next()
  }
}
