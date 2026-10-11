# mixhost へのデプロイ手順

picedit は「静的サイト（public_html）」と「画像処理 API（Python）」の2つで構成されます。
mixhost では、静的サイトを `.htaccess` 付きで `public_html` に置き、API は cPanel の
**「Python アプリケーションのセットアップ（Setup Python App）」**（Passenger）で `/api` に割り当てます。

> ⚠ 事前確認：ご契約のプランの cPanel に「Setup Python App」があり、**Python 3.11 以上**を選べることを確認してください。
> 無い場合は API だけ別サービス（Render / Fly.io など）に置き、`VITE_API_BASE` にその URL を指定してビルドします（末尾「API を別サーバーに置く場合」）。

## 0. サブドメイン picedit.newlife-startup.com を作る（初回のみ）

本番 URL は **https://picedit.newlife-startup.com/** です。

1. cPanel →「ドメイン」（または「サブドメイン」）→「作成」
   - ドメイン：`picedit.newlife-startup.com`
   - ドキュメントルート：`picedit.newlife-startup.com`（例：`/home/ユーザー名/picedit.newlife-startup.com`）
     ※ 以降の手順の「public_html」は、この**ドキュメントルート**に読み替えてください
2. cPanel →「SSL/TLS Status」で `picedit.newlife-startup.com` の無料 SSL（AutoSSL）を発行
3. `https://picedit.newlife-startup.com/` にアクセスし、mixhost の既定ページ（`ty10099.mixhost.jp` へのリダイレクト）ではなく、空のディレクトリまたはテストページが表示されることを確認

## 1. デプロイ用ファイルを作る（手元の PC）

本番ドメインは既定値として設定済みなので、次のコマンドだけで作れます。

```bash
bash scripts/build-mixhost.sh
```

以下は別ドメインで試す場合の例です。

```bash
SITE_URL=https://あなたのドメイン bash scripts/build-mixhost.sh
```

`deploy/` に次の2つができます。

| フォルダ | アップロード先 |
|---|---|
| `deploy/public_html/` の中身（`.htaccess` を含む） | `public_html/` |
| `deploy/picedit-api/` | ホームディレクトリ直下の `picedit-api/`（public_html の外） |

`SITE_URL` は canonical・hreflang・sitemap.xml・OGP に埋め込まれます。**本番ドメインで必ずビルドし直してください。**

## 2. API（Python アプリ）を作成する

1. cPanel →「Setup Python App」→「CREATE APPLICATION」
2. 設定値

   | 項目 | 値 |
   |---|---|
   | Python version | 3.11 以上 |
   | Application root | `picedit-api` |
   | Application URL | `picedit.newlife-startup.com/api` |
   | Application startup file | `passenger_wsgi.py` |
   | Application Entry point | `application` |

3. 「Environment variables」に必要なら追加
   - `REPLICATE_API_TOKEN` … AI 修復（高解像度化・カラー化・顔の復元）を使う場合のみ
4. 画面上部に表示される「仮想環境に入るコマンド」を SSH（または cPanel のターミナル）で実行し、依存パッケージを入れる

   ```bash
   source /home/ユーザー名/virtualenv/picedit-api/3.11/bin/activate
   cd ~/picedit-api
   pip install -r requirements.txt
   ```

5. 「RESTART」を押す
6. 動作確認：`https://picedit.newlife-startup.com/api/health` が `{"success":true,...}` を返すこと

## 3. 静的サイトを配置する

`deploy/public_html/` の中身をすべて `public_html/` にアップロードします（FTP なら隠しファイル `.htaccess` の転送設定に注意）。

確認項目：

- `https://あなたのドメイン/` → ブラウザの言語に応じて `/ja/` などへリダイレクト
- `https://あなたのドメイン/ja/real-estate` → `/ja/real-estate/` へ 301
- `http://` → `https://` へ 301、`www.` 付き → なしへ 301
- `https://あなたのドメイン/ads.txt`・`/robots.txt`・`/sitemap.xml` が表示される
- 存在しない URL で 404 ページ（noindex）が表示される

## 4. 公開後の設定

- **SSL**：cPanel の「SSL/TLS Status」で無料 SSL を有効化。HTTPS での表示を確認するまで `.htaccess` の `Strict-Transport-Security` 行はコメントアウトしておくと安全です。
- **Google Search Console**：ドメインを登録し、`sitemap.xml` を送信。
- **AdSense**：サイトを追加して審査を申請（`ads.txt` は配置済み）。EEA・英国の利用者向けに、AdSense 管理画面の「プライバシーとメッセージ」で Google 認定の同意管理（CMP）を有効にしてください。
- **アナリティクス**：GA4 のプロパティで「拡張計測機能 → ページビュー（ブラウザの履歴イベントに基づくページの変更）」が有効なことを確認（ページ切り替えも計測されます）。

## API を別サーバーに置く場合

```bash
cd web
VITE_API_BASE=https://api.example.com SITE_URL=https://あなたのドメイン npm run build
```

API 側の環境変数 `CORS_ORIGINS` に `["https://あなたのドメイン"]` を設定します。

## 注意点

- アップロード上限は API 側で 20MB です。LiteSpeed の設定でリクエストサイズが制限されている場合は、サポートに確認してください。
- HDR 合成や AI 修復は処理に数十秒かかることがあります。タイムアウトが起きる場合は画像を小さくするか、API を別サーバーに移してください。
- `.htaccess` はローカルの Apache で動作確認していません。公開直後に上記の確認項目を必ずチェックしてください。
