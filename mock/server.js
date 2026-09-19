// mock/server.js
// Mock API 路由：模拟网络延迟、可配置失败率、Token 校验(401)。
// 返回统一结构 { code, data, message }，code=0 表示成功。
const config = require('../config/index')
const storage = require('../utils/storage')
const dbModule = require('./db')

const { CATEGORIES, PRODUCTS } = dbModule

function ok (data) { return { code: 0, data, message: 'ok' } }
function err (code, message) { return { code, message, data: null } }

function delay () {
  const [a, b] = config.mock.latency
  const ms = a + Math.random() * (b - a)
  return new Promise(resolve => setTimeout(resolve, ms))
}

function shouldFail () {
  if (storage.get(config.storageKeys.mockFail, false)) return true
  return Math.random() < config.mock.failRate
}

let seq = 0
function nextId (prefix) {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}`
}
function genToken () {
  return 'tk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Mock 微信身份：真实后端由 code2Session 用 code 换取 openid；Mock 无法调用微信接口，
// 固定为单一 openid 以演示“按 openid 找/建用户”（首次登录即注册，之后直接登录）。
const MOCK_OPENID = 'mock_openid_dev'

function publicUser (u) {
  if (!u) return null
  return {
    id: u.id, nickname: u.nickname, avatar: u.avatar,
    balanceFen: u.balanceFen, points: u.points, coupons: u.coupons,
  }
}

function currentUser (meta) {
  const db = dbModule.db
  if (!meta || !meta.token) return null
  return db.users.find(u => u.token === meta.token) || null
}

function productBrief (p) {
  return { id: p.id, title: p.title, categoryId: p.categoryId, priceFen: p.priceFen, stock: p.stock, sold: p.sold, images: p.images, desc: p.desc }
}

function cartLines (userId) {
  const db = dbModule.db
  const lines = db.carts[userId] || []
  return lines
    .map(line => {
      const p = PRODUCTS.find(x => x.id === line.productId)
      if (!p) return null
      return {
        productId: line.productId,
        qty: line.qty,
        checked: !!line.checked,
        product: { id: p.id, title: p.title, images: p.images, priceFen: p.priceFen, stock: p.stock },
      }
    })
    .filter(Boolean)
}

// ---------- handlers ----------
const handlers = {
  // 微信登录：模拟 code2Session（用 code 换 openid）-> 按 openid 找/建用户 -> 返回 token+user
  'POST /auth/wechat-login' (body) {
    const db = dbModule.db
    const openid = MOCK_OPENID
    let user = db.users.find(u => u.openid === openid)
    const isNewUser = !user
    if (!user) {
      // 不存在则注册并登录
      user = {
        id: nextId('u'), openid,
        nickname: '微信用户', avatar: '',
        balanceFen: 0, points: 0, coupons: 0, token: genToken(),
      }
      db.users.push(user)
    } else {
      // 已存在直接登录，轮换 token
      user.token = genToken()
    }
    dbModule.save()
    return ok({ token: user.token, user: publicUser(user), isNewUser })
  },
  'GET /auth/profile' (body, ctx) {
    return ok(publicUser(ctx.user))
  },

  'GET /home/banner' () {
    return ok([
      { id: 'b1', image: 'https://picsum.photos/seed/banner1/750/360', title: '新品上市' },
      { id: 'b2', image: 'https://picsum.photos/seed/banner2/750/360', title: '满减优惠' },
      { id: 'b3', image: 'https://picsum.photos/seed/banner3/750/360', title: '会员日' },
    ])
  },
  'GET /home/entries' () {
    return ok({
      squares: [
        { key: 'buy', title: '点击下单', sub: '提前下单免排队' },
        { key: 'orders', title: '订单中心', sub: '' },
      ],
      promos: [
        { key: 'contact', title: '联系我们', sub: 'CONTACT US' },
        { key: 'recharge', title: '余额充值', sub: 'BALANCE RECHARGE' },
      ],
    })
  },

  'GET /categories' () {
    return ok(CATEGORIES.map(c => ({ id: c.id, name: c.name })))
  },

  'GET /products/recommend' () {
    return ok(PRODUCTS.slice(0, 6).map(productBrief))
  },
  'GET /products/:id' (body, ctx, params) {
    const p = PRODUCTS.find(x => x.id === params.id)
    if (!p) return err(404, '商品不存在')
    const category = CATEGORIES.find(c => c.id === p.categoryId)
    return ok(Object.assign(productBrief(p), { categoryName: category ? category.name : '' }))
  },
  'GET /products' (query) {
    let list = PRODUCTS.slice()
    if (query.categoryId && query.categoryId !== 'all') {
      list = list.filter(p => p.categoryId === query.categoryId)
    }
    if (query.keyword) {
      const kw = String(query.keyword).toLowerCase()
      list = list.filter(p => p.title.toLowerCase().indexOf(kw) >= 0)
    }
    const sort = query.sort || 'default'
    const order = query.order === 'asc' ? 1 : -1
    if (sort === 'sales') list.sort((a, b) => (a.sold - b.sold) * order)
    else if (sort === 'price') list.sort((a, b) => (a.priceFen - b.priceFen) * order)
    const page = Number(query.page || 1)
    const pageSize = Number(query.pageSize || 10)
    const total = list.length
    const start = (page - 1) * pageSize
    const slice = list.slice(start, start + pageSize)
    return ok({ list: slice.map(productBrief), total, page, pageSize, hasMore: start + pageSize < total })
  },

  'GET /cart' (body, ctx) {
    return ok(cartLines(ctx.user.id))
  },
  'POST /cart/add' (body, ctx) {
    const db = dbModule.db
    const { productId, qty = 1 } = body
    const p = PRODUCTS.find(x => x.id === productId)
    if (!p) return err(404, '商品不存在')
    const lines = db.carts[ctx.user.id] || (db.carts[ctx.user.id] = [])
    const line = lines.find(l => l.productId === productId)
    const target = (line ? line.qty : 0) + Number(qty)
    if (target > p.stock) return err(400, '库存不足')
    if (line) line.qty = target
    else lines.push({ productId, qty: Number(qty), checked: true })
    dbModule.save()
    return ok(cartLines(ctx.user.id))
  },
  'POST /cart/update' (body, ctx) {
    const db = dbModule.db
    const { productId, qty, checked } = body
    const lines = db.carts[ctx.user.id] || []
    const line = lines.find(l => l.productId === productId)
    if (!line) return err(404, '购物车中不存在该商品')
    if (qty !== undefined) {
      const p = PRODUCTS.find(x => x.id === productId)
      if (Number(qty) <= 0) {
        db.carts[ctx.user.id] = lines.filter(l => l.productId !== productId)
      } else {
        if (p && Number(qty) > p.stock) return err(400, '库存不足')
        line.qty = Number(qty)
      }
    }
    if (checked !== undefined) line.checked = !!checked
    dbModule.save()
    return ok(cartLines(ctx.user.id))
  },
  'POST /cart/remove' (body, ctx) {
    const db = dbModule.db
    const { productId } = body
    db.carts[ctx.user.id] = (db.carts[ctx.user.id] || []).filter(l => l.productId !== productId)
    dbModule.save()
    return ok(cartLines(ctx.user.id))
  },

  'GET /orders' (query, ctx) {
    const db = dbModule.db
    let list = db.orders.filter(o => o.userId === ctx.user.id)
    if (query.status === config.orderStatus.PAID_UNSHIPPED) {
      // “未发货” tab：尚未取消且未发货（含退款申请中）
      const group = [config.orderStatus.PAID_UNSHIPPED, config.orderStatus.REFUND_REQUESTED]
      list = list.filter(o => group.indexOf(o.status) >= 0)
    } else if (query.status) {
      list = list.filter(o => o.status === query.status)
    }
    list.sort((a, b) => b.createdAt - a.createdAt)
    return ok(list)
  },
  'GET /orders/:id' (body, ctx, params) {
    const db = dbModule.db
    const o = db.orders.find(x => x.id === params.id && x.userId === ctx.user.id)
    if (!o) return err(404, '订单不存在')
    return ok(o)
  },
  'POST /orders/create' (body, ctx) {
    const db = dbModule.db
    const items = body.items || []
    if (!items.length) return err(400, '订单商品不能为空')
    const lines = []
    let totalFen = 0
    for (const it of items) {
      const p = PRODUCTS.find(x => x.id === it.productId)
      if (!p) return err(404, '商品不存在')
      if (p.stock < Number(it.qty)) return err(400, `「${p.title}」库存不足`)
      lines.push({ productId: p.id, title: p.title, image: p.images[0], priceFen: p.priceFen, qty: Number(it.qty) })
      totalFen += p.priceFen * Number(it.qty)
    }
    // 扣减库存、累加销量
    lines.forEach(l => {
      const p = PRODUCTS.find(x => x.id === l.productId)
      p.stock -= l.qty
      p.sold += l.qty
    })
    const order = {
      id: nextId('o'), orderNo: 'NO' + Date.now(),
      userId: ctx.user.id, items: lines, totalFen,
      status: config.orderStatus.PAID_UNSHIPPED,
      createdAt: Date.now(), shippedAt: 0,
    }
    db.orders.push(order)
    // 下单后清空购物车中对应商品
    db.carts[ctx.user.id] = (db.carts[ctx.user.id] || []).filter(l => !lines.some(x => x.productId === l.productId))
    dbModule.save()
    return ok(order)
  },
  'POST /orders/:id/ship' (body, ctx, params) {
    const db = dbModule.db
    const o = db.orders.find(x => x.id === params.id && x.userId === ctx.user.id)
    if (!o) return err(404, '订单不存在')
    o.status = config.orderStatus.SHIPPED
    o.shippedAt = Date.now()
    dbModule.save()
    return ok(o)
  },
  // 用户申请退款：PAID_UNSHIPPED -> REFUND_REQUESTED
  'POST /orders/:id/refund' (body, ctx, params) {
    const db = dbModule.db
    const o = db.orders.find(x => x.id === params.id && x.userId === ctx.user.id)
    if (!o) return err(404, '订单不存在')
    if (o.status !== config.orderStatus.PAID_UNSHIPPED) return err(400, '当前订单状态不可申请退款')
    o.status = config.orderStatus.REFUND_REQUESTED
    o.refundRequestedAt = Date.now()
    dbModule.save()
    return ok(o)
  },
  // 用户撤回退款申请：REFUND_REQUESTED -> PAID_UNSHIPPED
  'POST /orders/:id/refund/revoke' (body, ctx, params) {
    const db = dbModule.db
    const o = db.orders.find(x => x.id === params.id && x.userId === ctx.user.id)
    if (!o) return err(404, '订单不存在')
    if (o.status !== config.orderStatus.REFUND_REQUESTED) return err(400, '当前订单状态不可撤回申请')
    o.status = config.orderStatus.PAID_UNSHIPPED
    o.refundRequestedAt = 0
    dbModule.save()
    return ok(o)
  },
  // 商家同意退款/直接取消（Mock，预留给 web 后台）：-> CANCELLED，回补库存
  'POST /orders/:id/cancel' (body, ctx, params) {
    const db = dbModule.db
    const o = db.orders.find(x => x.id === params.id && x.userId === ctx.user.id)
    if (!o) return err(404, '订单不存在')
    const cancellable = [config.orderStatus.PAID_UNSHIPPED, config.orderStatus.REFUND_REQUESTED]
    if (cancellable.indexOf(o.status) < 0) return err(400, '当前订单状态不可取消')
    o.status = config.orderStatus.CANCELLED
    o.cancelledAt = Date.now()
    // 回补库存、回退销量
    ;(o.items || []).forEach(l => {
      const p = PRODUCTS.find(x => x.id === l.productId)
      if (p) { p.stock += l.qty; p.sold -= l.qty }
    })
    dbModule.save()
    return ok(o)
  },

  'GET /user/balance' (body, ctx) {
    return ok({ balanceFen: ctx.user.balanceFen, points: ctx.user.points, coupons: ctx.user.coupons })
  },
  // 更新当前用户资料（微信头像昵称填写能力）
  'POST /user/profile' (body, ctx) {
    const { nickname, avatar } = body
    if (nickname !== undefined) {
      const n = String(nickname).trim().slice(0, 20)
      if (!n) return err(400, '昵称不能为空')
      ctx.user.nickname = n
    }
    if (avatar !== undefined) ctx.user.avatar = avatar
    dbModule.save()
    return ok(publicUser(ctx.user))
  },
  'GET /user/recharge-tiers' () {
    return ok([
      { thresholdFen: 50000, giftFen: 3000, label: '满500元', sub: '赠送30元' },
      { thresholdFen: 100000, giftFen: 10000, label: '满1000元', sub: '赠送100元' },
    ])
  },
  'POST /user/recharge' (body, ctx) {
    const { amountFen = 0, giftFen = 0 } = body
    if (Number(amountFen) <= 0) return err(400, '充值金额不正确')
    ctx.user.balanceFen += Number(amountFen) + Number(giftFen)
    dbModule.save()
    return ok({ balanceFen: ctx.user.balanceFen })
  },
  'GET /user/favorites' (body, ctx) {
    const db = dbModule.db
    const ids = db.favorites[ctx.user.id] || []
    return ok(ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean).map(productBrief))
  },
  'POST /user/favorites/toggle' (body, ctx) {
    const db = dbModule.db
    const { productId } = body
    const ids = db.favorites[ctx.user.id] || (db.favorites[ctx.user.id] = [])
    const idx = ids.indexOf(productId)
    let favorited
    if (idx >= 0) { ids.splice(idx, 1); favorited = false }
    else { ids.push(productId); favorited = true }
    dbModule.save()
    return ok({ favorited, ids })
  },

  'GET /contact/info' () {
    return ok({
      phone: '400-000-0000',
      wechat: 'danghuang-pet',
      hours: '9:00 - 18:00',
      notice: '客服功能即将接入微信客服，敬请期待',
    })
  },
}

// 路由表（注意：静态路径需放在 :param 之前）
const ROUTES = Object.keys(handlers).map(key => {
  const [method, pattern] = key.split(' ')
  return { method, pattern, segments: pattern.split('/').filter(Boolean), handler: handlers[key] }
})

function matchRoute (method, path) {
  const parts = path.split('/').filter(Boolean)
  for (const r of ROUTES) {
    if (r.method !== method) continue
    if (r.segments.length !== parts.length) continue
    const params = {}
    let matched = true
    for (let i = 0; i < r.segments.length; i++) {
      const seg = r.segments[i]
      if (seg.charAt(0) === ':') params[seg.slice(1)] = parts[i]
      else if (seg !== parts[i]) { matched = false; break }
    }
    if (matched) return { route: r, params }
  }
  return null
}

const AUTH_PATHS = ['/cart', '/orders', '/user']
function needAuth (path) {
  return AUTH_PATHS.some(p => path.indexOf(p) === 0) || path === '/auth/profile'
}

// 统一入口：request 层在 useMock 时调用
function request (method, path, data, meta) {
  return delay().then(() => {
    if (shouldFail()) return err(500, '模拟接口失败，请稍后重试')
    const found = matchRoute(method, path)
    if (!found) return err(404, '接口不存在: ' + path)
    const ctx = { user: currentUser(meta) }
    if (needAuth(path) && !ctx.user) return err(401, '请先登录')
    try {
      return found.route.handler(data || {}, ctx, found.params)
    } catch (e) {
      return err(500, 'Mock 处理异常: ' + e.message)
    }
  })
}

module.exports = { request }
