// services/cart.service.js
// 购物车（服务端按用户存储）。返回的 line 中 price/stock 实时 join 自商品。
const { request } = require('../utils/request')

function getList () {
  return request({ url: '/cart', auth: true })
}

function add (productId, qty) {
  return request({ url: '/cart/add', method: 'POST', auth: true, data: { productId, qty: qty || 1 } })
}

function update (productId, patch) {
  return request({ url: '/cart/update', method: 'POST', auth: true, data: Object.assign({ productId }, patch) })
}

function remove (productId) {
  return request({ url: '/cart/remove', method: 'POST', auth: true, data: { productId } })
}

module.exports = { getList, add, update, remove }
