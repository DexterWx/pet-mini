// pages/recharge/records.js
// 我的充值记录：仅用户真实充值（source=USER 且已到账），倒序分页。
// 后台手动调余额（source=ADMIN）不在此展示（内部调账，不应暴露给用户）。
const userService = require('../../services/user.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    status: 'loading',
    list: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
  },

  onShow () {
    if (!router.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/recharge/records') })
      return
    }
    this.setData({ list: [], page: 1, hasMore: true })
    this.load()
  },

  load () {
    if (this.data.status === 'loading' && this.data.page > 1) return
    this.setData({ status: this.data.page === 1 ? 'loading' : this.data.status })
    userService.getRechargeRecords({ page: this.data.page, pageSize: this.data.pageSize }).then(res => {
      const rows = (res.list || []).map(r => Object.assign({}, r, {
        timeText: format.formatTime(r.paidAt || r.createdAt),
        amountText: format.formatPrice(r.amountFen),
        giftText: format.formatPrice(r.giftFen),
        totalText: format.formatPrice(r.amountFen + r.giftFen),
      }))
      const list = this.data.page === 1 ? rows : this.data.list.concat(rows)
      this.setData({
        list,
        hasMore: list.length < (res.total || 0),
        status: list.length ? 'ok' : 'empty',
      })
    }).catch(() => {
      this.setData({ status: this.data.list.length ? this.data.status : 'error' })
    })
  },

  onReachBottom () {
    if (!this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.load()
  },

  goRecharge () {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/recharge/recharge' }) })
  },
})
