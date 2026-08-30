# Knowledge Graph XR - Babylon.js WebXR 可視化

- Neo4jから取得した結果をBabylon.jsで可視化. Neo4jへの事前登録が必要  


## セットアップ

### 1. 依存関係のインストール

```bash
cd Frontend
npm install
```

### 2. Neo4jデータベース起動

- Neo4jが`localhost:7687`で起動していることを確認  
- 認証情報は`neo4j.ts`に設定   

### 3. APIサーバー起動 (ターミナル1)

```bash
cd <プロジェクトのディレクトリ>/Frontend
npx tsx server.ts
```

`http://localhost:3000`で起動 (ブラウザアクセスは不要)  

### 4. Vite開発サーバー起動 (ターミナル2)

```bash
cd <プロジェクトのディレクトリ>/Frontend
npm run dev
```

`http://localhost:8080`で起動 (ブラウザアクセスが必要)  

## 使用方法

### デスクトップブラウザ

1. マウスドラッグでカメラを回転
2. マウスホイールでズーム
3. ノードをクリックして選択
4. 選択したノードの関係性が自動表示されます  

"Story Mode"にチェックをつけてからApplyすると、その年ごとに関係が強いノードを時系列で繋いで表示  

### Meta Quest 3（WebXR）

1. Quest 3ブラウザでURLにアクセス
2. "Enter VR"ボタンをクリック
3. コントローラーのレイでノードを選択
4. トリガーボタンで決定
5. サムスティックでテレポート移動

## プロジェクト構造

```
Frontend/
├── index.html                       # エントリーポイント
├── vite.config.ts                   # Vite設定
├── package.json                     # 依存関係
├── server.ts                        # Express APIサーバー
├── neo4j.ts                         # Neo4j接続
├── graph.ts                         # 年次グラフAPI
├── keyword.ts                       # キーワード関係性API
├── timeline.ts                      # タイムラインAPI
└── src/
    ├── main.ts                      # メインアプリケーション
    ├── scene/
    │   ├── SceneManager.ts          # Babylon.jsシーン管理
    │   └── XRManager.ts             # WebXR管理
    ├── api/
    │   └── GraphAPI.ts              # REST APIクライアント
    ├── models/
    │   └── TimelineData.ts          # データモデル
    ├── visualization/
    │   ├── TimelineLayout.ts        # レイアウト計算
    │   ├── NodeRenderer.ts          # ノード描画
    │   ├── TimelineConnector.ts     # 接続線描画（最重要）
    │   └── RelationshipRenderer.ts  # 関係性描画
    ├── ui/
    │   └── NodeLabel.ts             # UIラベル
    ├── interaction/
    │   └── SelectionManager.ts      # 選択管理
    └── effects/
        └── ParticleEffects.ts       # パーティクルエフェクト
```

## APIエンドポイント

- `GET /api/timeline` - 全年次のキーワードスコア
- `GET /api/keyword/:keyword` - キーワードの関係性
- `GET /api/graph/:year` - 特定年のグラフ

## ビルド

本番用ビルド:

```bash
npm run build
```

ビルド成果物は`dist/`ディレクトリに出力されます。

## トラブルシューティング

### Neo4j接続エラー

`neo4j.ts`の接続情報を確認してください：

```typescript
export const driver = neo4j.driver(
  "neo4j://localhost:7687",
  neo4j.auth.basic("neo4j", "YOUR_PASSWORD")
);
```

### WebXRが動作しない

- HTTPSまたはlocalhostでアクセスしていることを確認
- ブラウザがWebXRに対応しているか確認
- Quest 3の場合、実験的機能が有効になっているか確認

### パフォーマンスが遅い

- ノード数が多い場合、`TimelineLayout.ts`のレイアウトアルゴリズムを調整
- `SceneManager.ts`のグロー効果やフォグを無効化

