# pet-mini 架构说明（Architecture）

> 适用范围：仅 `/pet-store/pet-mini`（微信小程序端）。`pet-back`、`pet-web` 为独立项目，**不要修改**。
> 当前阶段：前端 Demo，无真实后端，全部走 Mock API。

## 1. 技术栈与运行形态

- 微信小程序原生框架（CommonJS 模块：`require` / `module.exports`；`Page({})` / `Component({})`）。
- 渲染器：**webview**（已从模板默认 Skyline 切换，见 `app.json`，不再含 `renderer`/`rendererOptions`/`componentFramework`）。
- 导航：原生导航栏（各页 `navigationBarTitleText`）+ 原生 tabBar（首页/分类/购物车/我的，暂纯文字）。
- 金额统一以 **分（整数）** 存储与传输，展示用 `utils/format.js` 转换。

## 2. 目录结构

```
pet-mini/
  app.js / app.json / app.wxss      全局入口、pages+tabBar+window、引入 assets 样式
  config/index.js                   环境/baseURL/useMock/mock 参数/缓存 TTL/storage keys/订单状态常量
  utils/
    storage.js                      命名空间 + TTL 安全缓存（get/set/remove/clear）
    request.js                      统一请求层：mock 适配或 wx.request；注入 Token；401 处理；ApiError
    format.js                       分<->元、时间格式化
    router.js                       导航封装 + 登录守卫 goRequireLogin / afterLogin
  mock/
    db.js                           Mock 库：种子(商品/分类) + 可变数据(users/orders/carts/favorites)持久化
    server.js                       Mock 路由表 + 延迟 + 失败率 + Token 校验(401)
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
    login/ profile/ recharge/ contact/  登录、编辑资料、充值、客服占位
```

## 3. 分层与数据流（核心约束）

```
pages  →  services  →  utils/request  →  (config.useMock ? mock/server : wx.request(baseURL))
```

- **页面只调 services**，不写死业务数据、不直接发请求。
- **services 只调 `utils/request`**，不感知传输细节。
- **request 层**根据 `config.useMock` 选择 Mock 或真实 `wx.request`；统一返回 `Promise<data>`，失败 reject `ApiError{code,message}`。
- 替换点（接真实能力时只改对应文件，页面零改动）：
  - 真实后端：`config.useMock=false` + `config.baseURL`（或改 `request.js` 传输适配）。
  - 真实认证（微信登录 code2Session）：`services/auth.service.js` + 后端 `/auth/wechat-login`。
  - 微信支付：`services/payment.service.js`。
  - 微信客服：`services/contact.service.js`。

## 4. 认证与登录态

- 微信一键登录（**无独立注册流程**）：`auth.service.login()` 调 `wx.login` 拿临时 `code` → POST `/auth/wechat-login`；后端用 code 换 openid（`code2Session`），按 openid 找/建用户（存在即登录，不存在则注册并登录），返回 Token + 用户快照。Mock 用固定 openid 模拟单一微信身份，每次登录轮换 Token。
- 头像昵称（**仅首次登录请求一次授权**）：微信已取消静默获取（`getUserProfile` 只返回匿名“微信用户”+灰头像），真实资料必须靠“头像昵称填写能力”由用户主动点一次。因此 `pages/login` 在登录成功后判 `authService.profileSetupNeeded(user)`：为 true（首次）才展示采集卡片（`<button open-type="chooseAvatar">` + `<input type="nickname">`），保存走 `userService.updateProfile()` → POST `/user/profile`，并写本地缓存 `auth.profile`（`{userId,nickname,avatar,skipped}`，按用户隔离、**退出登录不清**）。此后登录判据：服务端快照资料已完整 → 刷新缓存后直接使用；否则本地已有缓存/曾选“暂不设置”(`skipped`) → 也直接使用，**不再重复请求授权**。`pages/profile`（“我的”页头部进入）作为后续修改入口，修改后同步刷新缓存。
- 头像为 `chooseAvatar` 返回的临时文件路径，真实环境需先 `wx.uploadFile` 上传换取正式 URL 再入库/缓存。
- Token 存 `storage`（key `auth.token`），用户快照存 `auth.user`（仅首屏展示，权威以 `fetchProfile` 为准）。
- `request` 对所有请求自动附带 Token；Mock 对受保护路径（`/cart`、`/orders`、`/user`、`/auth/profile`）校验，无效返回 **401**。
- request 层收到 401：清除 token/user 并跳转登录页（已在登录页则不跳）。
- 登录守卫：`router.goRequireLogin(url)` 未登录携带 `redirect` 跳登录；`router.afterLogin(redirect)` 回跳（自动区分 tabBar/普通页）。

### 路由访问矩阵
| 未登录可看 | 需登录 |
|---|---|
| 首页、分类、搜索、商品详情 | 购物车、确认订单、订单列表/详情、我的、编辑资料、充值、收藏操作 |

## 5. 订单与支付模型

- 订单状态机（`config.orderStatus`）：
  - `PAID_UNSHIPPED` 已付款，未发货
  - `REFUND_REQUESTED` 退款申请中（用户已申请，待商家确认）
  - `CANCELLED` 已取消（商家同意退款/直接取消，终态）
  - `SHIPPED` 已发货（不可取消）
  - 预留 `REFUNDING` 退款中 / `REFUNDED` 已退款：**接入真实支付后启用**，流转 `CANCELLED → REFUNDING → REFUNDED`（当前 Mock 无真实资金流，止于 `CANCELLED`）。
