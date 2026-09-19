// pages/login/login.js
// 微信一键登录：wx.login -> 后端按 openid 找/建用户 -> 保存 Token 并回跳 redirect。
// 头像昵称仅首次登录时请求授权采集一次（step='profile'），入库 + 本地缓存后后续登录直接使用，不再重复询问。
const authService = require('../../services/auth.service')
const userService = require('../../services/user.service')
const router = require('../../utils/router')

Page({
  data: {
    redirect: '',
    logging: false,
    // login：微信一键登录；profile：首次登录补全头像昵称（仅第一次会出现）
    step: 'login',
    userId: '',
    avatar: '',
    nickname: '',
    saving: false,
  },

  onLoad (options) {
    this.setData({ redirect: options.redirect || '' })
  },

  onWechatLogin () {
    if (this.data.logging) return
    this.setData({ logging: true })
    authService.login().then(session => {
      const user = (session && session.user) || {}
      // 非首次：服务端资料已完整或本地已缓存（含曾主动跳过），直接进入，不再请求授权
      if (!authService.profileSetupNeeded(user)) {
        this._finish('登录成功')
        return
      }
      // 首次登录：请求一次头像昵称授权（微信“头像昵称填写能力”需用户主动点击，无法静默获取）
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
    if (!nickname && !avatar) {
      wx.showToast({ title: '请设置头像或昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    // 昵称为空时不传，避开后端“昵称不能为空”校验（只授权头像也算完成采集）
    const payload = { avatar }
    if (nickname) payload.nickname = nickname
    userService.updateProfile(payload).then(user => {
      authService.saveProfileCache(user)
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
