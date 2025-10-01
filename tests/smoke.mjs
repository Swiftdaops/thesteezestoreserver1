// tests/smoke.mjs
import axios from 'axios'
import FormData from 'form-data'
import { CookieJar } from 'tough-cookie'
import { wrapper } from 'axios-cookiejar-support'

// --- CONFIG ---
const BASE = process.env.API_BASE || 'http://localhost:4000/api'
const ADMIN_USER = process.env.ADMIN_USER || 'admin'   // match your backend env/logic
const ADMIN_PASS = process.env.ADMIN_PASS || 'password'

// util
const log = (title, data) => {
  const msg = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  console.log(`\n=== ${title} ===\n${msg}`)
}
const sleep = (ms)=> new Promise(r=>setTimeout(r,ms))

// build an in-memory tiny PNG so you don't need a file on disk
function tinyPngBuffer() {
  // a 1x1 transparent PNG
  return Buffer.from(
    '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C6360000002000154A24F5D0000000049454E44AE426082',
    'hex'
  )
}

async function main() {
  const jar = new CookieJar()
  const api = wrapper(axios.create({ baseURL: BASE, withCredentials: true, jar }))

  // 0) Public: list products (may be empty on fresh DB)
  try {
    const r0 = await api.get('/products')
    log('PUBLIC: GET /products', r0.data)
  } catch (e) {
    console.error('GET /products failed', e.response?.data || e.message)
  }

  // 1) Admin login
  try {
    const r1 = await api.post('/admin/login', { username: ADMIN_USER, password: ADMIN_PASS })
    log('ADMIN: POST /admin/login', r1.data)
  } catch (e) {
    console.error('Login failed. Check admin creds & server CORS/cookies.', e.response?.data || e.message)
    process.exit(1)
  }

  // 2) Session check
  try {
    const r2 = await api.get('/admin/me')
    log('ADMIN: GET /admin/me', r2.data)
  } catch (e) {
    console.error('GET /admin/me failed', e.response?.data || e.message)
  }

  // 3) Create product (multipart)
  let createdProductId = null
  try {
    const fd = new FormData()
    fd.append('title', 'Smoke Test Tee')
    fd.append('category', 'New Drop') // should trigger ₦35,000 rule
    fd.append('images', tinyPngBuffer(), { filename: 'tiny.png', contentType: 'image/png' })
    // You can append more images if needed:
    // fd.append('images', tinyPngBuffer(), { filename: 'tiny-2.png', contentType: 'image/png' })

    const r3 = await api.post('/admin/products', fd, { headers: fd.getHeaders() })
    log('ADMIN: POST /admin/products', r3.data)
    createdProductId = r3.data?._id || r3.data?.product?._id
  } catch (e) {
    console.error('Create product failed. Multer/Cloudinary config?', e.response?.data || e.message)
  }

  // lightly wait for eventual operations
  await sleep(200)

  // 4) Public list again (should include created product)
  try {
    const r4 = await api.get('/products')
    log('PUBLIC: GET /products (after create)', r4.data)
    if (!createdProductId && r4.data?.items?.length) {
      createdProductId = r4.data.items[0]._id
    }
  } catch (e) {
    console.error('GET /products failed', e.response?.data || e.message)
  }

  // 5) Public like the product
  if (createdProductId) {
    try {
      const r5 = await api.post(`/products/${createdProductId}/like`)
      log('PUBLIC: POST /products/:id/like', r5.data)
    } catch (e) {
      console.error('Like failed', e.response?.data || e.message)
    }
  }

  // 6) Public create order (silent save before WA)
  try {
    const r6 = await api.post('/orders', {
      customerName: 'Obbi Test',
      items: createdProductId ? [{ productId: createdProductId, title: 'Smoke Test Tee', price: 35000, qty: 1 }] : []
    })
    log('PUBLIC: POST /orders', r6.data)
  } catch (e) {
    console.error('Create order failed', e.response?.data || e.message)
  }

  // 7) Admin list orders
  let firstOrderId = null
  try {
    const r7 = await api.get('/admin/orders')
    log('ADMIN: GET /admin/orders', r7.data)
    firstOrderId = r7.data?.items?.[0]?._id || null
  } catch (e) {
    console.error('List orders failed', e.response?.data || e.message)
  }

  // 8) Admin update status
  if (firstOrderId) {
    try {
      const r8 = await api.put(`/admin/orders/${firstOrderId}/status`, { status: 'Shipped' })
      log('ADMIN: PUT /admin/orders/:id/status', r8.data)
    } catch (e) {
      console.error('Update order status failed', e.response?.data || e.message)
    }
  }

  // 9) Admin customers
  try {
    const r9 = await api.get('/admin/customers')
    log('ADMIN: GET /admin/customers', r9.data)
    const cid = r9.data?.items?.[0]?.cid
    if (cid) {
      const r10 = await api.get(`/admin/customers/${cid}`)
      log('ADMIN: GET /admin/customers/:cid', r10.data)
    }
  } catch (e) {
    console.error('Customers endpoints failed', e.response?.data || e.message)
  }

  // 10) Admin analytics
  try {
    const r11 = await api.get('/admin/analytics/overview')
    log('ADMIN: GET /admin/analytics/overview', r11.data)
  } catch (e) {
    console.error('Analytics failed', e.response?.data || e.message)
  }

  // 11) Cleanup: delete product
  if (createdProductId) {
    try {
      const r12 = await api.delete(`/admin/products/${createdProductId}`)
      log('ADMIN: DELETE /admin/products/:id', r12.data)
    } catch (e) {
      console.error('Delete product failed', e.response?.data || e.message)
    }
  }

  console.log('\n✅ Smoke test finished.\n')
}

main().catch(err => {
  console.error('Smoke test crashed', err)
  process.exit(1)
})
