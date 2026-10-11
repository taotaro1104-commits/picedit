#!/usr/bin/env bash
# mixhost にアップロードする一式を deploy/ に作る。
#
#   bash scripts/build-mixhost.sh    （本番: https://picedit.newlife-startup.com）
#
# 出力:
#   deploy/public_html/  … public_html にそのままアップロード（静的サイト＋.htaccess）
#   deploy/picedit-api/  … cPanel「Python アプリケーション」のアプリルートにアップロード
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy"

# 既定は本番ドメイン（別ドメインで試す場合は SITE_URL=... を付けて実行）
SITE_URL="${SITE_URL:-https://picedit.newlife-startup.com}"

echo "==> フロントエンドをビルド（SITE_URL=$SITE_URL）"
(cd "$ROOT/web" && SITE_URL="$SITE_URL" npm run build)

echo "==> API の requirements.txt を更新"
(cd "$ROOT/api" && uv export --no-dev --no-hashes --no-emit-project -q -o requirements.txt)

rm -rf "$OUT"
mkdir -p "$OUT/public_html" "$OUT/picedit-api"

cp -r "$ROOT/web/dist/." "$OUT/public_html/"
# ads.txt は公開リポジトリに含めないため、手元の web/ads.txt.local から配置する
if [ -f "$ROOT/web/ads.txt.local" ]; then cp "$ROOT/web/ads.txt.local" "$OUT/public_html/ads.txt"; else echo "WARN: web/ads.txt.local がありません（ads.txt を配置しません）"; fi
cp -r "$ROOT/api/app" "$OUT/picedit-api/app"
cp "$ROOT/api/passenger_wsgi.py" "$ROOT/api/requirements.txt" "$ROOT/api/.env.example" "$OUT/picedit-api/"
find "$OUT/picedit-api" -name "__pycache__" -type d -prune -exec rm -rf {} +

echo "==> 完了"
echo "  $OUT/public_html  → サーバーの public_html/"
echo "  $OUT/picedit-api  → サーバーの ~/picedit-api/（docs/deploy-mixhost.md 参照）"
