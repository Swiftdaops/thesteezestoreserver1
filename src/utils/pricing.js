export function computePrice(category = 'Standard') {
  return category === 'New Drop' ? 35000 : 30000
}
