# みやした音楽OS - デプロイガイド

このドキュメントは、フロントエンド(Vercel)およびバックエンド(Render)への本番デプロイに関する設定と運用時の注意点をまとめたものです。

## 1. フロントエンド (Vercel)

Viteを用いたReactアプリケーションのデプロイ設定です。

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **ルーティング設定**: プロジェクトルートの `vercel.json` にて、SPAのルーティング（リロード時の404回避）のためのリライト設定が済んでいます。

## 2. バックエンド (Render)

Renderの「Web Service」としてのデプロイ設定です。無料枠（RAM 512MB）で安定稼働させるための設定項目を以下に示します。

- **Environment**: `Python 3`
- **Root Directory**: `backend` （このディレクトリを指定してください）
- **Build Command**: 
  \`\`\`bash
  pip install -r requirements.txt
  \`\`\`
- **Start Command**:
  \`\`\`bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  \`\`\`

### ⚠️ Renderに関する注意事項（無料枠の仕様と対策）

1. **コールドスタートと待機時間のカバー**
   無料枠では一定時間アクセスがないとサーバーがスリープします。このプロジェクトでは、以下の2段構えの対策を実装済みです。
   - `App.jsx` での **Wake-up Ping**: アプリ起動時にバックエンドの `/ping` を叩き、ユーザーが操作する前にスリープを解除します。
   - `LoadingOverlay.jsx`: 実際の解析リクエスト時には、バックエンドの立ち上がり＋重い解析処理の待機時間を「エモいテキストのアニメーション」でカバーし、体感時間を短縮します。
2. **タイムアウトとOOM（Out Of Memory）**
   `tslearn` や `scipy` を用いたDTWアライメントなどの処理はメモリを多く消費します。処理が重すぎてOOMが発生する場合は、入力をダウンサンプリングするか、有料プランの検討が必要です。
