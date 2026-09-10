// services/user.service.js
// 用户资料/余额/充值/收藏（服务端数据）+ 最近浏览（本地 UX 数据）。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

function getBalance () {
  return request({ url: '/user/balance', auth: true })
}

function getRechargeTiers () {
  return request({ url: '/user/recharge-tiers', auth: true })
}

function recharge (amountFen, giftFen) {
  return request({ url: '/user/recharge', method: 'POST', auth: true, loading: true, data: { amountFen, giftFen } })
}

function getFavorites () {
  return request({ url: '/user/favorites', auth: true })
}

function toggleFavorite (productId) {
  return request({ url: '/user/favorites/toggle', method: 'POST', auth: true, data: { productId } })
}

// ---- 最近浏览：本地 UX 数据，仅存 id，展示时仍向 API 取最新信息 ----
function getRecentViewed () {
  return storage.get(config.storageKeys.recentViewed, [])
}

function addRecentViewed (productId) {
  const ids = getRecentViewed().filter(id => id !== productId)
  ids.unshift(productId)
  storage.set(config.storageKeys.recentViewed, ids.slice(0, 20))
}

module.exports = { getBalance, getRechargeTiers, recharge, getFavorites, toggleFavorite, getRecentViewed, addRecentViewed }
