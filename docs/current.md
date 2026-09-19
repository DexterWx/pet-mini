# pet-mini 现状交接（Current Status）

> 接手前请先阅读 [architecture.md](./architecture.md)。本文描述"当前做到哪、怎么跑、哪些是假设/遗留"。
> 最近更新：头像昵称改为**仅首次登录请求一次授权**并在本地缓存（`auth.profile`），后续登录直接使用不再重复询问；认证为微信一键登录（无独立注册）；订单新增退款申请/取消状态机；新增“编辑资料”（头像昵称）。仍为 Mock-only，无真实后端。

## 1. 一句话现状

小程序端 Demo 已完整可跑：13 个页面 + 4 组件 + 分层 services + Mock API + Token 认证（微信登录）+ Mock 支付 + 全状态（loading/空/失败）覆盖。`pet-back`、`pet-web` 未改动。

## 2. 如何运行

1. 微信开发者工具 → 导入项目 → 选择 `/pet-store/pet-mini`（appid 见 `project.config.json`）。
2. 详情 → 本地设置 → 勾选 **"不校验合法域名…"**（用于加载远程占位图 `picsum.photos`）。
3. 编译运行。离线时商品图自动回退本地 CSS 占位，不影响流程。
4. 体验错误态：我的 → 底部开发者开关"模拟接口失败"；或改 `config.mock.failRate`。
5. 体验支付三态：结算/充值点"支付"后在 ActionSheet 选 成功/失败/取消；想跳过可设 `config.payment.autoSuccess=true`。

### 冒烟走查路径
未登录浏览首页/分类/搜索/详情 → 点购物车/我的进入需登录态 → 微信一键登录（Mock 固定 openid，首次即注册）→ **仅首次会弹“设置头像和昵称”卡片**（点头像授权 + 填昵称，或点“暂不设置”）→ **退出登录再登录一次，确认不再弹授权且头像昵称直接使用** → 加购/结算/支付成功 → 订单列表与详情 → 申请退款/撤回/模拟商家同意取消、模拟发货 → 我的页编辑资料(随时可改)/余额/充值 → 打开“模拟接口失败”验证各页 error+重试 → 关闭恢复。

## 3. 已完成功能清单

- 分层：config → utils/request → (mock/server | wx.request) → services → pages；页面零业务硬编码。
- 认证：微信一键登录（`wx.login` → `/auth/wechat-login`，后端按 openid 找/建用户，无独立注册）、Token 持久化与自动携带、401 清态跳登录、`goRequireLogin` 守卫与回跳。
- 头像昵称：**仅首次登录在登录页请求一次授权采集**（chooseAvatar + `type="nickname"`）→ `POST /user/profile` 入库 + 写 `auth.profile` 缓存（按 userId 隔离，退出登录保留）；之后登录由 `profileSetupNeeded()` 判定直接复用缓存（含曾“暂不设置”），不再弹采集；登录页保留“暂不设置”出口，不阻断登录。
- 用户资料：`pages/profile` 作为后续修改入口（同一套头像昵称填写能力），保存后同步刷新缓存；“我的”页头部用缓存秒开（余额等数值等接口）。
- 首页：banner(swiper) + 功能入口(点击下单/订单中心/联系我们/余额充值) + 为您推荐；banner/入口 SWR 缓存。
- 分类：左栏分类(含"全部") + 右栏商品列表 + 综合/销量/价格排序 + 分页加载。
- 搜索：最近搜索(本地) + 结果网格 + 空态。
- 商品详情：swiper 图集(1/N) + 价格/库存/销量 + 客服占位/购物车/收藏/加购/立即购买。
- 购物车：勾选/全选/步进/删除/合计/去结算 + 空态 + 推荐；需登录。
- 订单：确认订单(实时价) → Mock 支付 → 创建已付款订单；订单列表(tab 全部/未发货/已发货)；订单详情；退款申请/撤回、模拟商家同意取消(Demo)、模拟发货(Demo)。状态机见 architecture.md 第 5 节。
- 我的：头像/昵称(点头部进“编辑资料”)/余额/积分/券 + 订单快捷入口 + 常用工具 + 最近浏览 + 退出登录 + 开发者失败开关。
- 充值：余额卡 + 金额输入 + 满赠档位(来自 API) + Mock 支付入账。
- 联系我们/客服：占位页 + 占位 toast（后续接微信客服）。
- 状态覆盖：所有列表/详情经 `state-view` 处理 loading/empty/error(+retry)/ok。

## 4. 已做验证

- 全部 `.js` 通过 `node --check`；`app.json` / `project.config.json` JSON 解析正常。
- 本轮改动（登录页首次采集头像昵称 + `auth.profile` 缓存复用）已用 Node 桩化 `wx` 跑通端到端冒烟：首次登录 `profileSetupNeeded=true` → 保存后缓存写入 → 退出登录缓存保留 → 二次登录 `needsSetup=false`（不再采集）→ “暂不设置”后再登录也 `false` → 不同 userId 读取返回 `null`（不串号）。
- 早期 Node 桩化 `wx` 对 `mock/server` 端到端冒烟通过：分类/商品/排序/搜索/详情/推荐、购物车增改、下单(PAID_UNSHIPPED、合计正确)、发货(SHIPPED)、未授权(401)、余额/充值加赠/档位、收藏、banner/entries/contact、404、profile。
- 本轮改动（微信登录 `/auth/wechat-login`、订单退款/取消、`/user/profile`）已过编辑器诊断(GetProblems)无报错 + 人工走查；**尚未重跑全量 Node 冒烟**。接手建议补测：微信登录建/找用户、退款申请↔撤回↔取消(库存回补)、未发货 tab 分组、资料保存。
- 未做：真机/开发者工具 UI 走查（需人工在 devtools 打开确认视觉）。

