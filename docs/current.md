# pet-mini 现状交接（Current Status）

> 接手前请先阅读 [architecture.md](./architecture.md)。本文描述"当前做到哪、怎么跑、哪些是假设/遗留"。
> 最近更新：**功能全部完成**。彻底移除 Mock（走真实后端）；手机号强制登录；微信支付 v3 真实到账；**订单完成态**（列表 6 tab 含待收货/已完成、确认收货、退款窗口/驳回锁定）；首页正方形大图广告牌（可点入商品详情、仅显启用项）；**我的收藏页**、**充值记录页**；运费/包邮提示。`pet-web` 管理后台已全部完成（含仪表盘/广告牌/交易设置等）。上线部署见仓库根 `DEPLOY.md`。

## 1. 一句话现状

小程序已联调真实后端：手机号强制登录 + 地址/下单/支付（微信 v3）/退款售后 + 订单 **6 tab**（含待收货/已完成）+ 确认收货 + 我的收藏页 + 充值记录页 + 首页正方形广告牌（可跳商品详情）；**无 Mock**。商品/广告图走 OSS。`pet-back`、`pet-web` 均已完成；**当前只剩部署上线 + 等备案（见仓库根 `DEPLOY.md` / `HANDOFF.md`）**。

## 2. 如何运行

1. 微信开发者工具 → 导入项目 → 选择 `/pet-store/pet-mini`（appid 见 `project.config.json`）。
2. 详情 → 本地设置 → 勾选 **"不校验合法域名…"**（用于加载远程占位图 `picsum.photos`）。
3. 编译运行。离线时商品图自动回退本地 CSS 占位，不影响流程。需先启动 `pet-back`（`make serve`）。
4. 支付：订单与充值均走**真实微信支付**（`PAYMENT_PROVIDER=mock` 时后端即时成功，无需拉起）；结果一律以服务端为准（轮询订单状态 / 充值单状态）。已无本地 ActionSheet 模拟支付，`config.payment.autoSuccess` 已移除。

### 真机联调（重要，否则必然“加载失败，请重试”）

`config/index.js` 的 `baseURL` 由顶部 `DEV_HOST` 拼装，**必须是电脑的局域网 IP而不是 127.0.0.1**：
手机上的 127.0.0.1 是手机自己，请求永远到不了电脑上的后端。开发者工具能跑只因为工具跑在同一台机器上。

两个必要条件（缺一不可）：
1. 后端监听所有网卡：`pet-back/Makefile` 的 `serve`/`dev` 已改为绑定 `0.0.0.0:8000`（只绑 127.0.0.1 时即使 IP 对了也连不上）。
2. `DEV_HOST` 等于当前局域网 IP。**不要手改**，换网络后跑一次：
   ```bash
   sh pet-mini/scripts/set-dev-host.sh      # 自动探测并回写 DEV_HOST
   cd pet-back && make lan-url              # 只打印当前局域网地址与自检 URL
   ```

排查顺序：先用手机浏览器打开 `http://<电脑IP>:8000/api/v1/client/categories`，能出 JSON 再查小程序。
不出 JSON = 网络层问题（不同 WiFi / 路由器 AP 隔离 / IP 变了 / 防火墙）；出 JSON 但小程序失败 = 小程序侧配置问题。

⚠️ 开发者工具的「**局域网模式**」只改变真机调试的**调试通道**（手机与工具直连），不改变 `wx.request` 由手机发出这一事实，因此**不能代替**上面的修复。“不校验合法域名”也只作用于开发者工具模拟器。

### 冒烟走查路径
未登录浏览首页/分类/搜索/详情 → 点购物车/我的进入需登录态 → 微信一键登录（后端按 openid 找/建用户，首次即注册）→ **仅首次会弹“设置昵称”卡片**（可点头像选图 + 填昵称，或点“暂不设置”；昵称入库、头像仅本地）→ **退出登录再登录一次，确认不再弹采集且昵称直接使用** → 新增收货地址 → 加购/选地址与配送方式/结算 → 订单列表与详情 → 申请退款/撤回 → 我的页编辑资料/收货地址/余额/充值。

