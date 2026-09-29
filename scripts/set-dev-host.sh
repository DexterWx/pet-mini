#!/bin/sh
# 自动探测本机局域网 IP 并回写到 config/index.js 的 DEV_HOST。
#
# 用途：小程序真机联调必须请求「电脑的局域网 IP」，而开发者工具勾的
#       「不校验合法域名」与「局域网模式」都不解决手机到不了电脑这件事。
#       换 WiFi / IP 变了之后，跑一次本脚本即可，不用手改配置文件。
#
# 用法：
#   sh pet-mini/scripts/set-dev-host.sh              # 自动探测
#   sh pet-mini/scripts/set-dev-host.sh 192.168.1.23 # 手动指定
set -e

CFG="$(cd "$(dirname "$0")/.." && pwd)/config/index.js"
PORT="$(sed -n "s/^const DEV_PORT = '\([^']*\)'.*/\1/p" "$CFG")"
[ -n "$PORT" ] || PORT=8000

IP="$1"
if [ -z "$IP" ]; then
  for iface in en0 en1 en2 en3; do
    IP="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    [ -n "$IP" ] && break
  done
fi

if [ -z "$IP" ]; then
  echo "✗ 没探测到局域网 IP（可能未连 WiFi/有线）。请手动指定：sh $0 <电脑IP>"
  exit 1
fi

# 只替换 DEV_HOST 那一行，其他内容不动
sed -i '' "s/^const DEV_HOST = '[^']*'/const DEV_HOST = '$IP'/" "$CFG"

echo "✓ 已写入 DEV_HOST = $IP"
echo "  小程序 baseURL: http://$IP:$PORT/api/v1/client"
echo ""
echo "下一步："
echo "  1) 确认后端监听在所有网卡：cd pet-back && make serve   （已绑定 0.0.0.0:${PORT}）"
echo "  2) 手机与电脑连同一个 WiFi"
echo "  3) 手机浏览器打开 http://$IP:$PORT/api/v1/client/categories 能出 JSON 即网络通"
echo "  4) 开发者工具重新「预览」扫码"