- **订单仅在支付成功后创建**（`order.createPaidOrder`），故无"待付款"脏数据；支付失败/取消不产生订单。
- 支付：`payment.service.pay()` 返回 `{result:'success'|'fail'|'cancel'}`（Mock 用 ActionSheet 三选一；`config.payment.autoSuccess=true` 可直达成功）。调用方按结果驱动后续（创建订单 / 充值入账 / 提示）。
- 退款申请（用户侧，仅 `PAID_UNSHIPPED` 可发起）：订单详情"申请退款"（`order.applyRefund`）→ `REFUND_REQUESTED`；"取消退款申请"（`order.revokeRefund`）撤回 → `PAID_UNSHIPPED`。均需二次确认。
- 取消订单（商家侧）：真实场景由 **web 后台** 处理（`order.merchantCancel` 对应 `POST /orders/:id/cancel`），`PAID_UNSHIPPED`/`REFUND_REQUESTED` → `CANCELLED` 并**回补库存、回退销量**；`SHIPPED` 拒绝。小程序内提供"模拟商家同意退款（Demo）"按钮，沿用"模拟发货（Demo）"约定以便演示。
- 列表 tab：`未发货` = `PAID_UNSHIPPED + REFUND_REQUESTED`（Mock 层按分组过滤）；`CANCELLED` 仅在 `全部` 可见（"从未发货移除，但全部里能看到状态"）。
- 下单会扣减商品库存、累加销量，并清空购物车中对应商品。

## 6. 缓存策略（storage）

- 命名空间前缀 `petstore:`（`utils/storage.js`），值包裹 `{v, e(过期时间)}`。
- **可持久化**：Token、用户快照、**头像昵称缓存(`auth.profile`)与“暂不设置”标记**、搜索历史(`ux.searchHistory`)、最近浏览(`ux.recentViewed`)、Mock 失败开关(`dev.mockFail`)、Mock 库(`mock.db`)。
- **可 TTL 缓存 + 后台刷新(SWR)**：banner、分类（`config.cache.ttl`）。
- **绝不依赖缓存**：价格、库存、订单、支付、余额 —— 一律实时取 API。商品列表/详情实时拉取（不读缓存）。“我的”页头部可用缓存头像昵称秒开，但余额/积分/券必须等接口（首屏占位 `—`）。
- 购物车、收藏存 Mock 库（按用户），渲染时价格/库存实时 join 商品。

## 7. 状态处理约定（loading/空/失败）

- 所有列表/详情页用 `<state-view status="...">` 包裹，`status ∈ loading|empty|error|ok`；error 带重试按钮（`bind:retry`）。
- 页面维护各自 status 字段；Mock 提供两种错误注入：
  - `config.mock.failRate`（全局随机失败率）。
  - "我的"页底部开发者开关 `模拟接口失败`（写 `dev.mockFail`，所有请求返回 500）。该开关位于 state-view 之外，接口全失败时仍可关闭。
- 天然空态：新用户订单/购物车/收藏、搜索无结果、分类无商品。

## 8. 组件与样式隔离注意

- 组件样式默认隔离：**父组件/页面的 wxss 无法影响子组件内部节点**。
- 因此 `goods-image` 的尺寸由**组件内部**语义化类控制：`gi-banner / gi-grid / gi-list / gi-thumb / gi-mid / gi-small / gi-avatar / gi-tall`，父级通过 `customClass` 传入这些类名（不要在外层 wxss 定义尺寸类，会失效）。
- 主题色通过 CSS 变量（`theme.wxss` 定义在 `page` 上）继承进组件，组件内用 `var(--x, fallback)`。
- `state-view`、`goods-image` 的 wxss 顶部 `@import "/assets/styles/placeholder.wxss"` 以使用 `.ph*` 占位类。

## 9. Mock Server 约定

- 路由表由 `handlers` 对象键 `"METHOD /path"` 生成；**静态路径需声明在 `:param` 之前**（如 `/products/recommend` 在 `/products/:id` 前）。
- 统一响应 `{code, data, message}`，`code=0` 成功；`401` 未登录；`400` 业务错误；`404` 接口/资源不存在；`500` 模拟失败。
- 每次请求模拟 `config.mock.latency` 区间延迟。
- 数据持久化：仅 users/orders/carts/favorites 写入 storage；商品/分类为内存种子（保证以 API 为准）。

## 10. 数据模型（Mock）

- Product：`{id,title,categoryId,priceFen,stock,sold,images[],desc}`
- Category：`{id,name}`
- User：`{id,openid,nickname,avatar,balanceFen,points,coupons,token}`（对外经 `publicUser` 只暴露昵称/头像等，不含 openid/token）
- Order：`{id,orderNo,userId,items[{productId,title,image,priceFen,qty}],totalFen,status,createdAt,shippedAt,refundRequestedAt,cancelledAt}`
- Cart line：`{productId,qty,checked}`（返回时 join `product{...}`）
- Favorites：按用户的 productId 数组

## 11. 编码约定

- service 文件命名 `xxx.service.js`；导出纯函数。
- 页面事件处理以 `onXxx` 命名；加载函数 `loadXxx`；重试直接绑定 `loadXxx` 或专用 `retryXxx`。
- 错误提示：`catch(err => { if (err.code !== 401) wx.showToast(...) })`（401 已由 request 层跳转，避免重复提示）。
- 新增页面需同步 `app.json.pages`；tabBar 页需同步 `router.TAB_PAGES`。
