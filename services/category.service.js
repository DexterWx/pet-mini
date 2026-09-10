// services/category.service.js
// 分类列表。展示类数据允许 TTL 缓存 + 后台刷新(SWR)。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

function getCategories () {
  return request({ url: '/categories' })
}

function getCategoriesSWR (onCache) {
  const cached = storage.get('cache.category', null)
  if (cached && onCache) onCache(cached)
  return getCategories().then(fresh => {
    storage.set('cache.category', fresh, config.cache.ttl.category)
    return fresh
  })
}

module.exports = { getCategories, getCategoriesSWR }
