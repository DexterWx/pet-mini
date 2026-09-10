// services/auth.service.js
// 认证服务：Mock 手机号+密码登录/注册 + Token 登录态管理。
// 未来接真实认证（短信/微信授权）时仅替换本文件实现，页面层不变。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

function saveSession (session) {
  storage.set(config.storageKeys.token, session.token)
  storage.set(config.storageKeys.user, session.user)
}

function clearSession () {
  storage.remove(config.storageKeys.token)
  storage.remove(config.storageKeys.user)
}

function login (phone, password) {
  return request({ url: '/auth/login', method: 'POST', data: { phone, password }, loading: true })
    .then(session => { saveSession(session); return session })
}

function register (phone, password, nickname) {
  return request({ url: '/auth/register', method: 'POST', data: { phone, password, nickname }, loading: true })
    .then(session => { saveSession(session); return session })
}

function logout () {
  clearSession()
}

function getToken () {
  return storage.get(config.storageKeys.token, '')
}

function isLoggedIn () {
  return !!getToken()
}

// 本地缓存的用户快照（仅用于首屏展示，权威数据以 fetchProfile 为准）
function getCachedUser () {
  return storage.get(config.storageKeys.user, null)
}

function fetchProfile () {
  return request({ url: '/auth/profile', auth: true })
    .then(user => { storage.set(config.storageKeys.user, user); return user })
}

module.exports = { login, register, logout, getToken, isLoggedIn, getCachedUser, fetchProfile }
