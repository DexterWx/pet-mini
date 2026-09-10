// services/contact.service.js
// 联系我们/客服：当前为占位实现，后续接微信客服（button open-type="contact"）。
const { request } = require('../utils/request')

function getInfo () {
  return request({ url: '/contact/info' })
}

// 占位：后续替换为微信客服会话
function openCustomerService () {
  wx.showToast({ title: '客服功能即将接入微信客服', icon: 'none' })
}

module.exports = { getInfo, openCustomerService }
