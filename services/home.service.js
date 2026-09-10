// services/home.service.js
// 首页 banner + 功能入口。展示类数据允许 TTL 缓存 + 后台刷新(SWR)。
const { request } = require('../utils/request')
const storage = require('../utils/storage')
const config = require('../config/index')

function swr (key, ttl, loader, onCache) {
  const cached = storage.get(key, null)
  if (cached && onCache) onCache(cached)
  return loader().then(fresh => {
    storage.set(key, fresh, ttl)
    return fresh
  })
}

function getBanners () {
  return request({ url: '/home/banner' })
}

function getEntries () {
  return request({ url: '/home/entries' })
}

function getBannersSWR (onCache) {
  return swr('cache.banner', config.cache.ttl.banner, getBanners, onCache)
}

function getEntriesSWR (onCache) {
  return swr('cache.entries', config.cache.ttl.banner, getEntries, onCache)
}

module.exports = { getBanners, getEntries, getBannersSWR, getEntriesSWR }
