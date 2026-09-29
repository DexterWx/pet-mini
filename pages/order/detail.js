// pages/order/detail.js
// 订单详情：状态 + 收货/物流信息 + 商品明细 + 待付款去支付/取消 + 售后退款。商家操作已移至管理系统。
const orderService = require('../../services/order.service')
const paymentService = require('../../services/payment.service')
const userService = require('../../services/user.service')
const config = require('../../config/index')
const format = require('../../utils/format')

const AFTER_SALE_TEXT = { PENDING: '退款申请处理中', REJECTED: '退款申请已驳回', REFUNDING: '退款中', REFUNDED: '已退款' }

// 已发货订单的退款倒计时文案（还剩 N 天）；非待收货或无截止时间返回空
function _refundCountdown (o) {
  if (o.status !== 'SHIPPED' || !o.refundDeadlineAt) return ''
  const days = Math.ceil((o.refundDeadlineAt - Date.now()) / 86400000)
  return days > 0 ? ('还剩 ' + days + ' 天可申请退款') : ''
}

Page({
  data: {
    id: '',
    status: 'loading',
    order: null,
  },

  onLoad (options) {
    this.setData({ id: options.id || '' })
    this.load()
  },

  load () {
    if (!this.data.id) {
      this.setData({ status: 'empty' })
      return
    }
    this.setData({ status: 'loading' })
    orderService.getDetail(this.data.id).then(o => {
      const items = (o.items || []).map(it => Object.assign({}, it, {
        priceText: format.formatPrice(it.priceFen),
      }))
      this.setData({
        order: Object.assign({}, o, {
          items,
          statusText: config.orderStatusText[o.status] || o.status,
          deliveryText: config.deliveryTypeText[o.deliveryType] || o.deliveryType,
          totalText: format.formatPrice(o.totalFen),
          // 金额拆分（旧订单无 goodsTotalFen 时回退为总额、运费 0）
          goodsTotalText: format.formatPrice(o.goodsTotalFen == null ? o.totalFen : o.goodsTotalFen),
          freightText: format.formatPrice(o.freightFen || 0),
          hasFreight: !!(o.freightFen > 0),
          timeText: format.formatTime(o.createdAt),
          shipTimeText: o.shippedAt ? format.formatTime(o.shippedAt) : '',
          // 可操作性与提示均由服务端下发（canRefund/canConfirm/refundDeadlineAt）
          canRefund: !!o.canRefund,
          canConfirm: !!o.canConfirm,
          refundCountdownText: _refundCountdown(o),
          completedText: o.status === 'COMPLETED'
            ? (o.completeSource === 'AUTO' ? '发货超期未确认，系统已自动确认收货' : '已确认收货，交易完成')
            : '',
          pendingRefund: !!(o.afterSale && o.afterSale.status === 'PENDING'),
          afterSaleText: o.afterSale ? (AFTER_SALE_TEXT[o.afterSale.status] || '') : '',
        }),
        status: 'ok',
      })
    }).catch(e => {
      this.setData({ status: e.code === 404 ? 'empty' : 'error' })
    })
  },

  // 去支付（待付款）：不混用地选微信支付或余额支付（余额不足时不提供余额选项）
  onPay () {
    const totalFen = (this.data.order && this.data.order.totalFen) || 0
    userService.getBalance().then(b => {
      const balanceFen = (b && b.balanceFen) || 0
      const enough = totalFen > 0 && balanceFen >= totalFen
      const items = ['微信支付']
      if (enough) items.push('余额支付（可用 ¥' + format.formatPrice(balanceFen) + '）')
      wx.showActionSheet({
        itemList: items,
        success: res => this._doPay(res.tapIndex === 1 && enough ? 'balance' : 'wechat'),
      })
    }).catch(() => this._doPay('wechat'))
  },

  _doPay (method) {
    paymentService.payOrder(this.data.id, method).then(res => {
      wx.showToast({ title: res.paid ? '支付成功' : '支付未完成', icon: res.paid ? 'success' : 'none' })
      this.load()
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '支付失败', icon: 'none' })
    })
  },

  // 取消待付款订单
  onCancel () {
    wx.showModal({
      title: '取消订单', content: '确认取消该待付款订单？',
      success: res => {
        if (!res.confirm) return
        orderService.cancelOrder(this.data.id).then(() => {
          wx.showToast({ title: '已取消', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '取消失败', icon: 'none' })
        })
      },
    })
  },

  // 确认收货：SHIPPED -> COMPLETED（终态，不可自助退款，需二次确认）
  onConfirm () {
    wx.showModal({
      title: '确认收货', content: '确认已收到商品？确认后订单完成，将无法再申请退款。',
      success: res => {
        if (!res.confirm) return
        orderService.confirmReceive(this.data.id).then(() => {
          wx.showToast({ title: '已确认收货', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },

  // 用户申请退款（需确认，提交后等待商家处理）
  onApplyRefund () {
    wx.showModal({
      title: '申请退款', content: '确认对该订单申请退款？提交后需等待商家确认。',
      success: res => {
        if (!res.confirm) return
        orderService.applyRefund(this.data.id).then(() => {
          wx.showToast({ title: '已提交退款申请', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },

  // 用户撤回退款申请
  onRevokeRefund () {
    wx.showModal({
      title: '取消退款申请', content: '确认撤回该订单的退款申请？',
      success: res => {
        if (!res.confirm) return
        orderService.revokeRefund(this.data.id).then(() => {
          wx.showToast({ title: '已撤回申请', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },
})
