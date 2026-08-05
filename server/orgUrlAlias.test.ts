import { describe, expect, it } from "vitest";
import { normalizeRegNo, orgAliasPath } from "./orgUrlAlias";

// 機関ページの正本URL `/org/35173` の数字はDBの連番で、登録簿にも機関名にも現れない。
// そのため営業メールを書くたびにサイト内検索でページを探す手作業が発生していた。
// 登録番号から機械的にURLを作れるようにし、その規則をここで固定する。

describe("登録番号からURLを組み立てる", () => {
  it("規則は「登」を to に置き換えるだけ", () => {
    expect(orgAliasPath("22登-007304")).toBe("/org/22to-007304");
    expect(orgAliasPath("19登-000020")).toBe("/org/19to-000020");
    expect(orgAliasPath("25登-011385")).toBe("/org/25to-011385");
  });

  it("手で書くときの揺れを吸収する", () => {
    // 全角・大文字・ハイフンなし・「登」なし・前後の空白
    for (const input of [
      "22to-007304",
      "22TO-007304",
      "22to007304",
      "22-007304",
      "22登-007304",
      " 22登-007304 ",
      "２２登－００７３０４",
    ]) {
      expect(normalizeRegNo(input), input).toBe("22登-007304");
    }
  });

  it("連番の頭の0が抜けていても補う（人が手で写すと落ちやすい）", () => {
    expect(normalizeRegNo("19登-20")).toBe("19登-000020");
    expect(normalizeRegNo("19to-20")).toBe("19登-000020");
  });

  it("登録番号でないものは受け付けない（数値IDのページを壊さない）", () => {
    for (const input of [
      "35173", // ← 内部ID。区切りも「登」も無い数字を登録番号と誤解釈すると、機関ページが壊れる
      "",
      "abc",
      "22to-",
      "登-007304",
      "2222登-007304",
      "22登-1234567",
    ]) {
      expect(normalizeRegNo(input), input).toBeNull();
    }
    expect(orgAliasPath("35173")).toBeNull();
  });

  // 正本は `/org/<id>` のまま。別名は301で送るだけにする。
  // すでに送った営業メールに書いた `/org/35173` が生き続け、
  // 検索エンジンに登録済みの11,448件のURLも動かないため。
  it("別名は正本を置き換えない（記録としてのテスト）", () => {
    expect(orgAliasPath("22登-007304")).not.toBe("/org/35173");
  });
});
