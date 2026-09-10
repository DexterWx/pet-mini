// utils/storage.js
// 带命名空间 + 可选 TTL 的安全本地缓存封装。
// 仅用于登录态、用户体验数据与非关键展示数据；关键业务数据不依赖缓存。
const config = require('../config/index')

const PREFIX = config.storageKeys.prefix

function _key (key) {
  return PREFIX + key
}

// set(key, value, ttl?) ttl 为毫秒，省略表示不过期
function set (key, value, ttl) {
  try {
    const wrap = { v: value, e: ttl ? Date.now() + ttl : 0 }
    wx.setStorageSync(_key(key), wrap)
    return true
  } catch (e) {
    return false
  }
}

// get(key, def) 过期自动清除并返回默认值
function get (key, def) {
  try {
    const wrap = wx.getStorageSync(_key(key))
    if (wrap === '' || wrap === undefined || wrap === null) return def
    if (wrap.e && Date.now() > wrap.e) {
      wx.removeStorageSync(_key(key))
      return def
    }
    return wrap.v
  } catch (e) {
    return def
  }
}

function remove (key) {
  try {
    wx.removeStorageSync(_key(key))
  } catch (e) {}
}

// 仅清除本应用命名空间下的缓存
function clear () {
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      if (k.indexOf(PREFIX) === 0) wx.removeStorageSync(k)
    })
  } catch (e) {}
}

module.exports = { set, get, remove, clear }
