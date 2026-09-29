// pages/profile/profile.js
// 编辑资料：使用微信“头像昵称填写能力”采集头像与昵称。
// 昵称存服务端；头像仅存本地缓存供本人展示（不入库）。
const authService = require('../../services/auth.service')
const userService = require('../../services/user.service')

Page({
  data: {
    avatar: '',
    nickname: '',
    phone: '',
    saving: false,
  },

  onLoad () {
    // 优先用本地缓存的头像（不入库），昵称/手机号以快照为准
    const cached = authService.getCachedProfile() || {}
    const user = authService.getCachedUser() || {}
    this.setData({
      avatar: cached.avatar || user.avatar || '',
      nickname: user.nickname || cached.nickname || '',
      phone: user.phone || '',
    })
  },

  // 选择头像：仅本地保存（临时路径），不上传后端
  onChooseAvatar (e) {
    this.setData({ avatar: e.detail.avatarUrl })
  },

  // 昵称：type="nickname" 支持一键填写微信昵称，input/blur/change 均同步
  onNickname (e) {
    this.setData({ nickname: e.detail.value })
  },

  onSave () {
    const nickname = (this.data.nickname || '').trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    if (this.data.saving) return
    this.setData({ saving: true })
    // 昵称存服务端；头像写本地缓存供展示
    userService.updateProfile({ nickname }).then(user => {
      authService.saveProfileCache({ userId: user.id, nickname: user.nickname, avatar: this.data.avatar })
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    }).catch(err => {
      this.setData({ saving: false })
      if (err.code !== 401) wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
  },

  // 换绑手机号：重新走微信 getPhoneNumber 授权（只能取当前微信号绑定的号）
  onRebindPhone (e) {
    const detail = e.detail || {}
    if (!detail.code) {
      wx.showToast({ title: '需授权手机号', icon: 'none' })
      return
    }
    userService.rebindPhone(detail.code).then(user => {
      this.setData({ phone: user.phone || '' })
      authService.saveProfileCache({ userId: user.id, nickname: user.nickname, avatar: this.data.avatar })
      wx.showToast({ title: '已更新手机号', icon: 'success' })
    }).catch(err => {
      if (err.code !== 401) wx.showToast({ title: err.message || '换绑失败', icon: 'none' })
    })
  },
})
