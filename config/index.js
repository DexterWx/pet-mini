// config/index.js
// 全局配置：环境、Mock 开关、缓存策略、业务常量。
// 未来接真实后端时，仅需将 useMock 置为 false 并填写 baseURL。
const config = {
  env: 'dev',

  // 真实后端地址（useMock = false 时启用）
  baseURL: 'https://api.example.com',

  // Demo 阶段使用 Mock API
  useMock: true,

  mock: {
    // 模拟网络延迟区间(ms)
    latency: [200, 600],
    // 全局随机失败率 0~1（用于验证错误态）
    failRate: 0,
  },

  payment: {
    // true: 直接返回支付成功；false: 弹出 ActionSheet 由测试者选择 成功/失败/取消
    autoSuccess: false,
  },

  cache: {
    // 允许缓存的展示类数据 TTL(ms)；库存/价格/订单/支付/余额不缓存
    ttl: {
      banner: 5 * 60 * 1000,
      category: 5 * 60 * 1000,
    },
  },

  storageKeys: {
    prefix: 'petstore:',
    token: 'auth.token',
    user: 'auth.user',
    searchHistory: 'ux.searchHistory',
    recentViewed: 'ux.recentViewed',
    mockFail: 'dev.mockFail',
    db: 'mock.db',
  },

  // 简化订单状态：已付款未发货 -> 已发货
  orderStatus: {
    PAID_UNSHIPPED: 'PAID_UNSHIPPED',
    SHIPPED: 'SHIPPED',
  },
  orderStatusText: {
    PAID_UNSHIPPED: '已付款，未发货',
    SHIPPED: '已发货',
  },
  // 订单列表 tab
  orderTabs: [
    { key: '', label: '全部' },
    { key: 'PAID_UNSHIPPED', label: '未发货' },
    { key: 'SHIPPED', label: '已发货' },
  ],
}

module.exports = config
