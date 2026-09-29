// services/address.service.js
// 收货地址簿（服务端按用户存储）：列表 / 新增 / 修改 / 删除。首个地址服务端自动设为默认。
const { request } = require('../utils/request')

function getList () {
  return request({ url: '/addresses', auth: true })
}

// data: { receiverName, phone, province, city, district, detail, isDefault }
function add (data) {
  return request({ url: '/addresses/add', method: 'POST', auth: true, loading: true, data })
}

// data 需含 id，其余字段同 add
function update (data) {
  return request({ url: '/addresses/update', method: 'POST', auth: true, loading: true, data })
}

function remove (id) {
  return request({ url: '/addresses/remove', method: 'POST', auth: true, loading: true, data: { id } })
}

module.exports = { getList, add, update, remove }
