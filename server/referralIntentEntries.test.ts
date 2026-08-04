import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { REFERRAL_INTENTS } from "../shared/referralIntent";

// scripts/apply-referral-intents.mjs に書く初期入力の中身を検証する。
//
// 送客優先度は「相談リードが来たときにどこへ紹介するか」の判断材料になる。
// 推測で埋めると、根拠のない優先順位で企業を機関へ紹介することになるため、
// **記録に残っている事実だけを入れる**という前提をここで固定する。

const SCRIPT = fs.readFileSync(
  path.resolve(import.meta.dirname, "..", "scripts", "apply-referral-intents.mjs"),
  "utf8"
);

/** スクリプト内の ENTRIES 配列から regNo / intent / note を素朴に抜き出す */
function parseEntries() {
  const block = SCRIPT.slice(SCRIPT.indexOf("const ENTRIES = ["), SCRIPT.indexOf("const VALID = new Set"));
  const entries: Array<{ regNo: string; intent: string; note: string }> = [];
  for (const chunk of block.split(/\n  \{\n/).slice(1)) {
    const regNo = chunk.match(/regNo:\s*"([^"]+)"/)?.[1];
    const intent = chunk.match(/intent:\s*"([^"]+)"/)?.[1];
    const noteStart = chunk.indexOf("note:");
    const note = noteStart >= 0 ? chunk.slice(noteStart) : "";
    if (regNo && intent) entries.push({ regNo, intent, note });
  }
  return entries;
}

const ENTRIES = parseEntries();

describe("送客優先度の初期入力", () => {
  it("5件の機関が対象になっている", () => {
    expect(ENTRIES).toHaveLength(5);
  });

  it("区分はすべて定義済みの値", () => {
    for (const e of ENTRIES) {
      expect(REFERRAL_INTENTS as readonly string[], `${e.regNo} の区分が不正`).toContain(e.intent);
    }
  });

  it("登録番号の形式が正しい（機関の取り違えを防ぐ）", () => {
    for (const e of ENTRIES) {
      expect(e.regNo, `${e.regNo} の形式が不正`).toMatch(/^\d{2}登-\d{6}$/);
    }
  });

  it("登録番号が重複していない", () => {
    const regNos = ENTRIES.map((e) => e.regNo);
    expect(new Set(regNos).size).toBe(regNos.length);
  });

  // 「なぜこの区分なのか」を後から検証できないメモは、判断材料として使えない
  it("すべてのメモに出典が書かれている", () => {
    for (const e of ENTRIES) {
      expect(e.note, `${e.regNo} のメモに出典がない`).toMatch(/出典:/);
    }
  });

  it("agreed（条件合意）は1件も無い（まだ書面で確定した先はない）", () => {
    // 合意していない先を agreed にすると、成約済みと誤認して営業判断を誤る
    expect(ENTRIES.filter((e) => e.intent === "agreed")).toEqual([]);
  });

  it("意向が未確認の機関は含めない（推測で埋めない）", () => {
    // ALBATZ（商談済みだが価格シグナル未提示）と
    // インバウンドジャパン（価格選好の質問に未回答）は unknown のままにする
    const regNos = ENTRIES.map((e) => e.regNo);
    expect(regNos).not.toContain("23登-008642"); // ALBATZ株式会社
    expect(regNos).not.toContain("19登-000020"); // 株式会社インバウンドジャパン
  });

  it("金額が確定していない先は negotiating か interested に留める", () => {
    // FMS（先方から5〜10万円/人の提示あり・正式条件は未確定）
    const fms = ENTRIES.find((e) => e.regNo === "24登-010244");
    expect(fms?.intent).toBe("negotiating");
    // Tree・エドミール（有料紹介を検討可・金額未提示）
    for (const regNo of ["25登-011385", "25登-011916"]) {
      expect(ENTRIES.find((e) => e.regNo === regNo)?.intent).toBe("interested");
    }
  });
});

describe("スクリプトの安全性", () => {
  it("--apply を付けない限りDBを変更しない", () => {
    expect(SCRIPT).toContain('const APPLY = process.argv.includes("--apply")');
    expect(SCRIPT).toContain("※ 確認のみ（DBは変更していません）");
  });

  it("UPDATE は --apply の判定より後にしか無い", () => {
    const guard = SCRIPT.indexOf("if (!APPLY)");
    const update = SCRIPT.indexOf("UPDATE support_orgs");
    expect(guard).toBeGreaterThan(0);
    expect(update).toBeGreaterThan(guard);
  });

  it("公開されない情報であることがスクリプト冒頭に明記されている", () => {
    expect(SCRIPT).toContain("完全非公開の運用情報");
    expect(SCRIPT).toContain("sanitizeOrg");
  });
});
