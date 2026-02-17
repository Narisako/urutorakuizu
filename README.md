# 🦌 岩手クイズバトル

講演会・イベント向け「スマホ参加型・早押し4択クイズ」Webアプリ。
参加者はQRコードからスマホでアクセス、会場スクリーン（PCブラウザ）に同じ問題が投影されます。

## 🎯 特徴

- **スマホ参加型**: QRコードで即参加、アプリインストール不要
- **早押しクイズ**: サーバ受信時刻で最速正解者を確定
- **AI自動生成**: Anthropic Claude で岩手県ローカルクイズを自動生成
- **フォールバック**: LLM失敗時は内蔵20問から出題（API key不要でも動作）
- **100名同時接続**: Socket.IOによるリアルタイム通信
- **勝者演出**: 最速正解者のスマホが赤く点滅、スクリーンに勝者名を大表示

## 📋 画面構成

| パス | 用途 |
|------|------|
| `/play` | 参加者用（スマホ） |
| `/screen` | 投影用（PCブラウザ） |

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- npm 9+

### インストール & 起動

```bash
git clone https://github.com/Narisako/urutorakuizu.git
cd urutorakuizu
npm install
cp .env.example .env.local
# .env.local を編集して LLM_API_KEY を設定（任意）
npm run dev
```

ブラウザで以下にアクセス:
- スクリーン: http://localhost:8000/screen
- プレイヤー: http://localhost:8000/play

### 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `LLM_PROVIDER` | LLMプロバイダ | `anthropic` |
| `LLM_API_KEY` | APIキー（未設定時はフォールバック使用） | - |
| `LLM_MODEL` | モデル名 | `claude-sonnet-4-20250514` |
| `PORT` | サーバーポート | `8000` |
| `PUBLIC_URL` | 公開URL（QRコード生成用） | `http://localhost:8000` |

## 🏗️ アーキテクチャ

```
┌──────────────┐    Socket.IO     ┌──────────────┐
│  /screen     │◄────────────────►│              │
│  (投影用PC)   │                  │   Node.js    │
└──────────────┘                  │   Server     │
                                  │              │
┌──────────────┐    Socket.IO     │  Socket.IO   │
│  /play       │◄────────────────►│  + Next.js   │
│  (スマホ×100) │                  │              │
└──────────────┘                  │  Quiz Queue  │──► Anthropic API
                                  │  (3問バッファ) │     (フォールバック内蔵)
                                  └──────────────┘
```

### Socket.IO イベント

| イベント | 方向 | 説明 |
|---------|------|------|
| `join` | C→S | 参加（token付きで再接続復元） |
| `joined` | S→C | 参加確定（token + 動物名） |
| `state` | S→C | 現在のラウンド状態 |
| `answer` | C→S | 回答送信 |
| `winner` | S→C | 勝者確定通知 |
| `answer_count` | S→C | 回答数リアルタイム更新 |
| `next_question` | C→S | 次の問題リクエスト |

### 状態モデル

各ラウンドは `waiting` → `active` → `revealed` のフェーズ遷移。
勝者判定はサーバ受信時刻のみで確定（クライアント時刻不使用）。

### クイズ生成キュー

1. サーバ起動時に3問を事前生成
2. 出題ごとにキューから取り出し、バックグラウンドで補充
3. LLM失敗時はフォールバック問題（20問内蔵）を使用
4. 常に2〜3問の在庫を維持

## 🚢 デプロイ

### Render.com（推奨）

1. GitHubリポジトリを接続
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Environment Variables に `LLM_API_KEY` 等を設定

### Fly.io

```bash
fly launch
fly secrets set LLM_API_KEY=sk-ant-...
fly deploy
```

## 📝 講演当日の手順

1. サーバーを起動
2. `/screen` をプロジェクターに投影
3. QRコードを参加者に案内
4. 「クイズスタート！」ボタンまたはスペースキーで開始
5. 参加者がスマホで回答→最速正解者のスマホが赤く点滅
6. 「次の問題 ▶」で進行

## ライセンス

MIT
