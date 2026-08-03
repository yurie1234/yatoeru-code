# Railway移行 セットアップ手順（2026-08-03）

task #37。Railwayはこのサンドボックスからアカウント操作（プロジェクト作成・
プラグイン追加・トークン発行）ができないため、以下はユーザー側で実施が必要な
手順。コード側（railway.json・.env.example・PORT対応）は準備済み。

## 前提（コード側で確認済み）
- `server.listen(process.env.PORT)` 対応済み（server/_core/index.ts）→Railwayが
  注入するPORTでそのまま起動する
- `pnpm build` / `pnpm start` が本番起動コマンドとして機能する（railway.json参照）
- DBはMySQL方言（drizzle.config.ts dialect: "mysql"）→Railwayの「MySQL」プラグイン
  で作成すること（Postgresプラグインは不可）
- packageManagerがpnpm@10.4.1に固定済み→Nixpacksが自動検出する

## 手順
1. https://railway.app でプロジェクトを新規作成し、GitHubリポジトリ
   `yurie1234/yatoeru-code`（branch: main）を接続してデプロイソースにする
2. 同プロジェクトに **MySQLプラグイン** を追加する（Add Plugin → MySQL）
3. MySQLプラグインが発行した接続用変数（`DATABASE_URL` または
   `MYSQL_URL`。名称はRailwayのUIで確認）を、アプリ側サービスの環境変数
   `DATABASE_URL` にコピーする（Railwayの「Variable Reference」機能で
   `${{MySQL.DATABASE_URL}}` のように参照設定すると自動追従する）
4. アプリ側サービスに .env.example の残り変数を設定する:
   - `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`
   - `ADMIN_PASSWORD`（本番用の新しい値。開発中に使った `test1234` は使い回さない）
   - `JWT_SECRET`（`openssl rand -hex 32` 等で新規生成。開発中の値を再利用しない）
   - `CRON_SECRET`（同上、新規生成）
   - `NODE_ENV=production`
5. デプロイ完了後、`DATABASE_URL`（実際に発行された接続文字列）をこちらに
   共有する。それを受けて次を実施する（task #33）:
   - `pnpm run db:push` でスキーマをマイグレーション
   - 受領済みDBダンプ（CSV 14テーブル）を新DBへインポート
6. 動作確認（task #38）は#33完了後に実施。DNS切替はユーザーの明示確認を
   得てから実施する（無断で切り替えない）

## 触っていないもの（意図的にスコープ外）
- `registerStorageProxy` / `AWS S3`関連（Forge storage依存、既存調査で
  未使用と確認済み。ホスティング移行では影響しないため今回は削除しない）
- `client/src/components/Map.tsx` の `VITE_FRONTEND_FORGE_API_*`（同上、死んだ
  依存として既に把握済み。Railwayの環境変数には設定不要）
