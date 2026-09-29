// pages/order/list.js
// 订单列表：6 tab（全部/未付款/未发货/待收货/已完成/退款售后）+ 订单卡片。待付款可去支付，待收货可确认收货。商家侧操作已移至管理系统。
const orderService = require('../../services/order.service')
const paymentService = require('../../services/payment.service')
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
        canConfirm: !!o.canConfirm,
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

  // 列表内直接去支付（catchtap 不冒泡到卡片详情）
  onPay (e) {
    const id = e.currentTarget.dataset.id
    paymentService.payOrder(id).then(res => {
      wx.showToast({ title: res.paid ? '支付成功' : '支付未完成', icon: res.paid ? 'success' : 'none' })
      this.load()
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '支付失败', icon: 'none' })
    })
  },

  // 列表内确认收货（catchtap 不冒泡）
  onConfirm (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认收货', content: '确认已收到商品？确认后订单完成，将无法再申请退款。',
      success: res => {
        if (!res.confirm) return
        orderService.confirmReceive(id).then(() => {
          wx.showToast({ title: '已确认收货', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },
})
