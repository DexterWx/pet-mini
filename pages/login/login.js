// pages/login/login.js
// 登录/注册：Mock 手机号+密码。成功后保存 Token 并回跳 redirect。
const authService = require('../../services/auth.service')
const router = require('../../utils/router')

Page({
  data: {
    mode: 'login', // 'login' | 'register'
    phone: '',
    password: '',
    nickname: '',
    redirect: '',
  },

  onLoad (options) {
    this.setData({ redirect: options.redirect || '' })
  },

  onPhone (e) { this.setData({ phone: e.detail.value }) },
  onPassword (e) { this.setData({ password: e.detail.value }) },
  onNickname (e) { this.setData({ nickname: e.detail.value }) },

  toggleMode () {
    this.setData({ mode: this.data.mode === 'login' ? 'register' : 'login' })
  },

  onSubmit () {
    const { phone, password, nickname, mode } = this.data
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }
    const task = mode === 'login'
      ? authService.login(phone, password)
      : authService.register(phone, password, nickname)
    task.then(() => {
      wx.showToast({ title: mode === 'login' ? '登录成功' : '注册成功', icon: 'success' })
      router.afterLogin(this.data.redirect)
    }).catch(err => {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    })
  },

  onSkip () {
    // 暂不登录：返回上一页或回首页
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  },
})
