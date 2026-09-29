// config/index.js
// 全局配置：环境、后端地址、缓存策略、业务常量。

// 开发机（跑 pet-back 的电脑）地址：模拟器与真机共用同一个值。
// 真机必须用电脑的内网 IP —— 手机上的 127.0.0.1 是手机自己，连不到电脑。
// 该值由 scripts/set-dev-host.sh 自动探测并回写，换网络后重跑一次即可，不需手改。
const DEV_HOST = '192.168.50.111'
const DEV_PORT = '8000'

const config = {
  env: 'dev',

  // 真实后端地址（开发者工具需勾选「不校验合法域名」；开发版真机不校验服务器域名）
  baseURL: 'http://' + DEV_HOST + ':' + DEV_PORT + '/api/v1/client',

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
