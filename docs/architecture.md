# pet-mini 架构说明（Architecture）

> 适用范围：仅 `/pet-store/pet-mini`（微信小程序端）。`pet-back`、`pet-web` 为独立项目，**不要修改**。
> 当前阶段：已联调真实后端 `pet-back`（`/api/v1/client`），**Mock 已彻底移除**；仅剩支付为本地模拟（待接微信支付）。

## 1. 技术栈与运行形态

- 微信小程序原生框架（CommonJS 模块：`require` / `module.exports`；`Page({})` / `Component({})`）。
- 渲染器：**webview**（已从模板默认 Skyline 切换，见 `app.json`，不再含 `renderer`/`rendererOptions`/`componentFramework`）。
- 导航：原生导航栏（各页 `navigationBarTitleText`）+ 原生 tabBar（首页/分类/购物车/我的，暂纯文字）。
- 金额统一以 **分（整数）** 存储与传输，展示用 `utils/format.js` 转换。

## 2. 目录结构

```
pet-mini/
  app.js / app.json / app.wxss      全局入口、pages+tabBar+window、引入 assets 样式
  config/index.js                   环境/baseURL/缓存 TTL/storage keys/订单与配送常量
  utils/
    storage.js                      命名空间 + TTL 安全缓存（get/set/remove/clear）
    request.js                      统一请求层：wx.request(baseURL)；注入 Token；401 处理；ApiError
    format.js                       分<->元、时间格式化
    router.js                       导航封装 + 登录守卫 goRequireLogin / afterLogin
  services/                         *.service.js，页面唯一数据来源
    auth / user / home / category / product / cart / order / payment / contact
  components/
    state-view/                     loading / empty / error(+retry) / ok 统一状态容器
    goods-card/                     商品卡片 grid|list 两种布局
    goods-image/                    远程图 + 失败回退占位；内含语义化尺寸类 gi-*
    search-bar/                     readonly 假输入框 / 真实输入框 两种模式
    navigation-bar/                 模板自带，当前未使用（保留文件）
  assets/styles/
    theme.wxss                      主题 CSS 变量（--color-* / --radius-*），业务代码用 var() 引用
    placeholder.wxss                纯色/CSS 占位（.ph / .ph-img / .ph-circle）
  pages/
    index/ category/ cart/ mine/    tabBar 四页
    search/ goods/detail/           浏览页（未登录可看）
    order/confirm|list|detail/      订单与支付
    login/ profile/ recharge/       登录、编辑资料、充值（contact 页已删除）
```

## 3. 分层与数据流（核心约束）

```
pages  →  services  →  utils/request  →  wx.request(config.baseURL)
```

- **页面只调 services**，不写死业务数据、不直接发请求。
- **services 只调 `utils/request`**，不感知传输细节。
- **request 层**统一走 `wx.request` 访问真实后端；统一返回 `Promise<data>`，失败 reject `ApiError{code,message}`。
- 已完成的能力替换：
  - 微信支付：`services/payment.service.js`（统单 + 拉起 + 轮询到账，支持余额支付）。
  - 微信客服：**不再需要 service 封装**——直接在 wxml 用原生 `<button open-type="contact">`（商品详情/我的/首页三处），`contact.service.js` 与 `pages/contact/` 已删除。

## 4. 认证与登录态

- 微信一键登录（**无独立注册流程**）：`auth.service.login()` 调 `wx.login` 拿临时 `code` → POST `/auth/wechat-login`；后端用 code 换 openid（`code2Session`），按 openid 找/建用户（存在即登录，不存在则注册并登录），返回 Token + 用户快照。
- 昵称（**仅首次登录采集一次**）：`pages/login` 登录后判 `authService.profileSetupNeeded(user)`：为 true（首次）才展示采集卡片（`<button open-type="chooseAvatar">` + `<input type="nickname">`），**昵称**走 `userService.updateProfile()` → POST `/user/profile` 入库。`pages/profile` 为后续修改入口。
- **头像不再持久化到后端**：`chooseAvatar` 得到的临时路径仅写入本地缓存 `auth.profile`（`{userId,nickname,avatar,skipped}`，按用户隔离）供本人展示，重启/换设备后临时路径失效属正常（回退占位）。
- Token 存 `storage`（key `auth.token`），用户快照存 `auth.user`（仅首屏展示，权威以 `fetchProfile` 为准）。
- `request` 对所有请求自动附带 Token；后端对受保护路径（`/cart`、`/orders`、`/user`、`/addresses`、`/auth/profile`）校验，无效返回 **401**。
- request 层收到 401：清除 token/user 并跳转登录页（已在登录页则不跳）。
- 登录守卫：`router.goRequireLogin(url)` 未登录携带 `redirect` 跳登录；`router.afterLogin(redirect)` 回跳（自动区分 tabBar/普通页）。

### 路由访问矩阵
| 未登录可看 | 需登录 |
|---|---|
| 首页、分类、搜索、商品详情 | 购物车、确认订单、订单列表/详情、我的、编辑资料、充值、收藏操作 |

## 5. 订单与支付模型

