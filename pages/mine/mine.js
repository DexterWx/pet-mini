// pages/mine/mine.js
// 我的/会员中心：需登录。余额/积分/券为服务端数据；最近浏览为本地 UX 数据。
const authService = require('../../services/auth.service')
const userService = require('../../services/user.service')
const productService = require('../../services/product.service')
const contactService = require('../../services/contact.service')
const router = require('../../utils/router')
const storage = require('../../utils/storage')
const config = require('../../config/index')
const format = require('../../utils/format')

Page({
  data: {
    needLogin: false,
    profileStatus: 'loading',
    user: null,
    balanceText: '0',
    points: 0,
    coupons: 0,
    recent: [],
    mockFail: false,
  },

  onShow () {
    this.setData({ mockFail: storage.get(config.storageKeys.mockFail, false) })
    if (!router.isLoggedIn()) {
      this.setData({ needLogin: true, user: null })
      return
    }
    this.setData({ needLogin: false })
    this.loadProfile()
    this.loadRecent()
  },

  goLogin () {
    wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/mine/mine') })
  },

  loadProfile () {
    // 首屏直接用本地快照/头像昵称缓存渲染（首次登录已采集），无需等待接口；余额等数值仍以接口为准
    const cached = authService.getCachedUser() || authService.getCachedProfile()
    if (cached && (cached.nickname || cached.avatar)) {
      this.setData({
        user: { nickname: cached.nickname || '', avatar: cached.avatar || '' },
        balanceText: '—',
        points: '—',
        coupons: '—',
        profileStatus: 'ok',
      })
    } else {
      this.setData({ profileStatus: 'loading' })
    }
    Promise.all([authService.fetchProfile(), userService.getBalance()]).then(([user, balance]) => {
      this.setData({
        user,
        balanceText: format.formatPrice(balance.balanceFen),
        points: balance.points,
        coupons: balance.coupons,
        profileStatus: 'ok',
      })
    }).catch(() => {
      this.setData({ profileStatus: 'error' })
    })
  },

  loadRecent () {
    const ids = userService.getRecentViewed().slice(0, 6)
    if (!ids.length) {
      this.setData({ recent: [] })
      return
    }
    Promise.all(ids.map(id => productService.getDetail(id).catch(() => null)))
      .then(list => this.setData({ recent: list.filter(Boolean) }))
      .catch(() => this.setData({ recent: [] }))
  },

  goProfile () {
    router.navigate('/pages/profile/profile')
  },

  goOrders (e) {
    const status = (e && e.currentTarget.dataset.status) || ''
    router.goRequireLogin('/pages/order/list?status=' + status)
  },

  goCart () {
    wx.switchTab({ url: '/pages/cart/cart' })
  },

  goRecharge () {
    router.goRequireLogin('/pages/recharge/recharge')
  },

  goContact () {
    router.navigate('/pages/contact/contact')
  },

  onService () {
    contactService.openCustomerService()
  },

  onRecentTap (e) {
    router.navigate('/pages/goods/detail?id=' + e.currentTarget.dataset.id)
  },

  onLogout () {
    wx.showModal({
      title: '提示', content: '确定退出登录？',
      success: res => {
        if (!res.confirm) return
        authService.logout()
        this.setData({ needLogin: true, user: null })
        wx.showToast({ title: '已退出登录', icon: 'none' })
      },
    })
  },

  onMockFailChange (e) {
    const val = e.detail.value
    storage.set(config.storageKeys.mockFail, val)
    this.setData({ mockFail: val })
    wx.showToast({ title: val ? '已开启模拟接口失败' : '已关闭模拟接口失败', icon: 'none' })
  },
})
