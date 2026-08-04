/**
 * 送客優先度（紹介料の意向）の列を support_orgs に追加する。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する想定
 * （DATABASE_URLがそのコンテナ内に既に設定されているため）。
 * コンテナには mysql クライアントが入っていないため、SQLファイルを流し込む代わりに
 * mysql2（アプリの依存に含まれる）で適用する。
 *
 * 実行: node scripts/apply-referral-intent-columns.mjs
 *
 * 何度実行しても安全（既にある列・インデックスは飛ばす）。
 *
 * 追加する列は完全非公開の運用情報。公開ページ・API・構造化データには一切出力せず、
 * 親和性スコアと並び順にも影響させない（紹介料で順位が動くならそれは広告であり、
 * ラベルなしで検索結果に混ぜると景品表示法のステマ規制に触れる）。
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const COLUMNS = [
  {
    name: "referralIntent",
    ddl: `ADD COLUMN \`referralIntent\` ENUM('unknown','interested','negotiating','agreed','declined')
            NOT NULL DEFAULT 'unknown'
            COMMENT '紹介料の意向（非公開）: unknown=未確認 / interested=意向あり・金額未定 / negotiating=条件交渉中 / agreed=条件合意 / declined=意向なし'`,
  },
  {
    name: "referralNote",
    ddl: `ADD COLUMN \`referralNote\` TEXT NULL
            COMMENT '紹介料に関する非公開メモ（提示条件・担当者の反応・次アクション）'`,
  },
  {
    name: "referralUpdatedAt",
    ddl: `ADD COLUMN \`referralUpdatedAt\` TIMESTAMP NULL
            COMMENT '紹介料の意向を最後に更新した日時（非公開）'`,
  },
];

const INDEX_NAME = "idx_support_orgs_referral_intent";

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const [existing] = await conn.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'support_orgs'
        AND column_name IN ('referralIntent','referralNote','referralUpdatedAt')`
  );
  // MySQLのバージョンによって列名の大文字小文字が異なるため両方見る
  const have = new Set(existing.map((r) => String(r.column_name ?? r.COLUMN_NAME)));
  console.log("既にある列:", have.size ? [...have].join(", ") : "なし");

  const toAdd = COLUMNS.filter((c) => !have.has(c.name));
  if (toAdd.length === 0) {
    console.log("→ 列はすべて追加済みです（変更なし）");
  } else {
    const sql = `ALTER TABLE \`support_orgs\`\n  ${toAdd.map((c) => c.ddl).join(",\n  ")}`;
    console.log("\n実行するSQL:\n" + sql + "\n");
    await conn.query(sql);
    console.log(`→ ${toAdd.map((c) => c.name).join(", ")} を追加しました`);
  }

  const [idx] = await conn.query(
    `SELECT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'support_orgs' AND index_name = ?`,
    [INDEX_NAME]
  );
  if (idx.length > 0) {
    console.log("→ インデックスは既に存在します（変更なし）");
  } else {
    await conn.query(
      `CREATE INDEX \`${INDEX_NAME}\` ON \`support_orgs\` (\`referralIntent\`)`
    );
    console.log(`→ インデックス ${INDEX_NAME} を作成しました`);
  }

  console.log("\n=== 適用後の確認 ===");
  const [after] = await conn.query(
    `SELECT column_name, column_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'support_orgs'
        AND column_name IN ('referralIntent','referralNote','referralUpdatedAt')
      ORDER BY ordinal_position`
  );
  console.log(JSON.stringify(after, null, 1));

  const [counts] = await conn.query(
    `SELECT referralIntent, COUNT(*) AS c FROM support_orgs GROUP BY referralIntent`
  );
  console.log("\n意向区分ごとの件数:", JSON.stringify(counts));

  await conn.end();
  console.log("\n完了。管理画面（/admin →「掲載確認の反映」タブ）で送客優先度が保存できます。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
