// pages/index/index.js
// 首页：banner + 功能入口 + 为您推荐。页面不写死业务数据，全部来自 services。
const homeService = require('../../services/home.service')
const productService = require('../../services/product.service')
const cartService = require('../../services/cart.service')
const router = require('../../utils/router')

Page({
  data: {
    homeStatus: 'loading',
    recStatus: 'loading',
    banners: [],
    entries: { squares: [], promos: [] },
    recommend: [],
  },

  onLoad () {
    this.loadHome()
    this.loadRecommend()
  },

  onPullDownRefresh () {
    Promise.all([this.loadHome(), this.loadRecommend()])
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  loadHome () {
    this.setData({ homeStatus: 'loading' })
    const onCache = () => this.setData({ homeStatus: 'ok' })
    return Promise.all([
      homeService.getBannersSWR(c => { this.setData({ banners: c }); onCache() }),
      homeService.getEntriesSWR(c => { this.setData({ entries: c }); onCache() }),
    ]).then(([banners, entries]) => {
      const b = banners || []
      const e = entries || { squares: [], promos: [] }
      const empty = !b.length && !e.squares.length && !e.promos.length
      this.setData({ banners: b, entries: e, homeStatus: empty ? 'empty' : 'ok' })
    }).catch(() => {
      this.setData({ homeStatus: 'error' })
    })
  },

  loadRecommend () {
    this.setData({ recStatus: 'loading' })
    return productService.getRecommend().then(list => {
      const l = list || []
      this.setData({ recommend: l, recStatus: l.length ? 'ok' : 'empty' })
    }).catch(() => {
      this.setData({ recStatus: 'error' })
    })
  },

  goSearch () {
    router.navigate('/pages/search/search')
  },

  onSquare (e) {
    const key = e.currentTarget.dataset.key
    if (key === 'buy') wx.switchTab({ url: '/pages/category/category' })
    else if (key === 'orders') router.goRequireLogin('/pages/order/list')
  },

  onPromo (e) {
    const key = e.currentTarget.dataset.key
    if (key === 'contact') router.navigate('/pages/contact/contact')
    else if (key === 'recharge') router.goRequireLogin('/pages/recharge/recharge')
  },

  onCardTap (e) {
    router.navigate('/pages/goods/detail?id=' + e.detail.id)
  },

  onCardAdd (e) {
    cartService.add(e.detail.id, 1).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    })
  },
})
