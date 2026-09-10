// components/search-bar/search-bar.js
// 搜索条：readonly 时为“点击跳转搜索页”的假输入框；否则为真实输入框。
Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    value: { type: String, value: '' },
    placeholder: { type: String, value: '搜索感兴趣的商品' },
    readonly: { type: Boolean, value: false },
  },
  methods: {
    onTap () {
      if (this.data.readonly) this.triggerEvent('tap')
    },
    onInput (e) {
      this.triggerEvent('input', { value: e.detail.value })
    },
    onConfirm (e) {
      this.triggerEvent('confirm', { value: e.detail.value })
    },
    onClear () {
      this.triggerEvent('clear')
    },
  },
})
