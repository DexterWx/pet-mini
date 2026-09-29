// pages/order/confirm.js
// 确认订单：实时拉取商品价格 -> 选收货地址/配送方式/支付方式 -> 建待付款单 -> 按所选方式支付。
// 金额明细必须透明：商品金额 + 运费 = 应付总额（前端预估，下单时服务端按同一规则重算并快照）。
// 支付方式不可混用：余额不足则不允选余额，只能整单走微信支付。
const productService = require('../../services/product.service')
const paymentService = require('../../services/payment.service')
const orderService = require('../../services/order.service')
const addressService = require('../../services/address.service')
const userService = require('../../services/user.service')
const shippingService = require('../../services/shipping.service')
const router = require('../../utils/router')
const config = require('../../config/index')
const format = require('../../utils/format')

Page({
  data: {
    status: 'loading',
    lines: [],
    goodsTotalText: '0',
    freightText: '0',
    totalText: '0',
    shipTip: '',
    address: null,
    deliveryType: config.deliveryType.EXPRESS,
    deliveryOptions: [
      { key: config.deliveryType.EXPRESS, label: config.deliveryTypeText.EXPRESS },
      { key: config.deliveryType.SELF_PICKUP, label: config.deliveryTypeText.SELF_PICKUP },
    ],
    payMethod: 'wechat',
    balanceFen: 0,
    balanceEnough: true,
    payTip: '',
    submitText: '提交订单并支付',
  },

  onLoad (options) {
    let items = []
    try {
      items = JSON.parse(decodeURIComponent(options.items || '[]'))
    } catch (e) {
      items = []
    }
    this.items = Array.isArray(items) ? items : []
    this.addresses = []
    this.goodsTotalFen = 0
    this.totalFen = 0
    this.loadProducts()
    this.loadBalance()
    this.loadShipping()
  },

  // 运费规则（仅用于展示与预估；下单时服务端重算）
  loadShipping () {
    shippingService.getConfig().then(cfg => {
      this.shipping = cfg
      this._recomputeAmounts()
    }).catch(() => {})
  },

  // 从地址管理页返回时刷新地址（保留当前选择，否则默认地址）
  onShow () {
    this.loadAddress()
  },

  loadProducts () {
    if (!this.items.length) {
      this.setData({ status: 'empty' })
      return
    }
    this.setData({ status: 'loading' })
    Promise.all(this.items.map(it =>
      productService.getDetail(it.productId).then(g => ({
        productId: g.id, title: g.title, image: g.images[0],
        priceFen: g.priceFen, qty: Number(it.qty) || 1,
        priceText: format.formatPrice(g.priceFen),
      })).catch(() => null)
    )).then(lines => {
      const list = lines.filter(Boolean)
      if (!list.length) {
        this.setData({ status: 'empty' })
        return
      }
      const goodsTotalFen = list.reduce((s, l) => s + l.priceFen * l.qty, 0)
      this.goodsTotalFen = goodsTotalFen
      this.setData({ lines: list, status: 'ok' })
      this._recomputeAmounts()
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  // 商品金额 + 运费 = 应付总额；配送方式或运费规则变化时重算
  _recomputeAmounts () {
    const goodsTotalFen = this.goodsTotalFen || 0
    const freightFen = shippingService.calcFreight(this.shipping, goodsTotalFen, this.data.deliveryType)
    this.totalFen = goodsTotalFen + freightFen
    this.setData({
      goodsTotalText: format.formatPrice(goodsTotalFen),
      freightText: format.formatPrice(freightFen),
      totalText: format.formatPrice(this.totalFen),
      shipTip: shippingService.freightTip(this.shipping, goodsTotalFen, this.data.deliveryType),
    })
    this._refreshPay()
  },

  loadBalance () {
    return userService.getBalance().then(b => {
      this.setData({ balanceFen: (b && b.balanceFen) || 0 })
      this._refreshPay()
    }).catch(() => {})
  },

  onPayMethodTap (e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.payMethod) return
    if (key === 'balance' && !this.data.balanceEnough) {
      wx.showToast({ title: '余额不足，请选微信支付', icon: 'none' })
      return
    }
    this.setData({ payMethod: key })
    this._refreshPay()
  },

  // 根据总额与余额重算“能否用余额”、提示文案与提交按钮文案
  _refreshPay () {
    const totalFen = this.totalFen || 0
    const balanceFen = this.data.balanceFen
    const enough = totalFen > 0 && balanceFen >= totalFen
    const balanceText = format.formatPrice(balanceFen)
    let payTip
    if (enough) {
      payTip = '可用余额 ¥' + balanceText + '，本次支付后剩 ¥' + format.formatPrice(balanceFen - totalFen)
    } else {
      payTip = '余额不足（需 ¥' + this.data.totalText + '，当前 ¥' + balanceText + '），请选微信支付'
    }
    const payMethod = enough ? this.data.payMethod : 'wechat'
    const payLabel = payMethod === 'balance' ? '余额支付' : '微信支付'
    this.setData({
      balanceEnough: enough,
      payMethod: payMethod,
      payTip: payTip,
      submitText: payLabel + ' ¥' + this.data.totalText,
    })
  },

  loadAddress () {
    addressService.getList().then(list => {
      const addrs = list || []
      this.addresses = addrs
      const keep = this.data.address && addrs.filter(a => a.id === this.data.address.id)[0]
      const def = keep || addrs.filter(a => a.isDefault)[0] || addrs[0] || null
      this.setData({ address: def })
    }).catch(() => {})
  },

  onChooseAddress () {
    const addrs = this.addresses || []
    if (!addrs.length) {
      router.goRequireLogin('/pages/address/list')
      return
    }
    if (addrs.length === 1) return
    wx.showActionSheet({
      itemList: addrs.map(a => a.receiverName + ' ' + a.phone + ' ' + (a.address || '')),
      success: res => {
        const a = addrs[res.index]
        if (a) this.setData({ address: a })
      },
    })
  },

  onManageAddress () {
    router.goRequireLogin('/pages/address/list')
  },

  onDeliveryTap (e) {
    this.setData({ deliveryType: e.currentTarget.dataset.key })
    // 自提免运费，切换配送方式必须重算金额
    this._recomputeAmounts()
  },

  onSubmit () {
    const addr = this.data.address
    if (!addr) {
      wx.showToast({ title: '请先添加收货地址', icon: 'none' })
      return
    }
    if (this.data.deliveryType === config.deliveryType.EXPRESS && !addr.address) {
      wx.showToast({ title: '快递订单需填写完整收货地址', icon: 'none' })
      return
    }
    // 先建待付款单 -> 按所选方式支付；支付取消/失败仍跳详情，可在订单里继续支付
    const payMethod = this.data.payMethod
    orderService.createOrder(this.items, {
      deliveryType: this.data.deliveryType, addressId: addr.id,
    }).then(order => {
      paymentService.payOrder(order.id, payMethod).then(res => {
        wx.showToast({ title: res.paid ? '支付成功' : '待支付', icon: res.paid ? 'success' : 'none' })
        router.redirectTo('/pages/order/detail?id=' + order.id)
      }).catch(payErr => {
        wx.showToast({ title: payErr.message || '支付未完成', icon: 'none' })
        router.redirectTo('/pages/order/detail?id=' + order.id)
      })
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '下单失败', icon: 'none' })
    })
  },
})
