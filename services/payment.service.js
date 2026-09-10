// services/payment.service.js
// 独立支付服务（Mock）：模拟 成功/失败/取消 三种结果，由调用方驱动订单状态流转。
// 未来接微信支付时仅替换本文件实现，页面与订单服务不变。
const config = require('../config/index')

// pay({ amountFen, description }) => Promise<{ result: 'success'|'fail'|'cancel' }>
function pay (options) {
  const opts = options || {}
  if (config.payment.autoSuccess) {
    return Promise.resolve({ result: 'success', amountFen: opts.amountFen })
  }
  return new Promise(resolve => {
    wx.showActionSheet({
      itemList: ['模拟：支付成功', '模拟：支付失败', '模拟：取消支付'],
      success: res => {
        const map = ['success', 'fail', 'cancel']
        resolve({ result: map[res.tapIndex] || 'cancel', amountFen: opts.amountFen })
      },
      fail: () => resolve({ result: 'cancel', amountFen: opts.amountFen }),
    })
  })
}

module.exports = { pay }
