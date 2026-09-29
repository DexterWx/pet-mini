// pages/index/index.js
// 首页：banner + 功能入口。页面不写死业务数据，全部来自 services。
const homeService = require('../../services/home.service')
const router = require('../../utils/router')

Page({
  data: {
    homeStatus: 'loading',
    banners: [],
    entries: { squares: [], promos: [] },
  },

  onLoad () {
    this.loadHome()
  },

  // 自定义 tabBar：每次展示时同步选中态（下标须与 app.json tabBar.list 一致）
  onShow () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onPullDownRefresh () {
    this.loadHome()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  loadHome () {
    this.setData({ homeStatus: 'loading' })
    const onCache = () => this.setData({ homeStatus: 'ok' })
    return Promise.all([
      homeService.getBannersSWR(c => { this.setData({ banners: c }); onCache() }),
      homeService.getEntriesSWR(c => { this.setData({ entries: c }); onCache() }),
    ]).then(res => {
      const banners = res[0]
      const entries = res[1]
      const b = banners || []
      const e = entries || { squares: [], promos: [] }
      const empty = !b.length && !e.squares.length && !e.promos.length
      this.setData({ banners: b, entries: e, homeStatus: empty ? 'empty' : 'ok' })
    }).catch(() => {
      this.setData({ homeStatus: 'error' })
    })
  },

  goSearch () {
    router.navigate('/pages/search/search')
  },

  // 点广告牌：配了关联商品则直达商品详情，否则不跳
  onBannerTap (e) {
    const id = e.currentTarget.dataset.id
    if (id) router.navigate('/pages/goods/detail?id=' + id)
  },

  onSquare (e) {
    const key = e.currentTarget.dataset.key
    if (key === 'buy') wx.switchTab({ url: '/pages/category/category' })
    else if (key === 'orders') router.goRequireLogin('/pages/order/list')
  },

  onPromo (e) {
    // 首页已取消“联系我们”入口（客服入口在商品详情底栏与「我的」页），当前仅充值
    const key = e.currentTarget.dataset.key
    if (key === 'recharge') router.goRequireLogin('/pages/recharge/recharge')
  },
})