## 3. 已完成功能清单

- 分层：config → utils/request(wx.request) → services → pages；页面零业务硬编码。
- 认证：**手机号强制登录**。主按钮 `open-type="getPhoneNumber"` → `onGetPhoneNumber` 拿 phoneCode，连同 wx.login 的 code 一起 POST `/auth/wechat-login`；后端换 openid+手机号入库，**未授权不能登录**。`profile` 页显示手机号、可换绑（`/user/phone/rebind`，重走 getPhoneNumber）。Token 持久化/自动携带、401 清态跳登录、`goRequireLogin` 守卫与回跳。
- 昵称/头像：**昵称**首次登录采集一次→ `POST /user/profile` 入库；**头像仅存本地缓存 `auth.profile`不入库**（chooseAvatar 临时路径，重启失效属正常）；后续登录由 `profileSetupNeeded()`（基于昵称）判定，不重复弹采集；保留“暂不设置”出口。
- 用户资料：`pages/profile` 作为后续修改入口（同一套头像昵称填写能力），保存后同步刷新缓存；“我的”页头部用缓存秒开（余额等数值等接口）。
- 首页：banner(swiper **正方形大图 hero**，高=宽 702rpx，仅展示后台启用项；**配了跳转商品的 banner 点击直达商品详情**) + 功能入口（金刚位：点击下单/订单中心；promo 卡：余额充值）；banner/入口 SWR 缓存。（已取消“为您推荐”与首页“联系我们”入口。）
- 分类：左栏分类(含"全部") + 右栏商品列表 + 综合/销量/价格排序 + 分页加载。
- 搜索：最近搜索(本地) + 结果网格 + 空态。
- 商品详情：swiper 图集(1/N) + 价格/销量（无库存）+ **🚚 包邮/运费标识**（读 `GET /shipping/config`）+ 客服(微信原生会话)/购物车/收藏/加购/立即购买。
- 购物车：勾选/全选/步进/删除/合计/去结算 + 空态；需登录。结算栏小字提示“已享包邮 / 再买 ¥X 免运费 / 包邮”（按**已勾选商品金额**计算）。（已取消推荐区。）
- 订单：确认订单(选地址+配送方式+**支付方式**、实时价) → **金额明细三行（商品金额 / 运费 / 合计）** → 创建待付款单 → `payment.service.payOrder(id, method)`（微信拉起+轮询 / 余额即时）。**余额与微信不可混用**，余额不足只能整单走微信（不弹密码）；切换配送方式会重算运费（自提免运费）。
- **订单完成态（批次⑤）**：列表 **6 tab**（全部/未付款/未发货/**待收货**/**已完成**/退款售后）；待收货可“**确认收货**”（详情页主按钮 + 列表卡片按钮），发货后满 N 天未确认系统**自动完成**（详情页显示“发货超期未确认，系统已自动确认收货”）。是否可退/可确认均由服务端 `canRefund/canConfirm` 下发（含退款窗口与驳回锁定），前端不重复算。**自提单**订单详情的物流单号行显示“#”（自提无真实物流单号）。状态机见 architecture.md 第 6 节。
- 我的：头像/昵称(点头部进“编辑资料”)/余额 + 订单快捷入口 + 常用工具（**一行 6 个等分**：购物车/我的收藏/收货地址/余额充值/在线客服/退出登录）+ 最近浏览。（积分/优惠券已删除；已去掉跳页的“联系客服”入口与 contact 页。）
- 我的收藏：`pages/favorites/`（已登录可见，未登录引导登录）。双列网格复用 `goods-card`，点卡片进详情、卡片内可加购，**长按卡片可取消收藏**（复用 `/user/favorites/toggle`）；空态提供“去逛逛分类”引导。列表来自 `/user/favorites`（已下架/删除的商品服务端不会返回）。
- 充值：**只能点选管理后台配置的档位（无自输金额输入框）**，选中后实时展示“实充 / 赠送 / 到账合计”；支付走真实微信支付，**入账由后端回调驱动**，前端轮询 `/user/recharge/record` 确认到账（旧 `POST /user/recharge` 直入账已下线）。余额头部有「充值记录 >」入口。
- 充值记录：`pages/recharge/records/`（已登录可见）。仅展示用户真实充值（source=USER），倒序分页（触底加载）；每条显示时间/实充/赠送/到账合计；后台调余额不在此展示。空态提供“去充值”引导。
- 联系我们/客服：**已接微信原生客服，并删除了独立的 contact 页面、`contact.service.js` 与后端 `/contact/info`**；首页也不再放“联系我们”入口。现在只有两处客服入口：商品详情底栏 🎧 与「我的」在线客服 🎧。两处均用**绝对定位的透明 `<button open-type="contact">` 覆盖层**实现（不能直接把 button 当 flex 子项：微信 button 的 UA 样式无法完全重置，会撑宽导致底栏按钮溢出/工具项不对齐）。客服自动回复由老板在**微信公众平台**设置，不在管理后台配置。
- 状态覆盖：所有列表/详情经 `state-view` 处理 loading/empty/error(+retry)/ok。

