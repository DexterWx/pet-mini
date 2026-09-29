// services/payment.service.js
// 支付服务。
// - payOrder(orderId, method)：订单支付。method = 'wechat'（默认）| 'balance'，两者不可混用；
//   余额不足后端直接 400，由调用方提示后改走微信。mock/已付时后端即时返回 paid=true。
// - payRecharge(tierId)：余额充值。按档位预下单 + 拉起微信 + 轮询到账（入账由支付回调驱动）。
const { request } = require('../utils/request')

function _requestPayment(payParams) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType || 'RSA',
      paySign: payParams.paySign,
      success: () => resolve(true),
      fail: e => {
        const msg = (e && e.errMsg) || ''
        reject(new Error(msg.indexOf('cancel') >= 0 ? '已取消支付' : '支付失败'))
      },
    })
  })
}

// 支付完成后以服务端订单状态为准，轮询待付款是否已转已付
function _pollPaid(orderId, tries) {
  return request({ url: '/orders/' + orderId, auth: true }).then(o => {
    if (o.status !== 'PENDING_PAY') return true
    if (tries <= 0) return false
    return new Promise(r => setTimeout(r, 800)).then(() => _pollPaid(orderId, tries - 1))
  }).catch(() => false)
}

// 充值到账轮询（入账由后端回调驱动，故必须问服务端而不是本地假定成功）
function _pollRechargePaid(paymentNo, tries) {
  return request({ url: '/user/recharge/record', auth: true, data: { paymentNo } }).then(r => {
    if (r && r.status === 'SUCCESS') return true
    if (tries <= 0) return false
    return new Promise(res => setTimeout(res, 800)).then(() => _pollRechargePaid(paymentNo, tries - 1))
  }).catch(() => false)
}

// 对已创建（待付款）订单发起支付 => Promise<{ paid: boolean }>
function payOrder (orderId, method) {
  return request({
    url: '/orders/' + orderId + '/pay', method: 'POST', auth: true, loading: true,
    data: { method: method || 'wechat' },
  }).then(r => {
    if (r.paid || r.mock) return { paid: true }
    return _requestPayment(r.payParams).then(() => _pollPaid(orderId, 8)).then(paid => ({ paid }))
  })
}

// 按档位充值 => Promise<{ paid: boolean, settledDirect: boolean }>
function payRecharge (tierId) {
  return request({ url: '/user/recharge/prepay', method: 'POST', auth: true, loading: true, data: { tierId } })
    .then(r => {
      // mock provider 即时入账，无需拉起收银台
      if (r.settled || r.mock) return { paid: true, settledDirect: true }
      return _requestPayment(r.payParams)
        .then(() => _pollRechargePaid(r.paymentNo, 8))
        .then(paid => ({ paid, settledDirect: false }))
    })
}

module.exports = { payOrder, payRecharge }
