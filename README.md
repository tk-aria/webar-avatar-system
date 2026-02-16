# WebAR Avatar System

WebARを使用して美少女アバターを召喚し、会話できるシステム。

## 機能

- **Phase 1 (実装済み)**
  - WebAR/WebXRによるアバター表示
  - VRMモデルの読み込みと表示
  - 召喚時の手振りアニメーション
  - テキストチャットによる会話（OpenClaw API連携）
  - モバイルブラウザ対応

- **Phase 2 (予定)**
  - WebGPU対応
  - 音声入力/出力
  - PC最適化

## セットアップ

### 環境変数

```bash
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

| 変数 | 説明 |
|------|------|
| OPENCLAW_API_URL | OpenClaw APIのエンドポイント |
| OPENCLAW_API_KEY | APIキー |
| OPENCLAW_MODEL | 使用するモデル名 |
| CHARACTER_NAME | キャラクター名 |
| CHARACTER_SYSTEM_PROMPT | システムプロンプト |

### 開発

```bash
npm install
npm run dev      # フロントエンド開発サーバー
npm run server   # バックエンドサーバー
```

### Docker

```bash
docker build -t webar-avatar .
docker run -p 3000:3000 \
  -e OPENCLAW_API_KEY=your-key \
  -e OPENCLAW_API_URL=https://api.example.com/v1/chat/completions \
  webar-avatar
```

## 使用技術

- Three.js + @pixiv/three-vrm
- WebXR Device API
- Express.js
- Vite

## ライセンス

MIT
