// pages/profile/profile.js
// 编辑资料：使用微信“头像昵称填写能力”采集头像与昵称并保存。
// 首次登录已在登录页采集过一次，本页是后续的修改入口。
const authService = require('../../services/auth.service')
const userService = require('../../services/user.service')

Page({
  data: {
    avatar: '',
    nickname: '',
    saving: false,
  },

  onLoad () {
    // 优先用已缓存的头像昵称（首次登录采集结果），避免用户重复输入
    const cached = authService.getCachedProfile()
    const user = authService.getCachedUser() || {}
    this.setData({
      avatar: user.avatar || (cached && cached.avatar) || '',
      nickname: user.nickname || (cached && cached.nickname) || '',
    })
  },

  // 选择头像：返回临时文件路径（真实环境需先 wx.uploadFile 上传换取正式 URL 再提交）
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
    userService.updateProfile({ nickname, avatar: this.data.avatar }).then(user => {
      // 同步刷新头像昵称缓存，保证后续登录直接使用最新资料
      authService.saveProfileCache(user)
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    }).catch(err => {
      this.setData({ saving: false })
      if (err.code !== 401) wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    })
  },
})
