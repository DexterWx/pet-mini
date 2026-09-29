// services/user.service.js
// 用户资料/余额/充值/收藏（服务端数据）+ 最近浏览（本地 UX 数据）。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

// 更新当前用户资料（仅昵称）；成功后同步刷新本地用户快照。
// 头像不入库，由页面写入本地 profile 缓存展示。
function updateProfile (data) {
  return request({ url: '/user/profile', method: 'POST', auth: true, loading: true, data })
    .then(user => { storage.set(config.storageKeys.user, user); return user })
}

function getBalance () {
  return request({ url: '/user/balance', auth: true })
}

// 换绑手机号：传入 getPhoneNumber 授权码（只能重新取微信绑定号，不能改任意号）
function rebindPhone (phoneCode) {
  return request({ url: '/user/phone/rebind', method: 'POST', auth: true, loading: true, data: { phoneCode } })
    .then(user => { storage.set(config.storageKeys.user, user); return user })
}

// 可充档位（用户只能点选档位，不可自输金额）
function getRechargeTiers () {
  return request({ url: '/user/recharge-tiers', auth: true })
}

// 按档位发起充值预下单（金额与赠送额由服务端算定，不传金额）
function rechargePrepay (tierId) {
  return request({ url: '/user/recharge/prepay', method: 'POST', auth: true, loading: true, data: { tierId } })
}

// 轮询充值单到账状态（以服务端为准）
function getRechargeRecord (paymentNo) {
  return request({ url: '/user/recharge/record', auth: true, data: { paymentNo } })
}

// 我的充值记录（仅已到账）
function getRechargeRecords (params) {
  return request({ url: '/user/recharge-records', auth: true, data: params || {} })
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

module.exports = {
  updateProfile, rebindPhone, getBalance, getRechargeTiers, rechargePrepay, getRechargeRecord,
  getRechargeRecords, getFavorites, toggleFavorite, getRecentViewed, addRecentViewed,
}