- 订单状态机（`config.orderStatus`，与后端 `core/constants.py` 一致）：
  - `PENDING_PAY` 待付款 →（支付成功）`PAID_UNSHIPPED` 待发货 →（商家发货）`SHIPPED` 已发货（履约终态）
  - `PENDING_PAY` →（超时/用户取消）`CLOSED` 已关闭
  - `REFUNDING` 退款中 / `REFUNDED` 已退款（售后退款驱动）
  - 无 `COMPLETED`（发货即终态）。
- **先建单后支付**：`order.createOrder` 下单即 `PENDING_PAY`；`payment.service.payOrder(orderId)` 发起支付：mock provider 即时已付，真实微信走 `wx.requestPayment` 拉起 + 轮询订单状态确认到账（以服务端为准）。订单详情/列表的“去支付”也调 `payOrder`。
- **售后与履约状态解耦**（`after_sales`）：用户在 `PAID_UNSHIPPED/SHIPPED` 可“申请退款”（`order.applyRefund`，整单全额）→ 生成 PENDING 售后单（详情展示“处理中”、可 `revokeRefund` 撤回）；是否退由商家在管理后台同意/驳回。管理员也可直接发起退款（金额自定义）。
- **列表 5 tab**：全部 / 未付款(`PENDING_PAY`) / 未发货(`PAID_UNSHIPPED`) / 已发货(`SHIPPED`) / 退款售后(`AFTER_SALE`，=有 PENDING 售后单的订单)。`config.orderTabs` 驱动，`order.getList(tab)` 传后端。
- 取消待付款：`order.cancelOrder`（`PENDING_PAY → CLOSED`，仅未付款可由用户取消）。
- 下单**无库存（现做）**：销量在**支付成功时**累加、写订单行快照、清购物车；全额退款回退销量。

## 6. 缓存策略（storage）

- 命名空间前缀 `petstore:`（`utils/storage.js`），值包裹 `{v, e(过期时间)}`。
- **可持久化**：Token、用户快照、**头像昵称本地缓存(`auth.profile`)与“暂不设置”标记**（头像仅本地）、搜索历史(`ux.searchHistory`)、最近浏览(`ux.recentViewed`)。
- **可 TTL 缓存 + 后台刷新(SWR)**：banner、分类（`config.cache.ttl`）。
- **绝不依赖缓存**：价格、订单、支付、余额 —— 一律实时取 API。商品列表/详情实时拉取。“我的”页头部可用缓存头像昵称秒开，但余额/积分/券必须等接口（首屏占位 `—`）。
- 购物车、收藏存服务端（按用户），渲染时价格实时 join 商品。

## 7. 状态处理约定（loading/空/失败）

- 所有列表/详情页用 `<state-view status="...">` 包裹，`status ∈ loading|empty|error|ok`；error 带重试按钮（`bind:retry`）。
- 页面维护各自 status 字段；错误态由真实接口失败/超时自然触发（Mock 已移除，不再提供失败注入）。
- 天然空态：新用户订单/购物车/收藏、搜索无结果、分类无商品。

## 8. 组件与样式隔离注意

- 组件样式默认隔离：**父组件/页面的 wxss 无法影响子组件内部节点**。
- 因此 `goods-image` 的尺寸由**组件内部**语义化类控制：`gi-banner / gi-grid / gi-list / gi-thumb / gi-mid / gi-small / gi-avatar / gi-tall`，父级通过 `customClass` 传入这些类名（不要在外层 wxss 定义尺寸类，会失效）。
- 主题色通过 CSS 变量（`theme.wxss` 定义在 `page` 上）继承进组件，组件内用 `var(--x, fallback)`。
- `state-view`、`goods-image` 的 wxss 顶部 `@import "/assets/styles/placeholder.wxss"` 以使用 `.ph*` 占位类。

## 9. 数据模型（真实后端 /api/v1/client，字段 camelCase）

- Product：`{id,title,categoryId,priceFen,sold,images[],desc}`（**无 stock**）
- Category：`{id,name}`
- User：`{id,nickname,avatar,phone,balanceFen}`（对外经 `public_user`，不含 openid/token；avatar 当前为空，头像仅本地。原 `points/coupons` 已全链路废弃）
- Order：`{id,orderNo,userId,items[{productId,title,image,priceFen,qty}],totalFen,status,deliveryType,receiverName,receiverPhone,address,carrier,shipNo,createdAt,shippedAt,refundRequestedAt,cancelledAt,refundedAt}`
- Address：`{id,receiverName,phone,province,city,district,detail,address,isDefault,createdAt,updatedAt}`
- Cart line：`{productId,qty,checked,product{id,title,images,priceFen}}`
- Favorites：按用户的 product 数组

## 11. 编码约定

- service 文件命名 `xxx.service.js`；导出纯函数。
- 页面事件处理以 `onXxx` 命名；加载函数 `loadXxx`；重试直接绑定 `loadXxx` 或专用 `retryXxx`。
- 错误提示：`catch(err => { if (err.code !== 401) wx.showToast(...) })`（401 已由 request 层跳转，避免重复提示）。
- 新增页面需同步 `app.json.pages`；tabBar 页需同步 `router.TAB_PAGES`。
