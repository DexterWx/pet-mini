// components/goods-card/goods-card.js
// 商品卡片：grid(两列瀑布) / list(左图右文) 两种布局。
const format = require('../../utils/format')

Component({
  properties: {
    goods: { type: Object, value: null },
    layout: { type: String, value: 'grid' },
  },
  data: {
    priceText: '',
    image: '',
  },
  observers: {
    goods (g) {
      if (!g) return
      this.setData({
        priceText: format.formatPrice(g.priceFen),
        image: (g.images && g.images[0]) || '',
      })
    },
  },
  methods: {
    onTap () {
      this.triggerEvent('cardtap', { id: this.data.goods.id })
    },
    onAdd () {
      this.triggerEvent('cardadd', { id: this.data.goods.id })
    },
  },
})
