// services/product.service.js
// 商品列表/详情/搜索/推荐。价格与库存为关键业务数据，一律实时取 API，不读缓存。
const { request } = require('../utils/request')

// params: { categoryId, keyword, sort:'default'|'sales'|'price', order:'asc'|'desc', page, pageSize }
function getList (params) {
  return request({ url: '/products', data: params || {} })
}

function getDetail (id) {
  return request({ url: '/products/' + id })
}

function getRecommend () {
  return request({ url: '/products/recommend' })
}

function search (keyword, params) {
  return getList(Object.assign({ keyword }, params))
}

module.exports = { getList, getDetail, getRecommend, search }
