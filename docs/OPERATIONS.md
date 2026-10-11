# picedit — 写真仕上げスタジオ（MVP）

業務ごとの写真の困りごとを解決する画像加工サービスの MVP です。3つのモードがあります。

| モード | できること | 処理場所 |
|---|---|---|
| **商品写真（EC）** | 背景除去 → 白／単色背景 → 余白・接地影 → Amazon / 楽天 / Yahoo! / メルカリ規定サイズで書き出し（複数枚は ZIP） | ブラウザ内（WebGPU / WASM） |
| **不動産・室内** | 自動垂直補正（キーストーン）・手動4点補正・HDR合成（露出融合）・色かぶり補正・窓の白飛び抑制 | API（OpenCV） |
| **古い写真の修復** | 色あせ・黄ばみ補正、傷・折れ跡の検出とブラシ修正・除去、AI（高解像度化・カラー化・顔の復元）＋忠実度スライダー | API（OpenCV）＋外部AI |

## 対応言語・URL

日本語・English・简体中文・繁體中文・한국어 の5言語。URL は `/{ja|en|zh-CN|zh-TW|ko}/`（商品写真）、`/real-estate/`、`/photo-restoration/`、`/privacy/`。
全ページをビルド時にプリレンダリングし、hreflang・canonical・構造化データ・sitemap.xml を自動生成します。`/` はブラウザの言語で振り分けます。

翻訳は `web/src/i18n/messages/*.ts`（日本語 `ja.ts` が基準。キーの過不足は型チェックとテストで検出）。

## 広告・アフィリエイト・アクセス解析

ID は `web/src/config/monetization.ts` が環境変数（`VITE_GA_MEASUREMENT_ID` / `VITE_ADSENSE_CLIENT` / `VITE_AMAZON_ASSOCIATE_TAG` / `VITE_RAKUTEN_AFFILIATE_ID`）から読みます。本番値は `web/.env.production.local`（gitignore 対象。雛形は `.env.production.local.example`）に置きます。未設定の機能は無効になります。`ads.txt` は `web/ads.txt.local` に置くと、`scripts/build-mixhost.sh` が `public_html/` へ配置します。

- タグは本番ビルドにだけ入ります（開発サーバー・テストでは広告の代わりに配置確認用の枠を表示）
- AdSense は画面に近づいた枠から遅延読み込み、GA はページ読み込み後に読み込み（表示速度のため）
- 広告は操作ボタンから離して配置（サイドバー＝PC のみ、使い方と FAQ の間、おすすめ機材の一覧内、ページ下部）
- おすすめ機材は機能ごとに Amazon / 楽天の検索リンク（`rel="sponsored"`、PR 表記、Amazon アソシエイトの定型文をフッターに表示）

## 構成

```
api/   FastAPI + OpenCV + Pillow（Python 3.11 / uv）
web/   Vite + React + TypeScript（transformers.js で BiRefNet_lite をブラウザ実行）
e2e/   Playwright（各モードの通し操作）
```

- 背景除去モデル: `onnx-community/BiRefNet_lite-ONNX`（MIT）。読み込めない環境では簡易背景除去（単色背景向け）に自動で切り替えます。`?segmenter=simple` を付けると最初から簡易版を使います。
- 外部AI: `AIProvider` インターフェース（`api/app/providers/`）の Replicate 実装。Real-ESRGAN（BSD-3）/ DDColor（Apache-2.0）/ GFPGAN（Apache-2.0）。`REPLICATE_API_TOKEN` が未設定なら AI ボタンは無効になり、他の機能はそのまま使えます。
- 非商用ライセンスのモデル（RMBG-1.4、CodeFormer）と AGPL の `@imgly/background-removal` は使っていません。

## 起動

```bash
# API（http://127.0.0.1:8000）
cd api
cp .env.example .env        # 必要なら REPLICATE_API_TOKEN を設定
uv sync
uv run uvicorn app.main:app --reload

# フロントエンド（http://localhost:5173/ja/、/api は 8000 へプロキシ）
cd web
npm install
npm run dev
```

本番ビルド（プリレンダリング込み）は `SITE_URL=https://あなたのドメイン npm run build`。

## mixhost へのデプロイ

本番 URL は https://picedit.newlife-startup.com/ 。`bash scripts/build-mixhost.sh` で `deploy/` に一式ができます。手順は [docs/deploy-mixhost.md](docs/deploy-mixhost.md)。
SEO の現状と改善計画は [docs/seo-strategy.md](docs/seo-strategy.md)。

## テスト

```bash
cd api && uv run pytest --cov=app          # 単体＋API結合テスト
cd web && npm test -- --coverage && npm run build && npm run lint
cd e2e && npm install && npx playwright install chromium && npm run fixtures && npm test
```

## API

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/health` | 稼働状況と AI の利用可否 |
| POST | `/api/convert` | HEIC などを JPEG に変換 |
| POST | `/api/realestate/auto-vertical` | 自動垂直補正（`X-Picedit-Applied` ヘッダで適用有無） |
| POST | `/api/realestate/perspective` | 4点指定の射影補正（`points` = JSON `[[x,y]×4]`） |
| POST | `/api/realestate/hdr` | 露出ブラケット 2〜5 枚を合成（`files`） |
| POST | `/api/realestate/finish` | `white_balance` / `highlight`(0〜1) / `clahe` |
| POST | `/api/restore/fade` | 色あせ補正 |
| POST | `/api/restore/scratch-mask` | 傷マスク（`sensitivity` 0〜1） |
| POST | `/api/restore/inpaint` | `file` と `mask` で傷を除去 |
| POST | `/api/restore/ai/{upscale\|colorize\|face_restore}` | AI 処理（`strength` 0〜1 で元画像とブレンド） |

画像を返すエンドポイントは `?format=png|jpeg` を受け付けます。エラーは `{"success": false, "data": null, "error": "…", "code": "file_too_large", "params": {…}}` 形式です（`code` をフロントエンドで各言語に翻訳）。

## データの取り扱い

- 商品写真の背景除去はブラウザ内で完結し、画像はサーバーに送信されません。
- API に送られた画像はメモリ上で処理し、ディスクに保存しません（応答は `Cache-Control: no-store`）。AI の学習にも使いません。
- AI 処理を有効にした場合、画像は Replicate に送信されます。利用規約・プライバシーポリシーにその旨を明記してください。
- アップロード制限: 20MB、1辺 8000px まで。対応形式は JPEG / PNG / WebP / HEIC。

## 本番公開前にやること

- レート制限（現状は無し）
- 運営者情報・お問い合わせページ（AdSense 審査に必要）
- EEA・英国向けの同意管理（AdSense 管理画面で Google 認定 CMP を有効化）
- 利用規約（肖像権・著作権、他人の写真の加工に関する条項）
- モール規定（`web/src/presets/malls.json`、2026-09-27 時点）の定期的な見直し
- Replicate のモデル入力パラメータを実際のトークンで確認（テストはモックのみ）

## Phase 2 候補

物の除去・バーチャルステージング（拡散モデル）、生成背景・リライティング、C2PA による加工履歴の埋め込み、課金（Stripe）、1枚写真からの 3D 表示。
