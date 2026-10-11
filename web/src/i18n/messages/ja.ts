// 日本語（基準言語）。他言語はこの型に合わせて定義し、キーの過不足を型チェックで防ぐ。

export const ja = {
  meta: {
    ec: {
      title: '商品写真の背景除去・白背景加工ツール｜Amazon・楽天・メルカリ対応 - picedit',
      description:
        'スマホで撮った商品写真の背景を自動で消して白背景に。Amazon・楽天・Yahoo!・メルカリの画像規定サイズで一括書き出し。登録不要・無料、画像はブラウザ内で処理されます。',
      h1: '商品写真の背景除去・白背景加工',
    },
    realestate: {
      title: '不動産・室内写真の自動補正｜ゆがみ補正・HDR合成・白飛び抑制 - picedit',
      description:
        '物件写真の傾き（垂直のゆがみ）を自動補正し、露出違いの写真をHDR合成。窓の白飛びや色かぶりもワンクリックで整えます。不動産会社・民泊の物件写真に。',
      h1: '不動産・室内写真の自動補正',
    },
    restore: {
      title: '古い写真の修復・色あせ補正・傷除去｜AIで高画質化・カラー化 - picedit',
      description:
        '色あせ・黄ばみを補正し、傷や折れ跡を自動検出して除去。AIによる高解像度化・白黒写真のカラー化・顔の復元にも対応。元の写真への忠実度を調整できます。',
      h1: '古い写真の修復・色あせ補正',
    },
    privacy: {
      title: 'プライバシーポリシー - picedit',
      description: 'picedit における画像データ・アクセス解析・広告・アフィリエイトの取り扱いについて。',
      h1: 'プライバシーポリシー',
    },
  },
  nav: {
    modes: '機能',
    ec: '商品写真',
    realestate: '不動産・室内',
    restore: '古い写真の修復',
    language: '言語',
    skipToContent: 'メインコンテンツへ移動',
    home: 'picedit トップへ',
  },
  leads: {
    ec: '背景除去・白背景・モール規定サイズで書き出し',
    realestate: 'ゆがみ補正・HDR合成・窓の白飛び抑制',
    restore: '色あせ補正・傷除去・AI高解像度化',
  },
  common: {
    download: 'この状態をダウンロード',
    undo: '元に戻す',
    redo: 'やり直す',
    history: '編集履歴',
    before: '修正前',
    after: '修正後',
    comparePosition: '比較位置',
    progress: '進捗',
    dismissError: 'エラーを閉じる',
    cancel: 'キャンセル',
    shortcuts: 'Ctrl+Z で元に戻す／Ctrl+Shift+Z でやり直す',
    tools: '操作パネル',
    adLabel: 'スポンサーリンク',
  },
  uploader: {
    hint: 'ドラッグ＆ドロップ、またはクリックして選択（JPEG / PNG / WebP / HEIC、20MBまで）',
    converting: '画像を変換中…',
    dropAnywhere: 'ここにドロップして追加',
  },
  steps: {
    original: '元画像',
    autoVertical: '自動垂直補正',
    manualPerspective: '手動4点補正',
    finish: '明るさ・色の仕上げ',
    hdr: (count: number) => `HDR合成（${count}枚）`,
    fade: '色あせ補正',
    inpaint: '傷・折れ跡の除去',
    upscale: '高解像度化',
    colorize: 'カラー化',
    faceRestore: '顔の復元',
  },
  ec: {
    upload: '商品写真を追加（複数可）',
    empty: '商品写真をアップロードすると、背景除去から書き出しまで自動で行います。',
    listLabel: '商品写真',
    status: { pending: '待機中', segmenting: '背景除去中', ready: '完了', error: 'エラー' },
    remove: (name: string) => `${name} を削除`,
    retryFailed: '失敗した写真を再処理',
    busySegmenting: '背景を除去しています（初回はAIモデルの読み込みに時間がかかります）',
    busyExporting: '書き出し中',
    editMask: 'マスクを修正',
    backToPreview: 'プレビューに戻る',
    exportOne: 'この写真を書き出し',
    exportAll: (count: number) => `すべてZIPで書き出し（${count}枚）`,
    maskErase: '消す（背景にする）',
    maskRestore: '戻す（商品にする）',
    previewAlt: '書き出しプレビュー',
    fallbackNotice:
      'この環境ではAI背景除去（WebGPUが必要）を使えないため、簡易モード（単色背景向け）で処理しました。仕上がりはマスク修正で調整してください。',
    options: {
      label: '書き出し設定',
      destination: '出品先',
      background: '背景色',
      backgroundLocked: '背景色（規定により白固定）',
      size: (percent: number) => `商品の大きさ ${percent}%`,
      sizeLabel: '商品の大きさ',
      shadow: '接地影をつける',
    },
  },
  presets: {
    amazon: {
      label: 'Amazon（メイン画像）',
      notes:
        '背景は純白(255,255,255)必須。商品が画像の85%以上を占めること。長辺1000px以上でズーム可、1600px以上推奨。文字・ロゴ・枠線は不可。',
    },
    rakuten: {
      label: '楽天市場（第1商品画像）',
      notes: 'テキスト占有率20%以内・枠線禁止。背景は白背景／写真背景のみ。',
    },
    yahoo: {
      label: 'Yahoo!ショッピング',
      notes: '正方形・白背景が無難。ストアの最新ガイドラインを確認してください。',
    },
    mercari: {
      label: 'メルカリ',
      notes: '正方形で表示される。1080×1080pxまで高画質で投稿可能。',
    },
  },
  realestate: {
    tabSingle: '1枚から仕上げ',
    tabHdr: 'HDR合成',
    upload: '室内写真をアップロード',
    uploadHdr: '露出ブラケット写真（2〜5枚）',
    correction: 'ゆがみ補正',
    autoVertical: '自動垂直補正',
    manual: '手動4点補正',
    tone: '明るさ・色',
    whiteBalance: '色かぶり補正',
    highlight: (percent: number) => `窓の白飛び抑制 ${percent}%`,
    clahe: '暗部を明るく（局所コントラスト）',
    applyFinish: '仕上げを適用',
    busyHdr: 'HDR合成中',
    empty:
      '室内写真をアップロードしてください。露出違いの写真があれば「HDR合成」タブで窓の白飛びを抑えられます。',
  },
  restore: {
    upload: '古い写真をアップロード',
    basics: '基本修復',
    fadeHeading: '色あせ・黄ばみ',
    fade: '色あせを補正',
    scratchHeading: '傷・折れ跡',
    sensitivity: (percent: number) => `検出の感度 ${percent}%`,
    detect: '傷を検出',
    busyDetect: '傷を検出中',
    inpaint: 'マークした傷を除去',
    maskHint: '赤い部分が除去されます。ブラシで傷を追加したり、残したい部分を除外したりできます。',
    maskAdd: '傷として追加',
    maskExclude: '除外する',
    empty:
      '色あせ・傷のある写真をアップロードしてください。スキャン画像やスマホで撮影した写真でも使えます。',
  },
  ai: {
    heading: 'AI修復',
    off: 'AI機能は現在オフです（サーバーに API トークンが設定されていません）。',
    strength: (percent: number) => `AIの効き具合 ${percent}%`,
    strengthLabel: 'AIの効き具合',
    strengthHelp: '低いほど元の写真に忠実です。顔が別人のように見える場合は下げてください。',
    upscaleHelp: '2倍に拡大して細部を補います',
    colorizeHelp: '白黒写真に自然な色を付けます',
    faceRestoreHelp: '顔の部分だけを鮮明にします',
  },
  pointPicker: {
    corners: ['左上', '右上', '右下', '左下'],
    instruction: (corner: string, done: number) => `「${corner}」の角をクリックしてください（${done}/4）`,
    done: '4点を指定しました。',
    alt: '補正範囲の指定',
    reset: 'やり直す',
    confirm: 'この4点で補正',
  },
  maskBrush: {
    size: (px: number) => `ブラシ ${px}px`,
  },
  errors: {
    generic: '処理に失敗しました。時間をおいて再度お試しください。',
    network: 'サーバーに接続できません。ネットワークを確認してください。',
    http: (status: number) => `処理に失敗しました（${status}）。時間をおいて再度お試しください。`,
    file_empty: 'ファイルが空です。',
    file_too_large: (p: { limit_mb?: number }) => `ファイルが大きすぎます（上限 ${p.limit_mb ?? 20}MB）。`,
    unsupported_type: '対応していないファイル形式です。JPEG / PNG / WebP / HEIC を使用してください。',
    param_range: '設定値が範囲外です。',
    resolution_too_large: '画像の解像度が大きすぎます（1辺8000pxまで）。',
    unreadable_image: '画像を読み込めませんでした。ファイルが壊れていないか確認してください。',
    points_invalid: '補正点は4点（左上・右上・右下・左下）を指定してください。',
    area_too_small: '補正範囲が小さすぎます。4点を広げて指定してください。',
    hdr_count: (p: { min?: number; max?: number }) =>
      `HDR合成には露出の異なる写真を ${p.min ?? 2}〜${p.max ?? 5} 枚指定してください。`,
    mask_size_mismatch: 'マスクのサイズが画像と一致しません。',
    ai_unavailable: 'AI機能は現在利用できません。',
    ai_failed: 'AI処理に失敗しました。別の画像でお試しください。',
    ai_network: 'AI処理サービスとの通信に失敗しました。',
    ai_timeout: 'AI処理に時間がかかりすぎています。時間をおいて再度お試しください。',
    ai_no_result: 'AI処理の結果を取得できませんでした。',
    invalid_request: 'リクエストの形式が正しくありません。',
    internal_error: '処理中にエラーが発生しました。時間をおいて再度お試しください。',
    too_many_files: (p: { max?: number }) => `一度に選べるのは ${p.max ?? 1} 枚までです。`,
    bad_file_type: (p: { name?: string }) =>
      `「${p.name ?? ''}」は対応していない形式です（JPEG / PNG / WebP / HEIC）。`,
    bad_file_size: (p: { name?: string }) => `「${p.name ?? ''}」が大きすぎます（上限 20MB）。`,
    convert_failed: '画像の変換に失敗しました。',
    no_verticals: '補正が必要な縦線が見つかりませんでした。必要なら「手動4点補正」をお使いください。',
    canvas_unsupported: 'このブラウザは Canvas に対応していません。',
    no_product: '商品が検出できませんでした。マスクを調整してください。',
    export_failed: '画像の書き出しに失敗しました。',
    segmentation_failed: '背景除去に失敗しました。',
    not_segmented: '背景除去が完了していません。',
    detect_failed: '傷の検出に失敗しました。',
  },
  guide: {
    relatedTitle: "関連する画像ツール",
    officialTitle: "公式ガイド・技術資料",
    references: {
      amazon: "Amazonセラーセントラル：商品画像の要件",
      rakuten: "楽天市場：商品画像登録ガイドライン（日本語PDF）",
      transformers: "Hugging Face Transformers.js 公式ドキュメント",
      canvas: "MDN：Canvas 2D API",
      replicate: "Replicate 公式APIドキュメント",
    },
    howTo: '使い方',
    faq: 'よくある質問',
    ec: {
      steps: [
        '商品写真をアップロードします（複数枚まとめてOK）。',
        '背景が自動で消え、白背景の上に商品が配置されます。',
        '出品先（Amazon・楽天・Yahoo!・メルカリ）を選ぶと、規定サイズ・余白に自動調整されます。',
        '「この写真を書き出し」または「すべてZIPで書き出し」で保存します。',
      ],
      faq: [
        {
          q: 'アップロードした写真はサーバーに送信されますか？',
          a: '商品写真の背景除去はお使いのブラウザ内で行われ、画像はサーバーに送信されません。',
        },
        {
          q: 'Amazon のメイン画像の規定に対応していますか？',
          a: '純白（RGB 255,255,255）の背景、商品が画像の85%以上、長辺2000pxで書き出します。文字やロゴは追加しません。',
        },
        {
          q: '背景がうまく消えない部分はどうすればいいですか？',
          a: '「マスクを修正」でブラシを使い、消したい部分・残したい部分をなぞって調整できます。',
        },
        {
          q: '料金はかかりますか？',
          a: '現在は無料・登録不要でご利用いただけます。',
        },
      ],
    },
    realestate: {
      steps: [
        '室内写真をアップロードします。露出違いの写真があれば「HDR合成」タブで2〜5枚をまとめて選びます。',
        '「自動垂直補正」で柱やドア枠の傾きをまっすぐにします。うまくいかない場合は「手動4点補正」を使います。',
        '色かぶり補正・窓の白飛び抑制・暗部の明るさを調整して「仕上げを適用」を押します。',
        '修正前後を比較し、「この状態をダウンロード」で保存します。',
      ],
      faq: [
        {
          q: 'HDR合成にはどんな写真が必要ですか？',
          a: '三脚などで同じ構図のまま、暗め・標準・明るめなど露出を変えて撮った2〜5枚の写真です。多少の手ぶれは自動で位置合わせします。',
        },
        {
          q: '垂直補正とは何ですか？',
          a: 'カメラを上下に傾けて撮ると、柱や壁の縦線が斜めに写ります。縦線を検出して、まっすぐに見えるよう射影変換で補正します。',
        },
        {
          q: 'スマホで撮った写真にも使えますか？',
          a: 'はい。JPEG・PNG・WebP・HEIC（iPhone）に対応しています。',
        },
        {
          q: '画像は保存されますか？',
          a: 'サーバーでの処理後すぐに破棄され、保存や学習には使われません。',
        },
      ],
    },
    restore: {
      steps: [
        '古い写真をスキャン、またはスマホで撮影してアップロードします。',
        '「色あせを補正」で黄ばみや退色を自動で整えます。',
        '「傷を検出」で傷・折れ跡をマークし、ブラシで調整してから「マークした傷を除去」を押します。',
        'AI修復（高解像度化・カラー化・顔の復元）は効き具合を調整して適用できます。',
      ],
      faq: [
        {
          q: '顔が別人のようになりませんか？',
          a: '「AIの効き具合」で元の写真との混ぜ具合を調整できます。顔の復元は顔の部分だけに適用し、境界は自然になじませます。',
        },
        {
          q: '白黒写真をカラーにできますか？',
          a: 'AIのカラー化で自然な色を付けられます（AI機能が有効な場合）。',
        },
        {
          q: 'どのくらいの傷まで消せますか？',
          a: '細い線状の傷や折れ跡に向いています。大きな欠けは周囲から補うため、仕上がりを確認しながらお使いください。',
        },
        {
          q: '他人が写っている写真を修復してもいいですか？',
          a: 'ご自身や家族の写真など、権利を持つ写真でお使いください。他人が権利を持つ写真は許可を得てください。',
        },
      ],
    },
  },
  gear: {
    heading: 'あわせて使いたいおすすめ機材',
    adLabel: 'PR',
    note: 'リンク先は Amazon.co.jp・楽天市場の検索結果です。',
    amazon: 'Amazonで見る',
    rakuten: '楽天で見る',
    rakutenTop: '楽天市場トップへ',
    items: {
      lightbox: { name: '撮影ボックス（LED付き）', reason: '影の少ない均一な光で、背景除去の精度が上がります。' },
      backdrop: { name: '撮影用背景シート（白）', reason: '単色背景なら自動切り抜きがきれいに仕上がります。' },
      ledLight: { name: '撮影用LEDライト', reason: '色かぶりを防ぎ、商品本来の色で撮影できます。' },
      phoneTripod: { name: 'スマホ用三脚', reason: '手ぶれを防ぎ、複数商品を同じ構図で撮れます。' },
      wideLens: { name: 'スマホ用広角レンズ', reason: '狭い部屋でも広く見せる物件写真が撮れます。' },
      tripod: { name: 'カメラ三脚', reason: 'HDR用の露出違い写真を同じ構図で撮影できます。' },
      levelBubble: { name: 'カメラ用水準器', reason: '撮影時に水平・垂直を合わせ、ゆがみを減らせます。' },
      photoScanner: { name: 'フォトスキャナー', reason: 'アルバムの写真を高解像度でデジタル化できます。' },
      filmScanner: { name: 'フィルムスキャナー', reason: 'ネガやポジフィルムを直接デジタル化できます。' },
      albumSleeve: { name: '写真保存用アルバム（中性紙）', reason: '修復前の原本を色あせから守ります。' },
      photoPrinter: { name: 'フォトプリンター', reason: '修復した写真をきれいにプリントして贈れます。' },
    },
  },
  footer: {
    sistersTitle: "関連サービス",
    sisterLinks: {
      webtool: "無料のWebツール",
      seo: "SEOチェッカー",
      aiTools: "AIツールデータベース",
      movie: "動画編集ツール",
      pdf: "PDF編集ツール",
    },
    privacyNote:
      '商品写真の背景除去はお使いのブラウザ内で行われます。サーバーで処理する画像は処理後すぐに破棄され、保存や AI の学習には使われません。他人が権利を持つ写真を加工する場合は、権利者の許可を得てください。',
    amazonDisclosure: 'Amazonのアソシエイトとして、picedit は適格販売により収入を得ています。',
    adDisclosure: '当サイトは広告（Google AdSense）およびアフィリエイトプログラムを利用しています。',
    privacyLink: 'プライバシーポリシー',
  },
  privacy: {
    updated: '最終更新日：2026年9月27日',
    sections: [
      {
        h: '画像データの取り扱い',
        body: '商品写真の背景除去はお使いのブラウザ内で処理され、サーバーには送信されません。不動産写真・古い写真の修復でサーバーに送信された画像はメモリ上で処理し、処理後すぐに破棄します。保存したり、AI の学習に利用したりすることはありません。AI 修復機能を使った場合に限り、画像は処理のため外部の推論サービス（Replicate）に送信されます。',
      },
      {
        h: 'アクセス解析',
        body: '当サイトは Google アナリティクスを利用しています。Cookie を使用して匿名のトラフィックデータを収集しますが、個人を特定する情報は含みません。ブラウザの設定で Cookie を無効にすることで収集を拒否できます。',
      },
      {
        h: '広告の配信',
        body: '当サイトは第三者配信の広告サービス Google AdSense を利用しています。広告配信事業者は、ユーザーの興味に応じた広告を表示するために Cookie を使用することがあります。パーソナライズ広告は Google の広告設定（https://adssettings.google.com）で無効にできます。',
      },
      {
        h: 'アフィリエイトプログラム',
        body: '当サイトは Amazon.co.jp を宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazon アソシエイト・プログラムの参加者です。また、楽天アフィリエイトを利用しています。',
      },
      {
        h: '免責事項',
        body: '当サイトの加工結果の正確性・完全性は保証しません。各モールの画像規定は変更されることがあるため、出品前に最新のガイドラインをご確認ください。',
      },
    ],
  },
  notFound: {
    title: 'ページが見つかりません',
    back: 'トップページへ戻る',
  },
}

export type Messages = typeof ja
