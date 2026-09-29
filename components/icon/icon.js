// components/icon/icon.js
// 零外部物料的内联 SVG 图标：矢量绘制、颜色/尺寸由属性控制、跨机型渲染一致。
// 后续若换成 iconfont 或设计稿切图，只需替换本文件 PATHS 与调用处即可。
// 风格：24×24 viewBox、stroke 线性、圆角端点，契合「现代 / 简约 / 自然」品牌调性。
const PATHS = {
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  wallet: '<path d="M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3"/><path d="M3 6v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><circle cx="16.5" cy="14.5" r="1.3"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.3 12.1a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.25L21 7H6"/>',
  heart: '<path d="M12 20.5 4.7 13.2a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 0 1 6.5 6.5z"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2z"/><path d="M20 14a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  package: '<path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  truck: '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
  refund: '<path d="M3 7v6h6"/><path d="M3.5 13a8.5 8.5 0 1 0 2.2-7.4L3 8"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  paw: '<ellipse cx="6.5" cy="10" rx="1.7" ry="2.3"/><ellipse cx="10.5" cy="7.5" rx="1.8" ry="2.4"/><ellipse cx="15" cy="8" rx="1.8" ry="2.4"/><ellipse cx="18.5" cy="11.5" rx="1.7" ry="2.2"/><path d="M12.5 12c-2.6 0-5 2.3-5 4.9 0 1.7 1.3 2.9 3 2.9.9 0 1.4-.4 2-.4s1.1.4 2 .4c1.7 0 3-1.2 3-2.9C17.5 14.3 15.1 12 12.5 12z"/>'
}

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: null, value: 40 }, // 单位 rpx，数字或字符串均可
    color: { type: String, value: '#1F1D1B' },
    strokeWidth: { type: null, value: 1.8 },
    fill: { type: String, value: 'none' } // 传颜色即实心（如收藏已选中的心）
  },
  data: { iconStyle: '' },
  observers: {
    'name, size, color, strokeWidth, fill': function () {
      this.build()
    }
  },
  lifetimes: {
    attached: function () {
      this.build()
    }
  },
  methods: {
    build: function () {
      const d = this.data
      const inner = PATHS[d.name] || ''
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="' + d.fill +
        '" stroke="' + d.color + '" stroke-width="' + d.strokeWidth +
        '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'
      const uri = 'data:image/svg+xml,' + encodeURIComponent(svg)
      this.setData({
        iconStyle: 'width:' + d.size + 'rpx;height:' + d.size + 'rpx;background-image:url("' + uri + '")'
      })
    }
  }
})
