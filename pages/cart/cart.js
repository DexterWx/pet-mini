// pages/cart/cart.js
// 购物车：需登录。价格/库存实时来自 API（cart line join 商品），不读本地缓存。
const cartService = require('../../services/cart.service')
const productService = require('../../services/product.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    needLogin: false,
    cartStatus: 'loading',
    recStatus: 'loading',
    lines: [],
    recommend: [],
    allChecked: false,
    checkedCount: 0,
    totalText: '0',
  },

  onShow () {
    if (!router.isLoggedIn()) {
      this.setData({ needLogin: true, lines: [] })
      return
    }
    this.setData({ needLogin: false })
    this.loadCart()
  },

  onLoad () {
    this.loadRecommend()
  },

  goLogin () {
    wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/cart/cart') })
  },

  loadCart () {
    this.setData({ cartStatus: 'loading' })
    cartService.getList().then(lines => {
      const list = (lines || []).map(l => Object.assign({}, l, {
        priceText: format.formatPrice(l.product.priceFen),
      }))
      this.setData({ lines: list, cartStatus: list.length ? 'ok' : 'empty' })
      this.recompute()
    }).catch(() => {
      this.setData({ cartStatus: 'error' })
    })
  },

  loadRecommend () {
    this.setData({ recStatus: 'loading' })
    productService.getRecommend().then(list => {
      const l = list || []
      this.setData({ recommend: l, recStatus: l.length ? 'ok' : 'empty' })
    }).catch(() => this.setData({ recStatus: 'error' }))
  },

  recompute () {
    const lines = this.data.lines
    const checked = lines.filter(l => l.checked)
    const totalFen = checked.reduce((sum, l) => sum + l.product.priceFen * l.qty, 0)
    this.setData({
      allChecked: lines.length > 0 && checked.length === lines.length,
      checkedCount: checked.length,
      totalText: format.formatPrice(totalFen),
    })
  },

  onToggleCheck (e) {
    const id = e.currentTarget.dataset.id
    const line = this.data.lines.find(l => l.productId === id)
    if (!line) return
    cartService.update(id, { checked: !line.checked }).then(lines => this._applyLines(lines))
      .catch(err => { if (err.code !== 401) wx.showToast({ title: err.message, icon: 'none' }) })
  },

  onToggleAll () {
    const target = !this.data.allChecked
    Promise.all(this.data.lines.map(l => cartService.update(l.productId, { checked: target })))
      .then(results => this._applyLines(results[results.length - 1]))
      .catch(err => { if (err.code !== 401) wx.showToast({ title: err.message, icon: 'none' }) })
  },

  onStep (e) {
    const { id, delta } = e.currentTarget.dataset
    const line = this.data.lines.find(l => l.productId === id)
    if (!line) return
    const qty = line.qty + Number(delta)
    cartService.update(id, { qty }).then(lines => this._applyLines(lines))
      .catch(err => { if (err.code !== 401) wx.showToast({ title: err.message, icon: 'none' }) })
  },

  onDelete (e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '提示', content: '确定移除该商品？',
      success: res => {
        if (!res.confirm) return
        cartService.remove(id).then(lines => this._applyLines(lines))
          .catch(err => { if (err.code !== 401) wx.showToast({ title: err.message, icon: 'none' }) })
      },
    })
  },

  _applyLines (lines) {
    const list = (lines || []).map(l => Object.assign({}, l, {
      priceText: format.formatPrice(l.product.priceFen),
    }))
    this.setData({ lines: list, cartStatus: list.length ? 'ok' : 'empty' })
    this.recompute()
  },

  onCheckout () {
    const checked = this.data.lines.filter(l => l.checked)
    if (!checked.length) {
      wx.showToast({ title: '请先选择商品', icon: 'none' })
      return
    }
    const items = checked.map(l => ({ productId: l.productId, qty: l.qty }))
    router.navigate('/pages/order/confirm?items=' + encodeURIComponent(JSON.stringify(items)))
  },

  onCardTap (e) {
    router.navigate('/pages/goods/detail?id=' + e.detail.id)
  },

  onCardAdd (e) {
    cartService.add(e.detail.id, 1).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
      this.loadCart()
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    })
  },
})
