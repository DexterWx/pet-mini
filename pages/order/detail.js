// pages/order/detail.js
// 订单详情：状态 + 商品明细 + 用户退款申请/撤回 + 模拟发货/商家取消(Demo)。
const orderService = require('../../services/order.service')
const config = require('../../config/index')
const format = require('../../utils/format')

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
          totalText: format.formatPrice(o.totalFen),
          timeText: format.formatTime(o.createdAt),
          shipTimeText: o.shippedAt ? format.formatTime(o.shippedAt) : '',
        }),
        status: 'ok',
      })
    }).catch(e => {
      this.setData({ status: e.code === 404 ? 'empty' : 'error' })
    })
  },

  onShip () {
    orderService.ship(this.data.id).then(() => {
      wx.showToast({ title: '已发货', icon: 'success' })
      this.load()
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    })
  },

  // 用户申请退款（需确认，提交后等待商家确认）
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

  // Demo：模拟商家在后台同意退款/取消订单
  onMerchantCancel () {
    wx.showModal({
      title: '模拟商家处理', content: '（Demo）模拟商家在后台同意退款并取消该订单？',
      success: res => {
        if (!res.confirm) return
        orderService.merchantCancel(this.data.id).then(() => {
          wx.showToast({ title: '订单已取消', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },
})
