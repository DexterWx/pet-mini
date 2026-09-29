// pages/login/login.js
// 微信一键登录：wx.login -> 后端按 openid 找/建用户 -> 保存 Token 并回跳 redirect。
// 昵称仅首次登录采集一次（step='profile'）并入库；头像仅本地缓存展示（不入库）。
const authService = require('../../services/auth.service')
const userService = require('../../services/user.service')
const router = require('../../utils/router')

Page({
  data: {
    redirect: '',
    logging: false,
    // login：微信一键登录；profile：首次登录补全昵称（仅第一次会出现）
    step: 'login',
    userId: '',
    avatar: '',
    nickname: '',
    saving: false,
  },

  onLoad (options) {
    this.setData({ redirect: options.redirect || '' })
  },

  // 手机号授权登录：主按钮为 open-type="getPhoneNumber"，用户同意后才拿到 phoneCode
  onGetPhoneNumber (e) {
    if (this.data.logging) return
    const detail = e.detail || {}
    // 未同意授权（无 code）：不允许登录
    if (!detail.code) {
      wx.showToast({ title: '需授权手机号后才能登录', icon: 'none' })
      return
    }
    this.setData({ logging: true })
    authService.login(detail.code).then(session => {
      const user = (session && session.user) || {}
      // 非首次：服务端资料已完整或本地已缓存（含曾主动跳过），直接进入，不再请求授权
      if (!authService.profileSetupNeeded(user)) {
        this._finish('登录成功')
        return
      }
      // 首次登录：请求一次昵称采集（头像仅本地）
      const cache = authService.getCachedProfile(user.id) || {}
      this.setData({
        logging: false,
        step: 'profile',
        userId: user.id || '',
        avatar: cache.avatar || '',
        nickname: cache.nickname || '',
      })
    }).catch(err => {
      this.setData({ logging: false })
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    })
  },

  // 以下为首次采集：与“编辑资料”页同一套能力（chooseAvatar + type="nickname"）
  onChooseAvatar (e) {
    this.setData({ avatar: e.detail.avatarUrl })
  },

  onNickname (e) {
    this.setData({ nickname: e.detail.value })
  },

  onProfileSubmit () {
    if (this.data.saving) return
    const nickname = (this.data.nickname || '').trim()
    const avatar = this.data.avatar || ''
    if (!nickname) {
      wx.showToast({ title: '请设置昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    // 昵称入库；头像写本地缓存展示（不上传）
    userService.updateProfile({ nickname }).then(user => {
      authService.saveProfileCache({ userId: user.id, nickname: user.nickname, avatar })
      this._finish('已设置完成')
    }).catch(err => {
      this.setData({ saving: false })
      // 保存失败不阻断登录：可重试，也可“暂不设置”先进去，后续在“我的-编辑资料”再设
      if (err.code !== 401) wx.showToast({ title: err.message || '保存失败，可稍后在编辑资料重试', icon: 'none' })
    })
  },

  // 暂不设置：记住选择，后续登录不再重复请求，仅保留“我的-编辑资料”手动入口
  onProfileSkip () {
    authService.saveProfileCache({ userId: this.data.userId, skipped: true })
    this._finish('登录成功')
  },

  _finish (title) {
    wx.showToast({ title, icon: 'success' })
    router.afterLogin(this.data.redirect)
  },

  onSkip () {
    // 暂不登录：返回上一页或回首页
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  },
})
