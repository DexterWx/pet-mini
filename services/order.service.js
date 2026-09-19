// services/order.service.js
// 订单：仅在支付成功后创建（状态=已付款未发货）。
// 状态流转：PAID_UNSHIPPED -> REFUND_REQUESTED（用户申请退款，可撤回）-> CANCELLED（商家同意/直接取消）；或 -> SHIPPED（发货）。
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

// 用户申请退款：PAID_UNSHIPPED -> REFUND_REQUESTED
function applyRefund (id) {
  return request({ url: '/orders/' + id + '/refund', method: 'POST', auth: true, loading: true })
}

// 用户撤回退款申请：REFUND_REQUESTED -> PAID_UNSHIPPED
function revokeRefund (id) {
  return request({ url: '/orders/' + id + '/refund/revoke', method: 'POST', auth: true, loading: true })
}

// Demo：模拟商家后台同意退款/直接取消 -> CANCELLED（真实场景由 web 后台调用）
function merchantCancel (id) {
  return request({ url: '/orders/' + id + '/cancel', method: 'POST', auth: true, loading: true })
}

module.exports = { createPaidOrder, getList, getDetail, ship, applyRefund, revokeRefund, merchantCancel }
