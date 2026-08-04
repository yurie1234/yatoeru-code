/**
 * 対応可能言語の棚卸し。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する:
 *   node scripts/audit-languages.mjs           … 差分を数えるだけ（DBは変更しない）
 *   node scripts/audit-languages.mjs --apply   … languages列を原文から作り直す
 *
 * 旧来の正規化はホワイトリスト方式で、知らない言語名を黙って捨てていた。
 * 「ウズベキスタン語」だけを記載していた機関は言語欄が空になり、検索でも
 * 掲載ページでも「記載なし」に見えていた。原文（languagesRaw）は残っているので、
 * shared/languageNormalize.ts の正規化で作り直せる。
 *
 * --apply は languages 列だけを書き換える。languagesRaw（登録簿の原文）は
 * 一切触らないので、正規化を直せば何度でもやり直せる。
 */
import mysql from "mysql2/promise";

// 正規化の本体はTypeScript（shared/languageNormalize.ts）にある。二重管理して
// 実装がずれるのを避けるため、こちらから読み込む。
// TypeScriptをそのまま読めるのは Node 22.18 以降（型除去が既定で有効）。
// それより古いNodeでは読めないため、原因と回避方法を出して止まる。
let normalizeLanguages;
try {
  ({ normalizeLanguages } = await import("../shared/languageNormalize.ts"));
} catch (e) {
  console.error("正規化モジュールを読み込めませんでした。");
  console.error(`  Node のバージョン: ${process.version}（22.18 以降が必要です）`);
  console.error("  次のどちらかで実行してください:");
  console.error("    node --experimental-strip-types scripts/audit-languages.mjs");
  console.error("    npx tsx scripts/audit-languages.mjs");
  console.error(`  元のエラー: ${e?.message ?? e}`);
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL が未設定です。Railwayのairy-prosperityのConsoleで実行してください。");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const [rows] = await conn.query(
  "SELECT id, regNo, name, languages, languagesRaw FROM support_orgs ORDER BY id"
);
console.log(`対象機関: ${rows.length}件\n`);

/** 配列としての中身が同じか（順序の違いは差分として扱わない） */
function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

const addedFreq = new Map();     // 追加される言語 → 機関数
const removedFreq = new Map();   // 消える言語 → 機関数
const unrecognizedFreq = new Map(); // 言語名として読めなかったトークン → 機関数
const emptyToFilled = [];        // 空だったのが埋まる機関
const negatedNotes = [];         // 「未対応」と明記されていて除外した記載
const keptNotInRaw = [];         // 原文に無いが既存にある言語（事業者申告として保持）
let changed = 0;
const updates = [];

for (const r of rows) {
  let current = [];
  try {
    current = typeof r.languages === "string" ? JSON.parse(r.languages) : (r.languages ?? []);
  } catch {
    current = [];
  }
  if (!Array.isArray(current)) current = [];

  const { languages: derived, unrecognized, negated } = normalizeLanguages(r.languagesRaw);
  for (const u of unrecognized) unrecognizedFreq.set(u, (unrecognizedFreq.get(u) ?? 0) + 1);
  if (negated.length > 0) negatedNotes.push(`${r.regNo} ${r.name}: ${negated.join(" / ")}`);

  // 「未対応」と明記された言語は、既存に入っていても足し戻さない
  const negatedLangs = new Set(negated.flatMap((n) => normalizeLanguages(n).languages));

  // 原文から作り直した結果に、既存の値を**足す**（置き換えない）。
  //
  // 既存にあって原文に無い言語は、事業者本人の回答を管理画面から反映したもの。
  // 例: トリニティウイング協同組合（24登-009849）の英語・ベンガル語・シンハラ語は
  // 「対応言語に追加してほしい」という本人回答に基づく申告で、法務省の登録簿の
  // 原文には載っていない。原文で単純に上書きすると、本人が申告した対応言語を
  // 消してしまい、その言語が必要な企業に届かなくなる。
  const next = [...derived];
  const manual = [];
  for (const l of current) {
    if (next.includes(l)) continue;
    if (negatedLangs.has(l)) continue; // 未対応と明記された言語は戻さない
    next.push(l);
    manual.push(l);
  }
  if (manual.length > 0) {
    keptNotInRaw.push(`${r.regNo} ${r.name}: ${manual.join("・")}`);
  }

  if (sameSet(current, next)) continue;
  changed++;
  for (const l of next) if (!current.includes(l)) addedFreq.set(l, (addedFreq.get(l) ?? 0) + 1);
  for (const l of current) if (!next.includes(l)) removedFreq.set(l, (removedFreq.get(l) ?? 0) + 1);
  if (current.length === 0 && next.length > 0) {
    emptyToFilled.push(`${r.regNo} ${r.name} → ${next.join("・")}`);
  }
  updates.push({ id: r.id, languages: next });
}

function report(title, map, limit = 40) {
  console.log(`=== ${title}（${map.size}種類） ===`);
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, c] of entries.slice(0, limit)) console.log(String(c).padStart(6), k);
  if (entries.length > limit) console.log(`  … 他${entries.length - limit}種類`);
  console.log("");
}

console.log(`languages列が変わる機関: ${changed}件\n`);
report("追加される言語", addedFreq);
report("消える言語（0であるべき。1つでもあれば反映せず原因を調べる）", removedFreq);
report("言語名として読めなかったトークン（要確認・languagesには入れない）", unrecognizedFreq);

console.log(`=== 登録簿の原文に無いが保持する言語（事業者本人の申告）: ${keptNotInRaw.length}件 ===`);
for (const line of keptNotInRaw.slice(0, 30)) console.log("  " + line);
if (keptNotInRaw.length > 30) console.log(`  … 他${keptNotInRaw.length - 30}件`);
console.log("");

console.log(`=== 「未対応」と明記されていて除外した記載: ${negatedNotes.length}件 ===`);
for (const line of negatedNotes) console.log("  " + line);
console.log("");

console.log(`=== 言語欄が空→埋まる機関: ${emptyToFilled.length}件 ===`);
for (const line of emptyToFilled.slice(0, 50)) console.log("  " + line);
if (emptyToFilled.length > 50) console.log(`  … 他${emptyToFilled.length - 50}件`);
console.log("");

if (!APPLY) {
  console.log("※ 確認のみ（DBは変更していません）。反映するには --apply を付けて実行してください。");
  await conn.end();
  process.exit(0);
}

console.log(`--apply: ${updates.length}件のlanguages列を更新します（languagesRawは変更しません）…`);
let done = 0;
for (let i = 0; i < updates.length; i += 200) {
  const chunk = updates.slice(i, i + 200);
  await Promise.all(
    chunk.map((u) =>
      conn.execute("UPDATE support_orgs SET languages = ? WHERE id = ?", [
        JSON.stringify(u.languages),
        u.id,
      ])
    )
  );
  done += chunk.length;
  console.log(`  ${done}/${updates.length}`);
}
console.log("完了。yatoeru.jp/search の言語フィルタで確認してください。");
await conn.end();
