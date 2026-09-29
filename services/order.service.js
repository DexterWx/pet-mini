// services/order.service.js
// 订单：下单即创建“待付款”订单（PENDING_PAY），支付成功后转 PAID_UNSHIPPED。
// 发货/售后处理属商家侧，由管理系统（/api/v1/admin）处理，小程序不再提供。
const { request } = require('../utils/request')

// 下单：items [{productId, qty}] + { deliveryType, addressId } => 待付款订单
function createOrder (items, options) {
  const opts = options || {}
  return request({
    url: '/orders/create', method: 'POST', auth: true, loading: true,
    data: { items, deliveryType: opts.deliveryType, addressId: opts.addressId },
  })
}

// status 为空表示全部
function getList (status) {
  return request({ url: '/orders', auth: true, data: { status: status || '' } })
}

function getDetail (id) {
  return request({ url: '/orders/' + id, auth: true })
}

// 取消待付款订单：PENDING_PAY -> CLOSED
function cancelOrder (id) {
  return request({ url: '/orders/' + id + '/cancel', method: 'POST', auth: true, loading: true })
}

// 用户确认收货：SHIPPED -> COMPLETED（终态，此后不可自助退款）
function confirmReceive (id) {
  return request({ url: '/orders/' + id + '/confirm', method: 'POST', auth: true, loading: true })
}

// 用户申请退款（整单全额）：PAID_UNSHIPPED/SHIPPED 可申，生成 PENDING 售后单，等商家处理
function applyRefund (id) {
  return request({ url: '/orders/' + id + '/refund', method: 'POST', auth: true, loading: true })
}

// 用户撤回退款申请：删除 PENDING 售后单
function revokeRefund (id) {
  return request({ url: '/orders/' + id + '/refund/revoke', method: 'POST', auth: true, loading: true })
}

module.exports = { createOrder, getList, getDetail, cancelOrder, confirmReceive, applyRefund, revokeRefund }
