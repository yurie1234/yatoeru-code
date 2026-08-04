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
-- drizzle-kitのマイグレーションに載せていないのは、列の追加より先にコードが
-- デプロイされると公開クエリが「Unknown column」で落ちてサイト全体が停止するため。
-- 適用後に drizzle/schema.ts へ取り込み、通常のマイグレーション管理に戻す。

ALTER TABLE `support_orgs`
  ADD COLUMN `referralIntent` ENUM('unknown','interested','negotiating','agreed','declined')
    NOT NULL DEFAULT 'unknown'
    COMMENT '紹介料の意向（非公開）: unknown=未確認 / interested=意向あり・金額未定 / negotiating=条件交渉中 / agreed=条件合意 / declined=意向なし',
  ADD COLUMN `referralNote` TEXT NULL
    COMMENT '紹介料に関する非公開メモ（提示条件・担当者の反応・次アクション）',
  ADD COLUMN `referralUpdatedAt` TIMESTAMP NULL
    COMMENT '紹介料の意向を最後に更新した日時（非公開）';

CREATE INDEX `idx_support_orgs_referral_intent` ON `support_orgs` (`referralIntent`);
