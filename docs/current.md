# pet-mini 现状交接（Current Status）

> 接手前请先阅读 [architecture.md](./architecture.md)。本文描述"当前做到哪、怎么跑、哪些是假设/遗留"。
> 最近更新：Demo 首版完成（Mock-only，无真实后端）。

## 1. 一句话现状

小程序端 Demo 已完整可跑：12 个页面 + 4 组件 + 分层 services + Mock API + Token 认证 + Mock 支付 + 全状态（loading/空/失败）覆盖。`pet-back`、`pet-web` 未改动。

## 2. 如何运行

1. 微信开发者工具 → 导入项目 → 选择 `/pet-store/pet-mini`（appid 见 `project.config.json`）。
2. 详情 → 本地设置 → 勾选 **"不校验合法域名…"**（用于加载远程占位图 `picsum.photos`）。
3. 编译运行。离线时商品图自动回退本地 CSS 占位，不影响流程。
4. 体验错误态：我的 → 底部开发者开关"模拟接口失败"；或改 `config.mock.failRate`。
5. 体验支付三态：结算/充值点"支付"后在 ActionSheet 选 成功/失败/取消；想跳过可设 `config.payment.autoSuccess=true`。

### 冒烟走查路径
未登录浏览首页/分类/搜索/详情 → 点购物车/我的进入需登录态 → 注册/登录（手机号 11 位 + 密码≥6 位）→ 加购/结算/支付成功 → 订单列表与详情 → 模拟发货 → 我的页余额/充值 → 打开"模拟接口失败"验证各页 error+重试 → 关闭恢复。

## 3. 已完成功能清单

- 分层：config → utils/request → (mock/server | wx.request) → services → pages；页面零业务硬编码。
- 认证：Mock 手机号+密码登录/注册、Token 持久化与自动携带、401 清态跳登录、`goRequireLogin` 守卫与回跳。
- 首页：banner(swiper) + 功能入口(点击下单/订单中心/联系我们/余额充值) + 为您推荐；banner/入口 SWR 缓存。
- 分类：左栏分类(含"全部") + 右栏商品列表 + 综合/销量/价格排序 + 分页加载。
- 搜索：最近搜索(本地) + 结果网格 + 空态。
- 商品详情：swiper 图集(1/N) + 价格/库存/销量 + 客服占位/购物车/收藏/加购/立即购买。
- 购物车：勾选/全选/步进/删除/合计/去结算 + 空态 + 推荐；需登录。
- 订单：确认订单(实时价) → Mock 支付 → 创建已付款订单；订单列表(tab 全部/未发货/已发货)；订单详情；模拟发货。
- 我的：头像/昵称/余额/积分/券 + 订单快捷入口 + 常用工具 + 最近浏览 + 退出登录 + 开发者失败开关。
- 充值：余额卡 + 金额输入 + 满赠档位(来自 API) + Mock 支付入账。
- 联系我们/客服：占位页 + 占位 toast（后续接微信客服）。
- 状态覆盖：所有列表/详情经 `state-view` 处理 loading/empty/error(+retry)/ok。

## 4. 已做验证

- 全部 `.js` 通过 `node --check`。
- `app.json` / `project.config.json` JSON 解析正常。
- Node 桩化 `wx` 对 `mock/server` 端到端冒烟通过：注册/登录/错误密码(400)、未授权(401)、分类/商品/排序/搜索/详情/推荐、购物车增改、下单(PAID_UNSHIPPED、合计正确)、发货(SHIPPED)、余额/充值加赠/档位、收藏、banner/entries/contact、404、profile。
- 未做：真机/开发者工具 UI 走查（需人工在 devtools 打开确认视觉）。

## 5. 关键假设与决策（接手勿随意推翻）

- 渲染器用 **webview**（弃 Skyline），保证吸顶/固定底栏/瀑布流稳定。
- 订单简化两态：`PAID_UNSHIPPED`(已付款未发货) → `SHIPPED`(已发货)；**订单仅支付成功后创建**。
- 未登录可看：首页/分类/搜索/详情（搜索视为浏览入口）；其余需登录。
- tabBar 暂**纯文字**（无图标），图标后期放 `assets/` 再接。
- 商品列表/详情**不读缓存**（价格/库存关键数据实时取）；仅 banner/分类 SWR。
- 商品图为远程占位 URL（picsum seed），`goods-image` 失败回退本地占位。
- UI 占位统一在 `assets/styles/`（theme 变量 + placeholder），业务代码用 `var(--x)`。

## 6. 遗留 / 待办（Next）

- 接真实后端：`config.useMock=false` + `baseURL`；核对真实响应结构与 Mock 一致（`{code,data,message}`）。
- 真实认证（短信验证码/微信授权）替换 `auth.service`。
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
| 订单状态/发货 | `services/order.service.js`、`config.orderStatus` |
| 状态容器 | `components/state-view/` |
| 图片占位/尺寸类 | `components/goods-image/` |
| 主题变量 | `assets/styles/theme.wxss` |
