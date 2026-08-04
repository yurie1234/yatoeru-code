import { describe, expect, it } from "vitest";
import {
  FIELD_SLUG_TO_NAME,
  normalizeFieldName,
  normalizeFieldNames,
} from "../shared/fieldNormalize";
import { TOKUTEI_FIELDS } from "../shared/tokutei";

describe("normalizeFieldName", () => {
  it("正式名称はそのまま返す", () => {
    for (const f of TOKUTEI_FIELDS) {
      expect(normalizeFieldName(f)).toBe(f);
    }
  });

  it("分野特化ページのスラッグを正式名称に直す", () => {
    expect(normalizeFieldName("kaigo")).toBe("介護");
    expect(normalizeFieldName("building-cleaning")).toBe("ビルクリーニング");
    expect(normalizeFieldName("butsuryu-soko")).toBe("物流倉庫");
    expect(normalizeFieldName("shigen-junkan")).toBe("資源循環");
    expect(normalizeFieldName("jidosha-unso")).toBe("自動車運送業");
    expect(normalizeFieldName("mokuzai")).toBe("木材産業");
  });

  it("旧分野名を現行名に直す", () => {
    expect(normalizeFieldName("素形材・産業機械・電気電子情報関連製造業")).toBe("工業製品製造業");
  });

  it("前後の空白を無視する", () => {
    expect(normalizeFieldName("  介護  ")).toBe("介護");
  });

  it("判別できない値はnullを返す", () => {
    expect(normalizeFieldName("全業種")).toBeNull();
    expect(normalizeFieldName("病院福祉施設給食製造")).toBeNull();
    expect(normalizeFieldName("")).toBeNull();
  });

  it("19分野すべてにスラッグが用意されている（取りこぼしで分野が消えないこと）", () => {
    const covered = new Set(Object.values(FIELD_SLUG_TO_NAME));
    const missing = TOKUTEI_FIELDS.filter((f) => !covered.has(f));
    expect(missing).toEqual([]);
  });
});

describe("normalizeFieldNames", () => {
  it("スラッグ配列をまとめて正式名称に直す", () => {
    expect(normalizeFieldNames(["kaigo", "building-cleaning", "butsuryu-soko"])).toEqual([
      "介護",
      "ビルクリーニング",
      "物流倉庫",
    ]);
  });

  it("重複を落とす（スラッグと正式名称が混在しても1件にまとめる）", () => {
    expect(normalizeFieldNames(["kaigo", "介護"])).toEqual(["介護"]);
  });

  it("判別できない値は落とす", () => {
    expect(normalizeFieldNames(["kaigo", "全業種", "なにか"])).toEqual(["介護"]);
  });

  it("null・undefined・空配列でも落ちない", () => {
    expect(normalizeFieldNames(null)).toEqual([]);
    expect(normalizeFieldNames(undefined)).toEqual([]);
    expect(normalizeFieldNames([])).toEqual([]);
  });
});
