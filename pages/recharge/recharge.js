// pages/recharge/recharge.js
// 余额充值：金额与赠送额均来自管理后台配置的档位，用户只能点选（不可自输金额）。
// 支付走真实微信支付（本地 PAYMENT_PROVIDER=mock 时后端即时入账），到账一律以服务端为准。
const userService = require('../../services/user.service')
const paymentService = require('../../services/payment.service')
const router = require('../../utils/router')
const format = require('../../utils/format')

Page({
  data: {
    status: 'loading',
    balanceText: '0',
    tiers: [],
    selectedId: null,
    amountText: '0',
    giftText: '0',
    totalText: '0',
    payText: '请选择充值档位',
    paying: false,
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
    Promise.all([userService.getBalance(), userService.getRechargeTiers()]).then(res => {
      const balance = res[0] || { balanceFen: 0 }
      const tiers = res[1] || []
      this.setData({
        balanceText: format.formatPrice(balance.balanceFen),
        tiers: tiers,
        status: tiers.length ? 'ok' : 'empty',
      })
      // 默认选中第一个档位，减少一次点击
      this._selectTier(tiers.length ? tiers[0] : null)
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onTier (e) {
    const id = e.currentTarget.dataset.id
    const tier = this.data.tiers.filter(t => t.id === id)[0]
    if (tier) this._selectTier(tier)
  },

  // 按选定档位刷新明细：实充 / 赠送 / 到账合计（金额单位为分，展示转元）
  _selectTier (tier) {
    if (!tier) {
      this.setData({ selectedId: null, amountText: '0', giftText: '0', totalText: '0', payText: '请选择充值档位' })
      return
    }
    this.selectedTier = tier
    const amountText = format.formatPrice(tier.thresholdFen)
    const giftText = format.formatPrice(tier.giftFen)
    const totalText = format.formatPrice(tier.thresholdFen + tier.giftFen)
    this.setData({
      selectedId: tier.id,
      amountText: amountText,
      giftText: giftText,
      totalText: totalText,
      payText: '微信支付 ¥' + amountText + '　到账 ¥' + totalText,
    })
  },

  onPay () {
    const tier = this.selectedTier
    if (!tier) {
      wx.showToast({ title: '请先选择充值档位', icon: 'none' })
      return
    }
    if (this.data.paying) return
    this.setData({ paying: true })
    paymentService.payRecharge(tier.id).then(r => {
      this.setData({ paying: false })
      if (r.paid) {
        wx.showToast({ title: '充值成功', icon: 'success' })
        this.load()
      } else {
        wx.showToast({ title: '支付未完成，如已扣款请稍后查看余额', icon: 'none' })
        this.load()
      }
    }).catch(err => {
      this.setData({ paying: false })
      if (err && err.code !== 401) wx.showToast({ title: err.message || '充值失败', icon: 'none' })
    })
  },

  onRecords () {
    router.navigate('/pages/recharge/records')
  },
})
