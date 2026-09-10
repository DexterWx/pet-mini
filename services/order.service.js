// services/order.service.js
// 订单：仅在支付成功后创建（状态=已付款未发货），可模拟发货流转到已发货。
const { request } = require('../utils/request')

// items: [{ productId, qty }]
function createPaidOrder (items) {
  return request({ url: '/orders/create', method: 'POST', auth: true, loading: true, data: { items } })
}

// status 为空表示全部
function getList (status) {
  return request({ url: '/orders', auth: true, data: { status: status || '' } })
}

function getDetail (id) {
  return request({ url: '/orders/' + id, auth: true })
}

// Demo：模拟卖家发货，演示状态流转
function ship (id) {
  return request({ url: '/orders/' + id + '/ship', method: 'POST', auth: true, loading: true })
}

module.exports = { createPaidOrder, getList, getDetail, ship }
