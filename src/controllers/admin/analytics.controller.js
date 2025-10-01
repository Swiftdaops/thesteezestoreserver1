import Order from '../../models/Order.js'
import Product from '../../models/Product.js'

export async function overview(req, res) {
  const orders = await Order.find()
  const revenueTotal = orders.reduce((s,o)=> s + (o.total || 0), 0)
  const ordersCount = orders.length

  const mostLiked = await Product.find().sort({ likes: -1 }).limit(5).select('title likes')
  const topSellersAgg = await Order.aggregate([
    { $unwind: '$items' },
    { $group: { _id: '$items.title', count: { $sum: '$items.qty' } } },
    { $sort: { count: -1 } }, { $limit: 5 },
  ])
  const topSellers = topSellersAgg.map(x => ({ title: x._id, count: x.count }))

  const topCategoriesAgg = await Product.aggregate([
    { $group: { _id: '$category', total: { $sum: 1 } } },
    { $sort: { total: -1 } }, { $limit: 5 }
  ])
  const topCategories = topCategoriesAgg.map(x => ({ category: x._id, total: x.total }))

  res.json({ revenueTotal, ordersCount, mostLiked, topSellers, topCategories })
}
