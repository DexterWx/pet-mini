// components/goods-image/goods-image.js
// 远程商品图：加载失败时回退本地 CSS/纯色占位，保证离线可用。
Component({
  properties: {
    src: { type: String, value: '' },
    mode: { type: String, value: 'aspectFill' },
    customClass: { type: String, value: '' },
  },
  data: {
    failed: false,
  },
  observers: {
    src () {
      this.setData({ failed: false })
    },
  },
  methods: {
    onError () {
      this.setData({ failed: true })
    },
  },
})
