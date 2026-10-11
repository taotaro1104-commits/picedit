<div align="center">

# picedit

**撮った写真を、そのまま「使える写真」に。**
ブラウザで動く、用途特化型の写真補正ツール

[![Live Demo](https://img.shields.io/badge/demo-picedit-1f6f5c?style=for-the-badge)](https://picedit.newlife-startup.com/ja/)
![Free](https://img.shields.io/badge/price-free-success?style=flat-square)
![No signup](https://img.shields.io/badge/sign--up-not%20required-blue?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-ja%20%7C%20en%20%7C%20zh--CN%20%7C%20zh--TW%20%7C%20ko-orange?style=flat-square)

[🇯🇵 日本語](https://picedit.newlife-startup.com/ja/) ・ [🇺🇸 English](https://picedit.newlife-startup.com/en/) ・ [🇨🇳 简体中文](https://picedit.newlife-startup.com/zh-CN/) ・ [🇹🇼 繁體中文](https://picedit.newlife-startup.com/zh-TW/) ・ [🇰🇷 한국어](https://picedit.newlife-startup.com/ko/)

<!-- ここにビフォーアフターのGIF（商品写真→白背景）を置くと一番効きます -->
<!-- ![demo](docs/demo.gif) -->

</div>

---

## なぜ作ったか

汎用の画像編集ソフトは「何でもできる」代わりに、ネットショップの出品者や不動産会社が本当に欲しい
**「規定どおりの1枚」** にたどり着くまでの手順が多すぎます。

picedit は用途を3つに絞り、それぞれのゴール（モールの画像規定、物件写真の見栄え、思い出の写真の復元）から逆算して機能を設計しました。

## 3つのツール

### 🛍️ [商品写真 — 背景除去・白背景](https://picedit.newlife-startup.com/ja/)

| 機能 | 内容 |
|---|---|
| 自動背景除去 | アップロードするだけで背景を除去し、純白 (RGB 255,255,255) 上に配置 |
| モール規定プリセット | Amazon / 楽天市場 / Yahoo!ショッピング / メルカリのサイズ・余白ルールを自動適用 |
| 一括処理 | 複数枚をまとめて処理し、ZIPで一括書き出し |
| マスク修正 | ブラシで「消す / 残す」を手動調整 |
| 接地影 | 商品が浮いて見えないよう自然な影を付与 |

> **Amazon メイン画像の場合**：2000×2000px / JPEG、純白背景、商品占有率85%以上で書き出し。

### 🏠 [不動産・室内写真 — ゆがみ補正・HDR合成](https://picedit.newlife-startup.com/ja/real-estate/)

| 機能 | 内容 |
|---|---|
| 自動垂直補正 | 柱やドア枠の縦線を検出し、射影変換でまっすぐに |
| 手動4点補正 | 自動でうまくいかない場合の4点指定 |
| HDR合成 | 露出違いの2〜5枚を合成（多少の手ぶれは自動位置合わせ） |
| 窓の白飛び抑制 | 明るい窓部分のハイライトを回復 |
| 色かぶり補正・暗部補正 | ホワイトバランスと局所コントラストの調整 |

### 📷 [古い写真の修復 — 色あせ補正・傷除去](https://picedit.newlife-startup.com/ja/photo-restoration/)

| 機能 | 内容 |
|---|---|
| 色あせ・黄ばみ補正 | 退色した色を自動で復元 |
| 傷・折れ跡の検出と除去 | 感度を調整して自動検出 → ブラシで微調整 → 周囲から補完 |
| AI修復 | 高解像度化・白黒写真のカラー化・顔の復元 |
| 忠実度スライダー | AIの効き具合を調整し、元写真から離れすぎないように |

## 技術的なポイント

### 1. プライバシー優先：処理場所を機能ごとに選択

```
┌──────────────── ブラウザ ────────────────┐
│  商品写真の背景除去（端末内で完結）        │  → 画像はサーバーに送られない
└──────────────────────────────────────────┘
┌──────────────── サーバー ────────────────┐
│  重い処理（HDR合成 / AI修復 など）         │  → 処理後すぐ破棄・保存なし・学習利用なし
└──────────────────────────────────────────┘
```

商品写真は未発売品・在庫情報を含むことがあるため、最も利用頻度の高い背景除去は **ブラウザ内で完結** させています。

- **推論**：[transformers.js](https://github.com/huggingface/transformers.js)（ONNX Runtime Web）で WebGPU / WASM 上に実行
- **モデル**：[`onnx-community/BiRefNet_lite-ONNX`](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX)（MIT）
- **フォールバック**：モデルを読み込めない環境では、単色背景向けの簡易背景除去に自動で切り替え
- **ライセンス**：商用利用に制約のあるモデル（RMBG-1.4、CodeFormer）や AGPL ライブラリは採用していません

### 2. 「規定」をデータとして持つ

各モールの画像ルール（サイズ、形式、背景色、商品占有率）をプリセットとして定義し、
切り抜き結果のバウンディングボックスから **商品が規定の占有率に収まるよう自動でスケール・センタリング** します。

プリセットは JSON（[`web/src/presets/malls.json`](web/src/presets/malls.json)）で持ち、読み込み時に型と範囲を検証します。

```json
{
  "id": "amazon",
  "width": 2000, "height": 2000,
  "fillRatio": 0.88,
  "background": "#FFFFFF", "backgroundLocked": true,
  "format": "jpeg", "quality": 0.92
}
```

楽天・Yahoo!・メルカリも同じスキーマで、サイズや占有率だけが異なります（背景色は変更可能）。

### 3. 古典的な画像処理 × AI の使い分け

- **垂直補正**：線分検出 → 消失点推定 → 射影変換（ホモグラフィ）
- **HDR合成**：特徴点ベースの位置合わせ → 露出合成
- **傷検出**：細い線状の欠損を検出してマスク化 → インペインティング
- **AI**：高解像度化・カラー化・顔復元は「効き具合」でオリジナルとブレンドし、別人化を防止


> 上記の垂直補正・HDR合成・傷検出は **サーバー側（Python + OpenCV）** で実行します。HEIC の読み込みには `pillow-heif` を使用。
> AI修復は `AIProvider` インターフェースで抽象化し、現在は Replicate 経由で Real-ESRGAN（高解像度化）/ DDColor（カラー化）/ GFPGAN（顔の復元）を呼び出します。
> API トークンが未設定の場合は AI ボタンのみ無効になり、他の機能はそのまま使えます。

### 4. スマホ写真をそのまま扱える

JPEG / PNG / WebP に加え **HEIC（iPhone）** に対応。最大20MB。

### 5. 5言語対応・SEOを意識した静的ルーティング

`/ja/` `/en/` `/zh-CN/` `/zh-TW/` `/ko/` のサブディレクトリ構成で、各言語ページに canonical・OGP を設定。

## 技術スタック

| 領域 | 使用技術 |
|---|---|
| フロントエンド | Vite + React 19 + TypeScript（全ページをビルド時にプリレンダリング）、テストは Vitest / Playwright |
| ブラウザ内推論 | transformers.js + ONNX Runtime Web（WebGPU / WASM）、BiRefNet_lite |
| 画像処理 | OpenCV（`opencv-python-headless`）、Pillow、pillow-heif |
| サーバー | FastAPI（Python 3.11 / uv） |
| AI修復 | Replicate（Real-ESRGAN / DDColor / GFPGAN） |
| ホスティング | mixhost（静的サイト + cPanel の Python アプリ） |

## 使い方（商品写真の例）

1. [picedit](https://picedit.newlife-startup.com/ja/) を開き、商品写真をドラッグ＆ドロップ（複数可）
2. 背景が自動で消え、白背景上に配置される
3. 出品先（Amazon・楽天・Yahoo!・メルカリ）を選ぶ
4. 「この写真を書き出し」または「すべてZIPで書き出し」

## 注意事項

- 他人が権利を持つ写真を加工する場合は、権利者の許可を得てください。
- サイトは Google AdSense およびアフィリエイトプログラムにより運営されています。

## 関連ツール

- [動画編集ツール](https://movieedit.newlife-startup.com/)
- [PDF編集ツール](https://pdf.newlife-startup.com/)
- [AIツールデータベース](https://aitooldb.newlife-startup.com/)

---

<details>
<summary><b>English</b></summary>

**picedit** is a free, no-sign-up photo editor that runs in your browser, focused on three jobs:

- **Product photos** — automatic background removal, pure-white backgrounds, and one-click exports sized for Amazon, Rakuten, Yahoo! Shopping and Mercari. Batch processing and ZIP export. Background removal runs entirely in the browser; images never leave your device.
- **Real estate** — automatic vertical (keystone) correction via line detection and homography, 2–5 frame HDR merge with auto-alignment, window highlight recovery.
- **Photo restoration** — fade/yellowing correction, scratch and crease detection with inpainting, and AI upscaling, colorization and face restoration with a fidelity slider.

Supports JPEG / PNG / WebP / HEIC up to 20 MB. Available in Japanese, English, Simplified Chinese, Traditional Chinese and Korean.

👉 **Try it: https://picedit.newlife-startup.com/en/**

</details>
