// pages/goods/detail.js
// 商品详情：未登录可浏览；加购/购买/收藏触发登录守卫。价格/库存实时来自 API。
const productService = require('../../services/product.service')
const cartService = require('../../services/cart.service')
const userService = require('../../services/user.service')
const contactService = require('../../services/contact.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    id: '',
    status: 'loading',
    goods: null,
    priceText: '',
    currentImg: 0,
    favorited: false,
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
    productService.getDetail(this.data.id).then(g => {
      this.setData({ goods: g, priceText: format.formatPrice(g.priceFen), status: 'ok', currentImg: 0 })
      userService.addRecentViewed(g.id)
      this.loadFavorite()
      wx.setNavigationBarTitle({ title: g.title })
    }).catch(e => {
      this.setData({ status: e.code === 404 ? 'empty' : 'error' })
    })
  },

  loadFavorite () {
    if (!router.isLoggedIn()) return
    userService.getFavorites().then(list => {
      this.setData({ favorited: (list || []).some(p => p.id === this.data.id) })
    }).catch(() => {})
  },

  onSwiperChange (e) {
    this.setData({ currentImg: e.detail.current })
  },

  onService () {
    contactService.openCustomerService()
  },

  goCart () {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  onFavorite () {
    if (!router.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    userService.toggleFavorite(this.data.id).then(r => {
      this.setData({ favorited: r.favorited })
      wx.showToast({ title: r.favorited ? '已收藏' : '已取消收藏', icon: 'none' })
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message, icon: 'none' })
    })
  },

  onAddCart () {
    cartService.add(this.data.id, 1).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    })
  },

  onBuy () {
    const items = [{ productId: this.data.id, qty: 1 }]
    router.goRequireLogin('/pages/order/confirm?items=' + encodeURIComponent(JSON.stringify(items)))
  },
})
