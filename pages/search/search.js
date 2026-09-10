// pages/search/search.js
// 商品搜索：最近搜索(本地 UX 数据) + 搜索结果(实时 API)。
const productService = require('../../services/product.service')
const cartService = require('../../services/cart.service')
const router = require('../../utils/router')
const storage = require('../../utils/storage')
const config = require('../../config/index')

Page({
  data: {
    keyword: '',
    history: [],
    // 'idle' | 'loading' | 'ok' | 'empty' | 'error'
    resultStatus: 'idle',
    results: [],
  },

  onLoad () {
    this.setData({ history: storage.get(config.storageKeys.searchHistory, []) })
  },

  onInput (e) {
    this.setData({ keyword: e.detail.value })
  },

  onClear () {
    this.setData({ keyword: '', resultStatus: 'idle', results: [] })
  },

  onConfirm (e) {
    this.setData({ keyword: e.detail.value })
    this.doSearch()
  },

  onHistoryTap (e) {
    this.setData({ keyword: e.currentTarget.dataset.kw })
    this.doSearch()
  },

  onClearHistory () {
    storage.set(config.storageKeys.searchHistory, [])
    this.setData({ history: [] })
  },

  doSearch () {
    const kw = (this.data.keyword || '').trim()
    if (!kw) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' })
      return
    }
    // 记录搜索历史（本地 UX 数据）
    const history = [kw].concat(this.data.history.filter(h => h !== kw)).slice(0, 10)
    storage.set(config.storageKeys.searchHistory, history)
    this.setData({ history, resultStatus: 'loading' })

    productService.search(kw, { page: 1, pageSize: 20 }).then(res => {
      const list = (res && res.list) || []
      this.setData({ results: list, resultStatus: list.length ? 'ok' : 'empty' })
    }).catch(() => {
      this.setData({ resultStatus: 'error' })
    })
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
