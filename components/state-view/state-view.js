// components/state-view/state-view.js
// 统一状态容器：loading / empty / error(+retry) / ok(默认插槽)。
Component({
  properties: {
    // 'loading' | 'empty' | 'error' | 'ok'
    status: { type: String, value: 'ok' },
    emptyText: { type: String, value: '暂无数据' },
    errorText: { type: String, value: '加载失败，请重试' },
    loadingText: { type: String, value: '加载中…' },
  },
  methods: {
    retry () {
      this.triggerEvent('retry')
    },
  },
})
