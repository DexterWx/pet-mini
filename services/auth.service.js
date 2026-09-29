// services/auth.service.js
// 认证服务：微信一键登录（wx.login -> 后端按 openid 找/建用户）+ Token 登录态管理
// + 头像昵称缓存（首次登录采集一次，之后直接复用，不重复请求授权）。
// 无需单独注册：后端判断当前用户，存在则直接登录，不存在则注册并登录。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

function saveSession (session) {
  storage.set(config.storageKeys.token, session.token)
  storage.set(config.storageKeys.user, session.user)
}

function clearSession () {
  // 只清登录态；头像昵称缓存（storageKeys.profile）保留，下次登录直接使用，不重复请求授权
  storage.remove(config.storageKeys.token)
  storage.remove(config.storageKeys.user)
}

// ---------- 头像昵称缓存 ----------
// 微信已于 2022-10 取消静默获取用户信息（getUserProfile 只返回匿名“微信用户”+灰头像），
// 真实头像昵称必须靠“头像昵称填写能力”由用户主动点一次。因此只在**首次登录**采集一次，
// 结果同时写服务端（/user/profile）与本缓存，之后登录与展示直接复用，不再重复请求。
// 注意：chooseAvatar 返回的是临时文件路径，接真实后端后应先上传换取正式 URL 再缓存。

// 资料是否已完整（以服务端快照为准；头像不入库，故只看昵称）
function isProfileReady (user) {
  return !!(user && user.nickname)
}

// 读取缓存；传入 userId 时做归属校验，避免换账号串号
function getCachedProfile (userId) {
  const cache = storage.get(config.storageKeys.profile, null)
  if (!cache) return null
  if (userId && cache.userId && cache.userId !== userId) return null
  return cache
}

// 写入/合并缓存；profile 可是服务端 user，也可是 { userId, nickname, avatar, skipped } 局部字段
function saveProfileCache (profile) {
  if (!profile) return
  const userId = profile.id || profile.userId || ''
  let prev = storage.get(config.storageKeys.profile, null)
  if (prev && userId && prev.userId && prev.userId !== userId) prev = null // 不同用户不继承
  prev = prev || {}
  storage.set(config.storageKeys.profile, {
    userId: userId || prev.userId || '',
    nickname: profile.nickname !== undefined ? profile.nickname : prev.nickname,
    avatar: profile.avatar !== undefined ? profile.avatar : prev.avatar,
    skipped: profile.skipped !== undefined ? !!profile.skipped : !!prev.skipped,
  })
}

// 登录时是否还需要采集昵称：服务端已有昵称或本地已缓存/已主动跳过 → 不需要（不打扰）
function profileSetupNeeded (user) {
  if (isProfileReady(user)) {
    saveProfileCache({ userId: user.id, nickname: user.nickname })
    return false
  }
  const cache = getCachedProfile(user && user.id)
  if (!cache) return true
  if (cache.skipped) return false
  return !cache.nickname
}

// 调用 wx.login 获取临时登录凭证 code
function getCode () {
  return new Promise(resolve => {
    wx.login({
      success: res => resolve((res && res.code) || ''),
      fail: () => resolve(''),
    })
  })
}

// 微信登录：wx.login 拿 code + getPhoneNumber 授权码 phoneCode 一起交后端（后端需手机号才能登录）
function login (phoneCode) {
  return getCode().then(code => {
    if (!code) throw new Error('微信登录失败，请重试')
    return request({ url: '/auth/wechat-login', method: 'POST', data: { code, phoneCode: phoneCode || '' }, loading: true })
  }).then(session => { saveSession(session); return session })
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
    .then(user => {
      storage.set(config.storageKeys.user, user)
      // 头像不入库，仅缓存昵称（保留本地头像，不用服务端空头像覆盖）
      if (user && user.nickname) saveProfileCache({ userId: user.id, nickname: user.nickname })
      return user
    })
}

module.exports = {
  login,
  logout,
  getToken,
  isLoggedIn,
  getCachedUser,
  fetchProfile,
  isProfileReady,
  getCachedProfile,
  saveProfileCache,
  profileSetupNeeded,
}
