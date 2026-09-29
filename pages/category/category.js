// pages/category/category.js
// 分类页：左侧分类 + 右侧商品列表（综合/销量/价格排序 + 分页加载）。
const categoryService = require('../../services/category.service')
const productService = require('../../services/product.service')
const cartService = require('../../services/cart.service')
const router = require('../../utils/router')

const ALL = { id: 'all', name: '全部' }

Page({
  data: {
    catStatus: 'loading',
    listStatus: 'loading',
    categories: [],
    activeCategoryId: 'all',
    sort: 'default',
    order: 'desc',
    products: [],
    page: 1,
    pageSize: 10,
    hasMore: false,
    loadingMore: false,
  },

  onLoad () {
    this.loadCategories()
    this.loadProducts(true)
  },

  // 自定义 tabBar：仅同步选中态，不改变原有数据加载时机（分类页走 SWR 缓存）
  onShow () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  loadCategories () {
    this.setData({ catStatus: 'loading' })
    categoryService.getCategoriesSWR(c => {
      this.setData({ categories: [ALL].concat(c || []), catStatus: 'ok' })
    }).then(list => {
      const cats = [ALL].concat(list || [])
      this.setData({ categories: cats, catStatus: cats.length ? 'ok' : 'empty' })
    }).catch(() => {
      this.setData({ catStatus: 'error' })
    })
  },

  loadProducts (reset) {
    if (!reset && this.data.loadingMore) return
    const targetPage = reset ? 1 : this.data.page + 1
    if (reset) this.setData({ listStatus: 'loading' })
    else this.setData({ loadingMore: true })

    productService.getList({
      categoryId: this.data.activeCategoryId === 'all' ? '' : this.data.activeCategoryId,
      sort: this.data.sort,
      order: this.data.order,
      page: targetPage,
      pageSize: this.data.pageSize,
    }).then(res => {
      const list = (res && res.list) || []
      const products = reset ? list : this.data.products.concat(list)
      this.setData({
        products,
        page: targetPage,
        hasMore: !!(res && res.hasMore),
        loadingMore: false,
        listStatus: products.length ? 'ok' : 'empty',
      })
    }).catch(() => {
      this.setData({
        loadingMore: false,
        listStatus: reset ? 'error' : this.data.listStatus,
      })
      if (!reset) wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onSelectCategory (e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeCategoryId) return
    this.setData({ activeCategoryId: id })
    this.loadProducts(true)
  },

  onSort (e) {
    const sort = e.currentTarget.dataset.sort
    let order = this.data.order
    if (sort === 'price') {
      order = (this.data.sort === 'price') ? (this.data.order === 'asc' ? 'desc' : 'asc') : 'asc'
    } else if (sort === 'sales') {
      order = 'desc'
    }
    this.setData({ sort, order })
    this.loadProducts(true)
  },

  onLoadMore () {
    if (this.data.hasMore) this.loadProducts(false)
  },

  retryList () {
    this.loadProducts(true)
  },

  goSearch () {
    router.navigate('/pages/search/search')
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
