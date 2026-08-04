import { describe, expect, it } from "vitest";
import { parseVerifiedNote } from "../shared/verifiedNote";
import { PENDING_LISTING_UPDATES } from "./pendingListingUpdates";

describe("parseVerifiedNote", () => {
  it("「ラベル: 値」を1項目として分解する", () => {
    const { rows, footnotes } = parseVerifiedNote(
      ["支援料: 1名あたり月額9,800円（税別）", "併有する免許: 宅地建物取引業"].join("\n")
    );
    expect(rows).toEqual([
      { label: "支援料", value: "1名あたり月額9,800円（税別）" },
      { label: "併有する免許", value: "宅地建物取引業" },
    ]);
    expect(footnotes).toEqual([]);
  });

  it("全角コロンも区切りとして扱う", () => {
    const { rows } = parseVerifiedNote("支援体制：チューター制度");
    expect(rows).toEqual([{ label: "支援体制", value: "チューター制度" }]);
  });

  it("※で始まる行は注記としてまとめ、※を外して返す", () => {
    const { rows, footnotes } = parseVerifiedNote(
      ["支援料: 月額9,800円", "※事業者本人の回答に基づきます。"].join("\n")
    );
    expect(rows).toHaveLength(1);
    expect(footnotes).toEqual(["事業者本人の回答に基づきます。"]);
  });

  it("ラベルが無い行はラベルなしの本文として残す（旧データ互換）", () => {
    const { rows } = parseVerifiedNote("以前別組合と情報が混同されていたため訂正済み。");
    expect(rows).toEqual([
      { label: null, value: "以前別組合と情報が混同されていたため訂正済み。" },
    ]);
  });

  it("値の中のコロンでラベルを切らない", () => {
    const { rows } = parseVerifiedNote("公式サイト: https://ij-tokuteiginou.com/ を参照");
    expect(rows).toEqual([
      { label: "公式サイト", value: "https://ij-tokuteiginou.com/ を参照" },
    ]);
  });

  it("URLだけの行をラベル扱いしない", () => {
    const { rows } = parseVerifiedNote("https://ij-tokuteiginou.com/");
    expect(rows).toEqual([{ label: null, value: "https://ij-tokuteiginou.com/" }]);
  });

  it("空行は無視する", () => {
    const { rows } = parseVerifiedNote("支援料: 月額9,800円\n\n\n支援体制: 内製化");
    expect(rows).toHaveLength(2);
  });

  it("空・nullでも落ちない", () => {
    expect(parseVerifiedNote(null)).toEqual({ rows: [], footnotes: [] });
    expect(parseVerifiedNote("")).toEqual({ rows: [], footnotes: [] });
  });
});

describe("反映待ちの下書きの確認情報", () => {
  it("すべての行がラベル付き、または注記になっている（段落の塊にしない）", () => {
    for (const entry of PENDING_LISTING_UPDATES) {
      const { rows, footnotes } = parseVerifiedNote(entry.payload.verifiedNote);
      expect(rows.length + footnotes.length, entry.regNo).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.label, `${entry.regNo}: ${row.value}`).not.toBeNull();
      }
    }
  });

  it("1項目が長すぎない（読めない塊を作らない）", () => {
    for (const entry of PENDING_LISTING_UPDATES) {
      const { rows } = parseVerifiedNote(entry.payload.verifiedNote);
      for (const row of rows) {
        expect(row.value.length, `${entry.regNo}: ${row.label}`).toBeLessThanOrEqual(140);
      }
    }
  });
});
