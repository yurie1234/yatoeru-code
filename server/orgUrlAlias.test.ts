import { describe, expect, it } from "vitest";
import { normalizeRegNo, orgAliasPath } from "./orgUrlAlias";
import { kanriPath, parseKanriId } from "../shared/kanri";

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

// 監理団体のURL。登録番号を持たない（OTIT許可一覧に許可番号が無く独自採番）ため、
// 管理ID（I-0001 / T-0001）をそのままURLに使う。営業文面から機械的に作れる形。
describe("監理団体のURL", () => {
  it("正本は管理IDの小文字", () => {
    expect(kanriPath("I-0001")).toBe("/kanri/i-0001");
    expect(kanriPath("T-1373")).toBe("/kanri/t-1373");
  });

  it("大文字・ハイフンなし・桁足らずを吸収する", () => {
    for (const input of ["I-0001", "i-0001", "I0001", "i0001", "i-1", " i-0001 "]) {
      expect(parseKanriId(input), input).toBe("I-0001");
    }
  });

  it("管理IDでないものは受け付けない", () => {
    for (const input of ["", "0001", "II-0001", "i-1234567", "登-0001", "i-"]) {
      expect(parseKanriId(input), input).toBeNull();
    }
  });
});
