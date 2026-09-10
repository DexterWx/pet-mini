// pages/order/list.js
// 订单列表：tab(全部/未发货/已发货) + 订单卡片 + 模拟发货(Demo 状态流转)。
const orderService = require('../../services/order.service')
const router = require('../../utils/router')
const config = require('../../config/index')
const format = require('../../utils/format')

Page({
  data: {
    tabs: config.orderTabs,
    activeStatus: '',
    status: 'loading',
    orders: [],
  },

  onLoad (options) {
    this.setData({ activeStatus: options.status || '' })
  },

  onShow () {
    this.load()
  },

  load () {
    this.setData({ status: 'loading' })
    orderService.getList(this.data.activeStatus).then(list => {
      const orders = (list || []).map(o => Object.assign({}, o, {
        statusText: config.orderStatusText[o.status] || o.status,
        totalText: format.formatPrice(o.totalFen),
        timeText: format.formatTime(o.createdAt),
      }))
      this.setData({ orders, status: orders.length ? 'ok' : 'empty' })
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onTab (e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeStatus) return
    this.setData({ activeStatus: key })
    this.load()
  },

  onDetail (e) {
    router.navigate('/pages/order/detail?id=' + e.currentTarget.dataset.id)
  },

  onShip (e) {
    const id = e.currentTarget.dataset.id
    orderService.ship(id).then(() => {
      wx.showToast({ title: '已发货', icon: 'success' })
      this.load()
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    })
  },
})
