export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: 'Validation failed', issues: parsed.error.issues })
  }
  req.body = parsed.data
  next()
}