## 4. 已做验证

- 全部 `.js` 通过 `node --check`；`app.json` / `project.config.json` JSON 解析正常。
- 本轮改动（登录页首次采集头像昵称 + `auth.profile` 缓存复用）已用 Node 桩化 `wx` 跑通端到端冒烟：首次登录 `profileSetupNeeded=true` → 保存后缓存写入 → 退出登录缓存保留 → 二次登录 `needsSetup=false`（不再采集）→ “暂不设置”后再登录也 `false` → 不同 userId 读取返回 `null`（不串号）。
- 早期 Node 桩化 `wx` 对 `mock/server` 端到端冒烟通过：分类/商品/排序/搜索/详情、购物车增改、下单(PAID_UNSHIPPED、合计正确)、发货(SHIPPED)、未授权(401)、余额/充值加赠/档位、收藏、banner/entries/contact、404、profile。
- 本轮改动（微信登录 `/auth/wechat-login`、订单退款/取消、`/user/profile`）已过编辑器诊断(GetProblems)无报错 + 人工走查；**尚未重跑全量 Node 冒烟**。接手建议补测：微信登录建/找用户、退款申请↔撤回↔取消(库存回补)、未发货 tab 分组、资料保存。
- 未做：真机/开发者工具 UI 走查（需人工在 devtools 打开确认视觉）。

## 5. 关键假设与决策（接手勿随意推翻）

- 渲染器用 **webview**（弃 Skyline），保证吸顶/固定底栏/瀑布流稳定。
- 订单状态机：`PAID_UNSHIPPED` →(用户申请退款) `REFUND_REQUESTED` →(商家同意/直接取消) `CANCELLED`；或 →(发货) `SHIPPED`(不可取消)。`REFUNDING/REFUNDED` 待接入真实支付后启用。**订单仅支付成功后创建**。详见 architecture.md 第 5 节。
- 未登录可看：首页/分类/搜索/详情（搜索视为浏览入口）；其余需登录。
- tabBar 暂**纯文字**（无图标），图标后期放 `assets/` 再接。
- 商品列表/详情**不读缓存**（价格关键数据实时取）；仅 banner/分类 SWR。
- 昵称首次登录采集一次并入库；**头像不再上传，仅本地缓存展示**（用户自己能看到即可，不追求跨设备/重启持久）。退出登录不清该缓存。
- **无库存概念（现做）**：商品无 stock，下单不扣库存。
- 商品图为远程占位 URL（picsum seed），`goods-image` 失败回退本地占位。
- UI 占位统一在 `assets/styles/`（theme 变量 + placeholder），业务代码用 `var(--x)`。

## 6. 遗留 / 待办（Next）

