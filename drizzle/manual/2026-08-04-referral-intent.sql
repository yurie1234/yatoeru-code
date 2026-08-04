-- 送客優先度（紹介料の意向）を support_orgs に追加する。
--
-- 完全非公開の運用情報。公開ページ・API・構造化データには一切出力しない
-- （公開レスポンスは server/routers/orgs.ts の sanitizeOrg で除去する）。
-- 親和性スコアと並び順にも一切影響させない：紹介料で順位が動くならそれは広告であり、
-- ラベルなしで検索結果に混ぜると景品表示法（ステマ規制）に触れる。
-- 表示・順位に反映する場合は必ずPR表示を伴う別枠として実装すること。
--
-- 適用手順（Railwayのairy-prosperityサービス「Console」タブ）:
--   node scripts/apply-referral-intent-columns.mjs
--
-- コンテナに mysql クライアントは入っていないため、このSQLファイルを直接流し込む
-- （mysql "$DATABASE_URL" < ...）ことはできない。上のスクリプトが mysql2 経由で
-- 同じ内容を冪等に適用する。このファイルは適用内容の記録として残す。
--
-- 【2026-08-04 追記】このファイルは適用の記録として残すだけになった。
-- 列は drizzle/schema.ts の supportOrgs に取り込み済みで、正本のマイグレーションは
-- drizzle/0010_solid_war_machine.sql（内容は下のALTERと同じ・COMMENTは付かない）。
-- 新しい環境では通常のマイグレーションで作られるので、このSQLを流す必要はない。
--
-- 本番DBは旧環境のダンプ復元で作ったため __drizzle_migrations が無く、
-- そのままでは drizzle-kit migrate が0000から失敗する。一度だけ
--   node scripts/baseline-drizzle-migrations.mjs --apply
-- を実行して既存スキーマをベースラインとして記録すれば、以降は差分だけが流れる。
--
-- （当初この列をマイグレーションに載せなかったのは、列の追加より先にコードが
--   デプロイされると公開クエリが「Unknown column」で落ちてサイト全体が停止する
--   ためだった。列の適用が済んだので通常管理へ戻した。）

ALTER TABLE `support_orgs`
  ADD COLUMN `referralIntent` ENUM('unknown','interested','negotiating','agreed','declined')
    NOT NULL DEFAULT 'unknown'
    COMMENT '紹介料の意向（非公開）: unknown=未確認 / interested=意向あり・金額未定 / negotiating=条件交渉中 / agreed=条件合意 / declined=意向なし',
  ADD COLUMN `referralNote` TEXT NULL
    COMMENT '紹介料に関する非公開メモ（提示条件・担当者の反応・次アクション）',
  ADD COLUMN `referralUpdatedAt` TIMESTAMP NULL
    COMMENT '紹介料の意向を最後に更新した日時（非公開）';

CREATE INDEX `idx_support_orgs_referral_intent` ON `support_orgs` (`referralIntent`);
