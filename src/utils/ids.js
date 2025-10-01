export const toCid = (phone = '', name = '') => {
  const base = (phone || name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20)
  const rand = Math.random().toString(36).slice(2,6)
  return `${base}-${rand}`
}
