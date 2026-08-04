/**
 * 2026-08-03に受領した2団体の返信内容をDBに反映する。
 * Railwayのairy-prosperityサービス「Console」タブで実行する想定
 * （DATABASE_URLがそのコンテナ内に既に設定されているため）。
 *
 * 実行: node apply-reply-updates.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  console.log("=== トリニティウイング協同組合 (support_orgs id=37685) 反映前 ===");
  const [before1] = await conn.query(
    "SELECT id, regNo, name, prefecture, address, phone, preferredFields, preferredRegions, consultStatus, isVerified, verifiedAt, verifiedNote FROM support_orgs WHERE id = 37685"
  );
  console.log(JSON.stringify(before1, null, 1));

  if (before1.length > 0) {
    await conn.query(
      `UPDATE support_orgs SET
        preferredFields = ?,
        preferredRegions = ?,
        consultStatus = 'open',
        isVerified = true,
        verifiedAt = ?,
        verifiedNote = ?
      WHERE id = 37685`,
      [
        JSON.stringify(["介護", "病院福祉施設給食製造", "ビルクリーニング", "外食", "リネンサプライ", "グランドハンドリング"]),
        JSON.stringify(["中四国", "東京都", "愛知県", "大阪府"]),
        "2026-08-03",
        "実務拠点: 〒702-8038 岡山県岡山市南区松浜町7-15-201（086-239-7743）※組合許可住所とは別。対応言語に英語・ベンガル語・シンハラ語を追加。監理支援機関としての育成就労移行状況: B(申請準備中)。",
      ]
    );
    console.log("→ トリニティウイング協同組合を更新しました");
  } else {
    console.log("→ id=37685 が見つかりませんでした（更新スキップ）");
  }

  console.log("\n=== まごころ協同組合 検索 (support_orgs) ===");
  const [magokoro] = await conn.query(
    "SELECT id, regNo, name, prefecture, address, phone FROM support_orgs WHERE name LIKE '%まごころ協同組合%'"
  );
  console.log(JSON.stringify(magokoro, null, 1));

  if (magokoro.length > 0) {
    for (const org of magokoro) {
      await conn.query(
        `UPDATE support_orgs SET
          address = ?,
          preferredFields = ?,
          preferredRegions = ?,
          consultStatus = 'open',
          isVerified = true,
          verifiedAt = ?,
          verifiedNote = ?
        WHERE id = ?`,
        [
          "〒418-0066 静岡県富士宮市大宮町10-15 アーバンABCハイツ１階D号室",
          JSON.stringify(["食品加工業", "建設業", "自動車整備", "介護"]),
          JSON.stringify(["東京都", "千葉県", "埼玉県", "静岡県"]),
          "2026-08-03",
          "許可番号: 許2006000360。以前別組合と情報が混同されていたため訂正済み。",
          org.id,
        ]
      );
      console.log(`→ support_orgs id=${org.id} を更新しました`);
    }
  } else {
    console.log("→ support_orgsに見つかりませんでした");
  }

  console.log("\n=== まごころ協同組合 検索 (kanri_orgs) ===");
  const [kanri] = await conn.query(
    "SELECT id, managementId, name, permitType, prefecture, address, migrationStatus, isVerified FROM kanri_orgs WHERE name LIKE '%まごころ協同組合%'"
  );
  console.log(JSON.stringify(kanri, null, 1));

  if (kanri.length > 0) {
    for (const org of kanri) {
      await conn.query(
        `UPDATE kanri_orgs SET
          address = ?,
          migrationStatus = 'preparing',
          statusConfirmedAt = ?,
          isVerified = true,
          verifiedAt = ?,
          statusNote = ?
        WHERE id = ?`,
        [
          "〒418-0066 静岡県富士宮市大宮町10-15 アーバンABCハイツ１階D号室",
          "2026-08-03",
          "2026-08-03",
          "以前別組合と情報が混同されていたため訂正済み。許可番号: 許2006000360。",
          org.id,
        ]
      );
      console.log(`→ kanri_orgs id=${org.id} (${org.managementId}) を更新しました`);
    }
  } else {
    console.log("→ kanri_orgsに見つかりませんでした（OTIT名簿に無い可能性あり）");
  }

  await conn.end();
  console.log("\n完了");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
