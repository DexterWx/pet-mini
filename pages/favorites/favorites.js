// pages/favorites/favorites.js
// 我的收藏：需登录。列表来自 GET /user/favorites（服务端 join 商品，已下架/删除的不会出现）。
// 点卡片进详情；长按卡片取消收藏。
const userService = require('../../services/user.service')
const cartService = require('../../services/cart.service')
const router = require('../../utils/router')

Page({
  data: {
    status: 'loading',
    list: [],
  },

  onShow () {
    if (!router.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/favorites/favorites') })
      return
    }
    this.load()
  },

  load () {
    this.setData({ status: 'loading' })
    userService.getFavorites().then(list => {
      const l = list || []
      this.setData({ list: l, status: l.length ? 'ok' : 'empty' })
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onCardTap (e) {
    router.navigate('/pages/goods/detail?id=' + e.detail.id)
  },

  onCardAdd (e) {
    cartService.add(e.detail.id, 1).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    }).catch(err => {
      if (err && err.code !== 401) wx.showToast({ title: err.message || '加入失败', icon: 'none' })
    })
  },

  // 长按取消收藏（复用详情页同一个 toggle 接口）
  onLongPress (e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title || '该商品'
    wx.showModal({
      title: '取消收藏',
      content: '不再收藏「' + title + '」？',
      success: res => {
        if (!res.confirm) return
        userService.toggleFavorite(id).then(() => {
          wx.showToast({ title: '已取消收藏', icon: 'none' })
          this.load()
        }).catch(err => {
          if (err && err.code !== 401) wx.showToast({ title: err.message || '操作失败', icon: 'none' })
        })
      },
    })
  },

  goCategory () {
    wx.switchTab({ url: '/pages/category/category' })
  },
})
