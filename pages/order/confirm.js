// pages/order/confirm.js
// 确认订单：实时拉取商品价格/库存 -> 发起 Mock 支付 -> 成功后创建已付款订单。
const productService = require('../../services/product.service')
const paymentService = require('../../services/payment.service')
const orderService = require('../../services/order.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    status: 'loading',
    lines: [],
    totalText: '0',
  },

  onLoad (options) {
    let items = []
    try {
      items = JSON.parse(decodeURIComponent(options.items || '[]'))
    } catch (e) {
      items = []
    }
    this.items = Array.isArray(items) ? items : []
    this.load()
  },

  load () {
    if (!this.items.length) {
      this.setData({ status: 'empty' })
      return
    }
    this.setData({ status: 'loading' })
    Promise.all(this.items.map(it =>
      productService.getDetail(it.productId).then(g => ({
        productId: g.id, title: g.title, image: g.images[0],
        priceFen: g.priceFen, stock: g.stock, qty: Number(it.qty) || 1,
        priceText: format.formatPrice(g.priceFen),
      })).catch(() => null)
    )).then(lines => {
      const list = lines.filter(Boolean)
      if (!list.length) {
        this.setData({ status: 'empty' })
        return
      }
      const totalFen = list.reduce((s, l) => s + l.priceFen * l.qty, 0)
      this.totalFen = totalFen
      this.setData({ lines: list, totalText: format.formatPrice(totalFen), status: 'ok' })
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onSubmit () {
    paymentService.pay({ amountFen: this.totalFen }).then(r => {
      if (r.result === 'success') {
        orderService.createPaidOrder(this.items).then(order => {
          wx.showToast({ title: '支付成功', icon: 'success' })
          router.redirectTo('/pages/order/detail?id=' + order.id)
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '下单失败', icon: 'none' })
        })
      } else if (r.result === 'fail') {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' })
      } else {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    })
  },
})
