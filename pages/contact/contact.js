// pages/contact/contact.js
// 联系我们/客服：占位页，后续接微信客服（button open-type="contact"）。
const contactService = require('../../services/contact.service')

Page({
  data: {
    status: 'loading',
    info: null,
  },

  onLoad () {
    this.load()
  },

  load () {
    this.setData({ status: 'loading' })
    contactService.getInfo().then(info => {
      this.setData({ info, status: 'ok' })
    }).catch(() => {
      this.setData({ status: 'error' })
    })
  },

  onCall () {
    if (!this.data.info) return
    wx.showModal({
      title: '客服电话',
      content: this.data.info.phone,
      showCancel: false,
    })
  },

  onService () {
    contactService.openCustomerService()
  },
})
