// src/middleware/error.js
export const notFound = (req, res, next) => {
  res.status(404).json({ ok: false, message: 'Not Found' })
}

// canonical name
export const onError = (err, req, res, next) => {
  console.error('❌ Error:', err)
  res.status(err.status || 500).json({ ok: false, message: err.message || 'Server error' })
}

// alias to match your app.js usage
export const errorHandler = onError