## 5. 关键假设与决策（接手勿随意推翻）

- 渲染器用 **webview**（弃 Skyline），保证吸顶/固定底栏/瀑布流稳定。
- 订单状态机：`PAID_UNSHIPPED` →(用户申请退款) `REFUND_REQUESTED` →(商家同意/直接取消) `CANCELLED`；或 →(发货) `SHIPPED`(不可取消)。`REFUNDING/REFUNDED` 待接入真实支付后启用。**订单仅支付成功后创建**。详见 architecture.md 第 5 节。
- 未登录可看：首页/分类/搜索/详情（搜索视为浏览入口）；其余需登录。
- tabBar 暂**纯文字**（无图标），图标后期放 `assets/` 再接。
- 商品列表/详情**不读缓存**（价格/库存关键数据实时取）；仅 banner/分类 SWR。
- 头像昵称**只在首次登录采集一次**，之后靠 `auth.profile` 缓存 + 服务端快照复用；微信没有静默授权 API，所以不是“弹窗自动授权”而是登录页内采集。退出登录不抹掉该缓存（属 UX 数据，且按 userId 隔离）。
- 商品图为远程占位 URL（picsum seed），`goods-image` 失败回退本地占位。
- UI 占位统一在 `assets/styles/`（theme 变量 + placeholder），业务代码用 `var(--x)`。

## 6. 遗留 / 待办（Next）

- 接真实后端：`config.useMock=false` + `baseURL`；核对真实响应结构与 Mock 一致（`{code,data,message}`）。
- 真实微信登录：后端实现 `/auth/wechat-login`（`code2Session` 换 openid + 找/建用户）；`auth.service` 已按此对接，替换掉 Mock 固定 openid 即可。
- 头像上传：`chooseAvatar` 得到的是临时文件路径，接后端时需在保存前 `wx.uploadFile` 上传换取正式 URL（**登录页首次采集与编辑资料页两处都要接**）。
- 新订单通知（老板）：由**后端**用企业微信群机器人 webhook 推送，小程序端不做（早期订阅消息方案已移除）。
- 退款资金流：接入真实支付后补 `CANCELLED → REFUNDING → REFUNDED` 流转与退款回调。
- 微信支付替换 `payment.service`；微信客服替换 `contact.service`（button open-type="contact"）。
- tabBar 图标、正式 UI 资源替换 `assets/`。
- 可选增强：收藏列表页、充值记录页、收货地址、订单搜索、下拉刷新覆盖更多页、骨架屏替换 spinner。
- `components/navigation-bar/` 为模板遗留、当前未引用，可删可留。

## 7. 接手易踩坑（Gotchas）

- **组件样式隔离**：父级 wxss 不能改子组件内部节点。`goods-image` 尺寸必须用其内部 `gi-*` 类经 `customClass` 传入；在外层定义尺寸类无效。
- **Token 轮换**：每次登录会换 Token；用旧 Token 请求会 401（属正常行为，测试时取最新登录返回）。
- **mockFail 开关**：开启后所有接口 500；开关在"我的"页底部 state-view 之外，全失败时仍可关闭。若在其他页被卡住，可清缓存或关开关。
- **Mock 路由顺序**：`mock/server.js` 中静态路径必须写在 `:param` 路径之前，否则被通配抢先匹配。
- **金额单位**：全程"分"。新增展示务必经 `format.formatPrice`，新增输入务必经 `format.yuanToFen`。
- **401 提示**：页面 catch 中跳过 `code===401` 的 toast（request 层已跳转登录），避免双重提示。
- **新增页面**：同步 `app.json.pages`；若为 tabBar 页还需同步 `utils/router.js` 的 `TAB_PAGES`。
- **storage 结构**：值被包裹为 `{v,e}`；直接读 raw storage 会拿到包裹对象，请统一走 `utils/storage`。
- **头像昵称不再重复采集**：判据在 `authService.profileSetupNeeded()`，只要 `auth.profile` 里有资料或 `skipped=true` 就不再弹。想重演首次授权场景：清 `petstore:auth.profile`（或 `storage.clear()`）后重新登录；Mock 下还需清 `mock.db` 才能回到“未设置”状态。
- **缓存的头像可能是临时路径**：`chooseAvatar` 返回的 `http://tmp/...` 在小程序重启后失效，`goods-image` 会自动回退占位（非 bug，接真实后端上传后消失）。

## 8. 关键文件速查

| 关注点 | 文件 |
|---|---|
| 全局开关/常量 | `config/index.js` |
| 请求/Token/401 | `utils/request.js` |
| 登录守卫/回跳 | `utils/router.js` |
| 缓存读写 | `utils/storage.js` |
| Mock 路由/失败注入 | `mock/server.js` |
| Mock 数据种子 | `mock/db.js` |
| 支付三态 | `services/payment.service.js` |
| 订单状态/退款/发货 | `services/order.service.js`、`config.orderStatus` |
| 微信登录 | `services/auth.service.js`、`mock/server.js` 的 `/auth/wechat-login` |
| 首次采集头像昵称/资料缓存 | `pages/login/login.js`、`services/auth.service.js`（`profileSetupNeeded`/`getCachedProfile`/`saveProfileCache`）、`config.storageKeys.profile` |
| 用户资料(后续修改) | `pages/profile/`、`services/user.service.js` 的 `updateProfile` |
| 状态容器 | `components/state-view/` |
| 图片占位/尺寸类 | `components/goods-image/` |
| 主题变量 | `assets/styles/theme.wxss` |
