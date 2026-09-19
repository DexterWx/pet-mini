// config/index.js
// 全局配置：环境、Mock 开关、缓存策略、业务常量。
// 未来接真实后端时，仅需将 useMock 置为 false 并填写 baseURL。
const config = {
  env: 'dev',

  // 真实后端地址（useMock = false 时启用）；本地联调需在开发者工具勾选「不校验合法域名」
  baseURL: 'http://127.0.0.1:8000/api/v1/client',

  // Demo 阶段使用 Mock API；联调 pet-back 时置为 false
  useMock: false,

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
    // 首次登录采集到的头像昵称（按用户 id 隔离，退出登录不清除，之后直接使用不再重复请求）
    profile: 'auth.profile',
    searchHistory: 'ux.searchHistory',
    recentViewed: 'ux.recentViewed',
    mockFail: 'dev.mockFail',
    db: 'mock.db',
  },

  // 订单状态机：
  //   PAID_UNSHIPPED 已付款未发货
  //     -> REFUND_REQUESTED 用户申请退款(待商家确认)，用户可撤回到 PAID_UNSHIPPED
  //     -> CANCELLED 商家同意退款/直接取消(终态，Mock 无真实资金流)
  //     -> SHIPPED 已发货(不可取消)
  //   REFUNDING/REFUNDED 为接入真实支付后预留：CANCELLED -> REFUNDING -> REFUNDED
  orderStatus: {
    PAID_UNSHIPPED: 'PAID_UNSHIPPED',
    REFUND_REQUESTED: 'REFUND_REQUESTED',
    CANCELLED: 'CANCELLED',
    SHIPPED: 'SHIPPED',
    // 接入支付后启用：
    REFUNDING: 'REFUNDING',
    REFUNDED: 'REFUNDED',
  },
  orderStatusText: {
    PAID_UNSHIPPED: '已付款，未发货',
    REFUND_REQUESTED: '退款申请中',
    CANCELLED: '已取消',
    SHIPPED: '已发货',
    // 接入支付后启用：
    REFUNDING: '退款中',
    REFUNDED: '已退款',
  },
  // 订单列表 tab（key 保持不变；“未发货”在 Mock 层按分组匹配 PAID_UNSHIPPED + REFUND_REQUESTED）
  orderTabs: [
    { key: '', label: '全部' },
    { key: 'PAID_UNSHIPPED', label: '未发货' },
    { key: 'SHIPPED', label: '已发货' },
  ],
}

module.exports = config
