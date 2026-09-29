// services/shipping.service.js
// 运费规则（全站一套）：供商品详情/购物车/结算页展示包邮标识并预估运费。
// 重要：下单时服务端会按同一规则重算并快照到订单，本文件的计算结果仅用于展示。
const { request } = require('../utils/request')
const config = require('../config/index')

function getConfig () {
  return request({ url: '/shipping/config' })
}

// 算出应付运费（分）：自提一律免运费；免邮判定只看商品金额合计
function calcFreight (shipping, goodsTotalFen, deliveryType) {
  if (!shipping) return 0
  if (deliveryType === config.deliveryType.SELF_PICKUP) return 0
  if (shipping.freeThresholdFen > 0 && goodsTotalFen >= shipping.freeThresholdFen) return 0
  return shipping.baseFreightFen || 0
}

// 生成购物车/详情页的包邮提示文案
function freightTip (shipping, goodsTotalFen, deliveryType) {
  if (!shipping) return ''
  if (deliveryType === config.deliveryType.SELF_PICKUP) return '自提免运费'
  const base = shipping.baseFreightFen || 0
  const threshold = shipping.freeThresholdFen || 0
  if (base <= 0) return '包邮'
  if (threshold <= 0) return '快递运费 ¥' + (base / 100).toFixed(2)
  if (goodsTotalFen >= threshold) return '已享包邮'
  return '再买 ¥' + ((threshold - goodsTotalFen) / 100).toFixed(2) + ' 免运费'
}

// 商品详情页用的规则描述（不依赖己选数量）
function ruleText (shipping) {
  if (!shipping) return ''
  const base = shipping.baseFreightFen || 0
  const threshold = shipping.freeThresholdFen || 0
  if (base <= 0) return '全场包邮'
  if (threshold <= 0) return '快递运费 ¥' + (base / 100).toFixed(2)
  return '满 ¥' + (threshold / 100).toFixed(2) + ' 包邮　·　快递运费 ¥' + (base / 100).toFixed(2)
}

module.exports = { getConfig, calcFreight, freightTip, ruleText }
