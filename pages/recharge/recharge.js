// pages/recharge/recharge.js
// 余额充值：档位来自 API；支付走独立 Payment Service(Mock)，成功后调用充值接口加余额。
const userService = require('../../services/user.service')
const paymentService = require('../../services/payment.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    status: 'loading',
    balanceText: '0',
    tiers: [],
    amount: '',
    giftText: '0',
  },

  onShow () {
    if (!router.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/recharge/recharge') })
      return
    }
    this.load()
  },

  load () {
    this.setData({ status: 'loading' })
    Promise.all([userService.getBalance(), userService.getRechargeTiers()]).then(([balance, tiers]) => {
      this.setData({
        balanceText: format.formatPrice(balance.balanceFen),
        tiers: tiers || [],
        status: 'ok',
      })
      this.recomputeGift()
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onAmount (e) {
    this.setData({ amount: e.detail.value })
    this.recomputeGift()
  },

  onTier (e) {
    const fen = Number(e.currentTarget.dataset.threshold)
    this.setData({ amount: String(fen / 100) })
    this.recomputeGift()
  },

  recomputeGift () {
    const amountFen = format.yuanToFen(this.data.amount)
    let giftFen = 0
    ;(this.data.tiers || []).forEach(t => {
      if (amountFen >= t.thresholdFen && t.giftFen > giftFen) giftFen = t.giftFen
    })
    this.giftFen = giftFen
    this.setData({ giftText: format.formatPrice(giftFen) })
  },

  onPay () {
    const amountFen = format.yuanToFen(this.data.amount)
    if (amountFen <= 0) {
      wx.showToast({ title: '请输入充值金额', icon: 'none' })
      return
    }
    paymentService.pay({ amountFen }).then(r => {
      if (r.result === 'success') {
        userService.recharge(amountFen, this.giftFen || 0).then(() => {
          wx.showToast({ title: '充值成功', icon: 'success' })
          this.load()
        }).catch(err => {
          if (err.code !== 401) wx.showToast({ title: err.message || '充值失败', icon: 'none' })
        })
      } else if (r.result === 'fail') {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' })
      } else {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    })
  },

  onRecords () {
    wx.showToast({ title: '充值记录即将上线', icon: 'none' })
  },
})
