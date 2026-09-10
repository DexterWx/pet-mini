// pages/order/detail.js
// 订单详情：状态(已付款未发货/已发货) + 商品明细 + 模拟发货(Demo)。
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
})
