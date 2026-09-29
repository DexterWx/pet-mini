// custom-tab-bar/index.js
// 自定义 tabBar：原生 tabBar 由微信客户端渲染，不支持描边与组件图标，
// 这里用「奶白底 + 黑边胶囊」复刻熊猫配色，选中态为纯黑实底。
// 选中态需由各 tab 页在 onShow 中调用 getTabBar().setData({ selected: n }) 同步，
// 顺序必须与 app.json 的 tabBar.list 一致。
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/category/category', text: '分类', icon: 'grid' },
      { pagePath: '/pages/cart/cart', text: '购物车', icon: 'cart' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: 'user' },
    ],
  },

  methods: {
    onTab (e) {
      const ds = e.currentTarget.dataset
      const index = ds.index
      if (index === this.data.selected) return
      wx.switchTab({ url: ds.path })
    },
  },
})
