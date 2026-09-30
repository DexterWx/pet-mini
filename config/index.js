// config/index.js
// 全局配置：环境、后端地址、缓存策略、业务常量。

// 后端来源模式（切换只改这一行）：
//   'lan'    = 本机局域网 IP（开发者工具模拟器 / 同 WiFi 真机，日常开发默认）
//   'tunnel' = cpolar 等公网临时域名（给不在局域网的人测试；对方需在“体验版”里开“开发调试”才不校验域名）
//   'prod'   = 正式备案域名（上线）
const BACKEND_MODE = 'tunnel'

// —— lan：开发机地址，由 scripts/set-dev-host.sh 自动探测回写，换网络重跑一次即可，不需手改 ——
const DEV_HOST = '192.168.50.111'
const DEV_PORT = '8000'
// —— tunnel：跑 `cpolar http 8000` 后，把公网地址（如 https://xxxx.cpolar.top）粘贴到这里，结尾不要斜杠 ——
const TUNNEL_URL = 'https://3374bd58.r20.cpolar.top'
// —— prod：备案后的正式 API 域名（上线用），结尾不要斜杠 ——
const PROD_URL = 'https://api.yourdomain.com'

function resolveBaseURL(mode) {
  if (mode === 'tunnel') return TUNNEL_URL + '/api/v1/client'
  if (mode === 'prod') return PROD_URL + '/api/v1/client'
  return 'http://' + DEV_HOST + ':' + DEV_PORT + '/api/v1/client'
}

const config = {
  env: BACKEND_MODE === 'prod' ? 'prod' : 'dev',

  // 真实后端地址：lan 需开发者工具勾“不校验合法域名”；tunnel/prod 为 HTTPS，但临时域名靠对方开“开发调试”豁免校验
  baseURL: resolveBaseURL(BACKEND_MODE),

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