- ~~接真实后端~~ 已完成（Mock 已删，固定走 `wx.request` + `config.baseURL`）。
- ~~手机号强制绑定登录~~ **已完成（D）**：登录主按钮 `open-type="getPhoneNumber"`，未授权手机号不能登录；`profile` 页显示手机号与换绑入口（重走 getPhoneNumber，不接短信不能改任意号）。
- ~~新订单通知（老板）~~ **已完成**：由**后端** `services/notify.py` 用企业微信群机器人 webhook 推送（新订单已支付 + 用户退款申请），小程序端无需配合（早期订阅消息方案已移除）。
- ~~微信支付替换 payment.service~~ **已完成（C）**：`payment.service.payOrder(orderId, method)` 走真实统单+`wx.requestPayment`+轮询到账（以服务端为准），并支持余额支付；~~微信客服替换 contact.service~~ **已完成**；~~payRecharge 本地模拟~~ **已接真实微信支付（批次③）**。
- 退款资金流：当前同意/发起退款为同步记账态（REFUNDED）；待补微信退款回调驱动 REFUNDING→REFUNDED 与掉单主动查单补偿。
- tabBar 图标、正式 UI 资源替换 `assets/`。
- 可选增强：~~收藏列表页~~ **已完成（pages/favorites/）**、充值记录页（后端 `/user/recharge-records` 已就绪，前端待做）、~~收货地址~~ 已有、~~订单搜索~~ 不做、下拉刷新覆盖更多页、骨架屏替换 spinner。
- `components/navigation-bar/` 为模板遗留、当前未引用，可删可留。

## 7. 接手易踩坑（Gotchas）

- **组件样式隔离**：父级 wxss 不能改子组件内部节点。`goods-image` 尺寸必须用其内部 `gi-*` 类经 `customClass` 传入；在外层定义尺寸类无效。
- **Token 轮换**：每次登录会换 Token；用旧 Token 请求会 401（属正常行为，测试时取最新登录返回）。
- **金额单位**：全程"分"。新增展示务必经 `format.formatPrice`，新增输入务必经 `format.yuanToFen`。
- **401 提示**：页面 catch 中跳过 `code===401` 的 toast（request 层已跳转登录），避免双重提示。
- **新增页面**：同步 `app.json.pages`；若为 tabBar 页还需同步 `utils/router.js` 的 `TAB_PAGES`。
- **storage 结构**：值被包裹为 `{v,e}`；直接读 raw storage 会拿到包裹对象，请统一走 `utils/storage`。
- **昵称不再重复采集**：判据 `authService.profileSetupNeeded()`（基于昵称）；服务端已有昵称或本地已缓存/已 skipped 就不再弹。想重演首次采集：清 `petstore:auth.profile`（或 `storage.clear()`）后重新登录。
- **头像仅本地**：`chooseAvatar` 返回的 `http://tmp/...` 不入库、重启后失效，`goods-image` 自动回退占位（预期行为，非 bug）。

## 8. 关键文件速查

| 关注点 | 文件 |
|---|---|
| 全局开关/常量 | `config/index.js` |
| 请求/Token/401 | `utils/request.js` |
| 登录守卫/回跳 | `utils/router.js` |
| 缓存读写 | `utils/storage.js` |
| 支付三态 | `services/payment.service.js` |
| 订单状态/退款 | `services/order.service.js`、`config.orderStatus` |
| 收货地址 | `services/address.service.js`、`pages/address/` |
| 微信登录 | `services/auth.service.js`、后端 `/auth/wechat-login` |
| 首次采集头像昵称/资料缓存 | `pages/login/login.js`、`services/auth.service.js`（`profileSetupNeeded`/`getCachedProfile`/`saveProfileCache`）、`config.storageKeys.profile` |
| 用户资料(后续修改) | `pages/profile/`、`services/user.service.js` 的 `updateProfile` |
| 状态容器 | `components/state-view/` |
| 图片占位/尺寸类 | `components/goods-image/` |
| 主题变量 | `assets/styles/theme.wxss` |
