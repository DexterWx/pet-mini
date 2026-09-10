// utils/router.js
// 导航封装 + 登录守卫。页面通过 goRequireLogin 访问需登录资源。
const config = require('../config/index')
const storage = require('./storage')

const TAB_PAGES = [
  'pages/index/index',
  'pages/category/category',
  'pages/cart/cart',
  'pages/mine/mine',
]

function isLoggedIn () {
  return !!storage.get(config.storageKeys.token, '')
}

function _routeOf (url) {
  return url.replace(/^\//, '').split('?')[0]
}

// 自动区分 tabBar 页与普通页
function navigate (url) {
  const route = _routeOf(url)
  if (TAB_PAGES.indexOf(route) >= 0) {
    wx.switchTab({ url: '/' + route })
  } else {
    wx.navigateTo({ url })
  }
}

function redirectTo (url) {
  const route = _routeOf(url)
  if (TAB_PAGES.indexOf(route) >= 0) {
    wx.switchTab({ url: '/' + route })
  } else {
    wx.redirectTo({ url })
  }
}

// 需登录跳转：已登录直接去目标页，否则携带 redirect 去登录页
function goRequireLogin (url) {
  if (isLoggedIn()) {
    navigate(url)
    return true
  }
  wx.navigateTo({
    url: '/pages/login/login?redirect=' + encodeURIComponent(url),
  })
  return false
}

// 登录成功后回跳
function afterLogin (redirect) {
  if (redirect) {
    redirectTo(decodeURIComponent(redirect))
    return
  }
  wx.switchTab({ url: '/pages/index/index' })
}

module.exports = {
  TAB_PAGES,
  isLoggedIn,
  navigate,
  redirectTo,
  goRequireLogin,
  afterLogin,
}
