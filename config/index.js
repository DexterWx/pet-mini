// config/index.js
// 全局配置：环境、后端地址、缓存策略、业务常量。

// 后端来源模式（切换只改这一行）：
//   'dev'  = 服务器公网地址（当前：域名备案审核中，真机需在体验版开「开发调试」豁免合法域名校验）
//   'prod' = 备案后的正式 HTTPS 域名（上线用，需同时在公众平台配 request 合法域名）
const BACKEND_MODE = 'dev'

// 结尾都不要带斜杠
const DEV_URL = 'http://47.93.176.201'         // 服务器公网 IP，由 Nginx:80 反代到后端
const PROD_URL = 'https://api.yourdomain.com'  // 备案域名下来后改这里

const config = {
  env: BACKEND_MODE === 'prod' ? 'prod' : 'dev',

  // 真实后端地址
  baseURL: (BACKEND_MODE === 'prod' ? PROD_URL : DEV_URL) + '/api/v1/client',

  // 注：支付结果一律以服务端为准（订单轮询状态、充值轮询到账），
  // 旧版模拟支付的 autoSuccess 开关已随真实微信支付接入而移除。

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
  },

  // 订单状态机（与后端 core/constants.py OrderStatus 对齐）：
  //   PENDING_PAY 待付款 --支付成功--> PAID_UNSHIPPED 待发货 --发货--> SHIPPED 已发货(履约终态)
  //   PENDING_PAY --超时/取消--> CLOSED 已关闭
  //   售后(after_sales 表驱动)：用户申请/管理员发起 -> 管理员同意 -> REFUNDING -> REFUNDED
  orderStatus: {
    PENDING_PAY: 'PENDING_PAY',
    PAID_UNSHIPPED: 'PAID_UNSHIPPED',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
    REFUNDING: 'REFUNDING',
    REFUNDED: 'REFUNDED',
  },
  orderStatusText: {
    PENDING_PAY: '待付款',
    PAID_UNSHIPPED: '待发货',
    SHIPPED: '待收货',
    COMPLETED: '已完成',
    CLOSED: '已关闭',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
  },
  // 配送方式：快递（需完整地址）/ 自提（仅需姓名+电话，管理端录提货号）
  deliveryType: {
    EXPRESS: 'EXPRESS',
    SELF_PICKUP: 'SELF_PICKUP',
  },
  deliveryTypeText: {
    EXPRESS: '快递发货',
    SELF_PICKUP: '到店自提',
  },
  // 订单列表 tab（AFTER_SALE = 有未处理售后单的订单，后端按此分组过滤）
  orderTabs: [
    { key: '', label: '全部' },
    { key: 'PENDING_PAY', label: '未付款' },
    { key: 'PAID_UNSHIPPED', label: '未发货' },
    { key: 'SHIPPED', label: '待收货' },
    { key: 'COMPLETED', label: '已完成' },
    { key: 'AFTER_SALE', label: '退款/售后' },
  ],
}

module.exports = config
