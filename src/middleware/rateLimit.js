import rateLimit from 'express-rate-limit'

// 5 attempts per 5 minutes for login
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
})
