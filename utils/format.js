// utils/format.js
// 金额与时间格式化工具。金额统一以“分”(整数)存储与传输，展示时转换为元。

// 分 -> 元字符串，去除多余的 0（4900 -> "49"，1990 -> "19.9"）
function formatPrice (fen) {
  const n = Number(fen || 0)
  const yuan = n / 100
  if (Number.isInteger(yuan)) return String(yuan)
  return String(parseFloat(yuan.toFixed(2)))
}

// 分 -> 保留两位小数字符串（用于结算等需要对齐的场景）
function formatPriceFixed (fen) {
  return (Number(fen || 0) / 100).toFixed(2)
}

// 元(数字或字符串) -> 分
function yuanToFen (yuan) {
  return Math.round(Number(yuan || 0) * 100)
}

function _pad (n) {
  return n < 10 ? '0' + n : String(n)
}

// 时间戳 -> YYYY-MM-DD HH:mm
function formatTime (ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${_pad(d.getMonth() + 1)}-${_pad(d.getDate())} ${_pad(d.getHours())}:${_pad(d.getMinutes())}`
}

module.exports = { formatPrice, formatPriceFixed, yuanToFen, formatTime }
