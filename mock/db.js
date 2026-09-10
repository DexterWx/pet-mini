// mock/db.js
// Mock 数据库：内存 + 本地持久化（仅持久化可变业务数据）。
// 商品/分类为“服务端”静态种子数据，不写入本地缓存（保证以 API 为准）。
const storage = require('../utils/storage')
const config = require('../config/index')

function img (seed) {
  return `https://picsum.photos/seed/${seed}/600/600`
}

const CATEGORIES = [
  { id: 'c_notice', name: '购买须知' },
  { id: 'c_dried', name: '烘干肉' },
  { id: 'c_veg', name: '蔬菜肉' },
  { id: 'c_fruit', name: '水果肉' },
  { id: 'c_fresh', name: '灭菌鲜食' },
  { id: 'c_freeze', name: '冻干类' },
  { id: 'c_teeth', name: '磨牙肉' },
  { id: 'c_cheese', name: '芝士肉' },
  { id: 'c_coat', name: '美毛亮肤' },
  { id: 'c_cookie', name: '脆脆饼干' },
  { id: 'c_reward', name: '奖励零食' },
]

const PRODUCTS = [
  { id: 'p001', title: '中秋月饼（上新，9.20号统一发出）', categoryId: 'c_reward', priceFen: 4900, stock: 1988, sold: 38, images: [img('mooncake'), img('mooncake2')], desc: '节日限定宠物月饼，天然食材手工制作，下单后统一发出。' },
  { id: 'p002', title: '99元随心配', categoryId: 'c_dried', priceFen: 9900, stock: 720, sold: 460, images: [img('pack99'), img('pack99b')], desc: '99 元随心搭配礼包，掌柜根据库存搭配多款零食，只多不少。' },
  { id: 'p003', title: '199元随心配', categoryId: 'c_dried', priceFen: 19900, stock: 888, sold: 203, images: [img('pack199'), img('pack199b')], desc: '199 元大容量随心配，适合多宠家庭囤货。' },
  { id: 'p004', title: '必看！购买须知！！', categoryId: 'c_notice', priceFen: 99900, stock: 1000, sold: 0, images: [img('notice')], desc: '所有零食均为人食用级别、无防腐剂；称重类手工称重只多不少；下单先做最新鲜。' },
  { id: 'p005', title: '鸡肉酿猪耳朵（超级大）', categoryId: 'c_teeth', priceFen: 4800, stock: 320, sold: 79, images: [img('pigear'), img('pigear2')], desc: '大块猪耳裹鸡胸肉，磨牙洁齿首选，超级大份量。' },
  { id: 'p006', title: '鸡肉燕麦球（上新）', categoryId: 'c_reward', priceFen: 1990, stock: 500, sold: 66, images: [img('oatball'), img('oatball2'), img('oatball3')], desc: '鲜鸡胸肉+熟燕麦粉+大米粉，黄蓝双色由天然果蔬粉调色，训练奖励、日常洁齿解馋都合适。' },
  { id: 'p007', title: '鸭肉秋葵饼', categoryId: 'c_veg', priceFen: 1690, stock: 430, sold: 147, images: [img('okra')], desc: '鸭肉绕秋葵切片烘干，清脆口感，补充膳食纤维。' },
  { id: 'p008', title: '鸡鸭双拼羊扇骨', categoryId: 'c_dried', priceFen: 2990, stock: 260, sold: 111, images: [img('fanbone')], desc: '鸡鸭双拼裹羊扇骨，大块耐咬，适合中大型犬。' },
  { id: 'p009', title: '冻干鸡肉粒', categoryId: 'c_freeze', priceFen: 3990, stock: 610, sold: 289, images: [img('freezechicken')], desc: '-38℃ 冻干锁鲜鸡胸肉粒，高蛋白低脂肪。' },
  { id: 'p010', title: '芝士鸡肉块', categoryId: 'c_cheese', priceFen: 2590, stock: 380, sold: 154, images: [img('cheese')], desc: '浓郁芝士裹鸡胸，香浓诱人，奖励神器。' },
  { id: 'p011', title: '三文鱼美毛饼', categoryId: 'c_coat', priceFen: 3290, stock: 290, sold: 98, images: [img('salmon')], desc: '深海三文鱼富含 Omega-3，助力美毛亮肤。' },
  { id: 'p012', title: '南瓜鸡肉脆饼', categoryId: 'c_cookie', priceFen: 1890, stock: 470, sold: 132, images: [img('pumpkin')], desc: '南瓜+鸡胸烘烤脆饼，酥脆可口，易消化。' },
  { id: 'p013', title: '苹果鸡肉粒', categoryId: 'c_fruit', priceFen: 2190, stock: 350, sold: 87, images: [img('apple')], desc: '苹果丁裹鸡胸肉，果香清新，维生素补充。' },
  { id: 'p014', title: '低温灭菌鸡肉鲜食', categoryId: 'c_fresh', priceFen: 4590, stock: 200, sold: 76, images: [img('fresh')], desc: '低温慢煮+灭菌工艺鲜食，开袋即食，冷链发货。' },
]

function seedMutable () {
  return {
    users: [],
    orders: [],
    carts: {},
    favorites: {},
  }
}

let db = load()

function load () {
  const saved = storage.get(config.storageKeys.db, null)
  if (saved && typeof saved === 'object') {
    return Object.assign(seedMutable(), saved)
  }
  return seedMutable()
}

function save () {
  storage.set(config.storageKeys.db, {
    users: db.users,
    orders: db.orders,
    carts: db.carts,
    favorites: db.favorites,
  })
}

function reset () {
  db = seedMutable()
  save()
}

module.exports = {
  get db () { return db },
  CATEGORIES,
  PRODUCTS,
  save,
  reset,
}
