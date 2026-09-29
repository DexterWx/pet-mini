// utils/request.js
// 统一请求层：基于 wx.request 访问真实后端。
// 自动注入 Token、归一化错误、401 清登录态并跳登录。
const config = require('../config/index')
const storage = require('./storage')

class ApiError extends Error {
  constructor (code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.message = message
  }
}

function getToken () {
  return storage.get(config.storageKeys.token, '')
}

function handleUnauthorized () {
  storage.remove(config.storageKeys.token)
  storage.remove(config.storageKeys.user)
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  if (cur && cur.route === 'pages/login/login') return
  wx.navigateTo({ url: '/pages/login/login' })
}

function transport (opts, meta) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseURL + opts.url,
      method: opts.method,
      data: opts.data,
      header: Object.assign(
        { 'Content-Type': 'application/json' },
        meta.token ? { Authorization: 'Bearer ' + meta.token } : {}
      ),
      success: res => {
        const body = res.data || {}
        resolve({ code: res.statusCode === 200 ? 0 : res.statusCode, data: body.data, message: body.message })
      },
      fail: e => reject(new ApiError(-1, (e && e.errMsg) || '网络异常')),
    })
  })
}

// request({ url, method, data, auth, loading }) => Promise<data>
function request (options) {
  const opts = Object.assign({ method: 'GET', data: {}, auth: false, loading: false }, options)
  if (opts.loading) wx.showLoading({ title: '加载中…', mask: true })
  const finish = () => { if (opts.loading) wx.hideLoading() }
  const meta = { token: getToken(), auth: opts.auth }

  return transport(opts, meta).then(res => {
    finish()
    if (res.code === 401) {
      handleUnauthorized()
      throw new ApiError(401, res.message || '请先登录')
    }
    if (res.code !== 0) throw new ApiError(res.code, res.message || '请求失败')
    return res.data
  }).catch(e => {
    finish()
    if (e instanceof ApiError) throw e
    throw new ApiError(-1, (e && e.message) || '网络异常')
  })
}

module.exports = { request, ApiError }
