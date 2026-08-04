import { describe, expect, it } from "vitest";
import {
  normalizeLanguageName,
  normalizeLanguages,
  normalizeLanguageList,
} from "../shared/languageNormalize";

// 全11,448機関の languagesRaw を突き合わせて見つかった実例を固定する。
// 旧来の正規化はホワイトリスト方式で、知らない言語名を黙って捨てていた。
// ここで守りたいのは「原文にある記載を落とさない」ことと、
// 「機関が自分で否定した言語を勝手に足さない」ことの両方。

describe("別名・国名を正式名称へ寄せる", () => {
  const cases: [string, string][] = [
    ["カンボジア語", "クメール語"],
    ["フィリピン語", "タガログ語"],
    ["スリランカ語", "シンハラ語"],
    ["バングラデシュ語", "ベンガル語"],
    ["ビルマ語", "ミャンマー語"],
    ["インド語", "ヒンディー語"],
    ["パキスタン語", "ウルドゥー語"],
    ["ウズベキスタン語", "ウズベク語"],
    ["マレーシア語", "マレー語"],
    ["朝鮮語", "韓国語"],
    ["北京語", "中国語"],
    ["ラオ語", "ラオス語"],
    ["ブータン語", "ゾンカ語"],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(normalizeLanguageName(input)).toBe(expected);
    });
  }
});

describe("誤字・表記ゆれを吸収する", () => {
  it("全角ハイフンの長音（ミャンマ－語）を直す", () => {
    expect(normalizeLanguageName("ミャンマ－語")).toBe("ミャンマー語");
    expect(normalizeLanguageName("ネパ－ル語")).toBe("ネパール語");
  });
  it("「御」「悟」「顎」「後」「誤語」などの誤字を直す", () => {
    expect(normalizeLanguageName("カンボジア御")).toBe("クメール語");
    expect(normalizeLanguageName("カンボジア悟")).toBe("クメール語");
    expect(normalizeLanguageName("中国悟")).toBe("中国語");
    expect(normalizeLanguageName("インドネシア顎")).toBe("インドネシア語");
    expect(normalizeLanguageName("ネパール後")).toBe("ネパール語");
    expect(normalizeLanguageName("ミャンマー誤語")).toBe("ミャンマー語");
  });
  it("末尾の数字を落とす（中国語0）", () => {
    expect(normalizeLanguageName("中国語0")).toBe("中国語");
  });
});

describe("地図に無い言語名も捨てない", () => {
  it("実在する言語はそのまま採用する", () => {
    expect(normalizeLanguageName("ノルウェー語")).toBe("ノルウェー語");
    expect(normalizeLanguageName("セブアノ語")).toBe("セブアノ語");
    expect(normalizeLanguageName("チューク語")).toBe("チューク語");
  });
  it("言語名として読めないものは採用しない", () => {
    expect(normalizeLanguageName("語")).toBeNull();
    expect(normalizeLanguageName("シンハラ語は現在未対応")).toBeNull();
    expect(normalizeLanguageName("事業者申告により確認")).toBeNull();
    expect(normalizeLanguageName("2026年7月16日")).toBeNull();
  });
  it("語幹だけの記載は、正式名称・別名に載っているものだけ救う", () => {
    // 「中国（北京・広東）語」を分解すると語幹だけが残る
    expect(normalizeLanguageName("北京")).toBe("中国語");
    expect(normalizeLanguageName("広東")).toBe("広東語");
    expect(normalizeLanguageName("クメール")).toBe("クメール語");
    // 語幹に「語」を足せば正規表現には通ってしまう文字列を救わない
    expect(normalizeLanguageName("事業者申告により確認")).toBeNull();
  });
  it("区切り漏れで連結された記載は言語として採用しない", () => {
    // normalizeLanguages 側で分解されるため、単体では弾く
    expect(normalizeLanguageName("ベトナム語中国語")).toBeNull();
    expect(normalizeLanguageName("語英語")).toBeNull();
  });
});

describe("原文からの分解", () => {
  it("中黒区切りを記載順のまま拾う", () => {
    expect(normalizeLanguages("ベトナム語・英語・中国語").languages)
      .toEqual(["ベトナム語", "英語", "中国語"]);
  });
  it("半角中黒（･）でも区切る", () => {
    expect(normalizeLanguages("中国語・韓国語・英語･ベトナム語").languages)
      .toEqual(["中国語", "韓国語", "英語", "ベトナム語"]);
  });
  it("句点（。）でも区切る", () => {
    expect(normalizeLanguages("タガログ語。シンハラ語").languages)
      .toEqual(["タガログ語", "シンハラ語"]);
  });
  it("区切り記号を打ち忘れた記載も1言語ずつ拾う", () => {
    expect(normalizeLanguages("ベトナム語中国語・英語").languages)
      .toEqual(["ベトナム語", "中国語", "英語"]);
    expect(normalizeLanguages("中国語・ベトナム語・タイ語・ミャンマー語シンハラ語").languages)
      .toEqual(["中国語", "ベトナム語", "タイ語", "ミャンマー語", "シンハラ語"]);
  });
  it("併記の括弧は両方拾って重複を除く", () => {
    expect(normalizeLanguages("カンボジア語（クメール語）").languages).toEqual(["クメール語"]);
    expect(normalizeLanguages("フィリピン（タガログ）語").languages).toEqual(["タガログ語"]);
  });
  it("括弧内に別言語が並ぶ書き方も取りこぼさない", () => {
    // 「中国（北京・広東）語」は最後の1語にしか「語」が付いていない
    expect(normalizeLanguages("ベトナム語・中国（北京・広東）語・英語").languages)
      .toEqual(["ベトナム語", "中国語", "広東語", "英語"]);
  });
  it("改行を挟んだ記載も拾う", () => {
    expect(normalizeLanguages("中国語・ミャンマー語\n・ベトナム語").languages)
      .toEqual(["中国語", "ミャンマー語", "ベトナム語"]);
  });
  it("同じ言語が別名で二度出ても1つにまとめる", () => {
    expect(normalizeLanguages("カンボジア語・クメール語").languages).toEqual(["クメール語"]);
  });
  it("空・未設定は空配列", () => {
    expect(normalizeLanguages(null).languages).toEqual([]);
    expect(normalizeLanguages("").languages).toEqual([]);
  });
});

// 対応できない言語を名指しした記載を「対応言語」に足すと、
// その言語が必要な企業に誤って紹介してしまう。
describe("未対応と明記された言語は足さない", () => {
  const raw =
    "英語・ベトナム語・インドネシア語・タイ語・ミャンマー語・クメール語" +
    "（2026年7月16日 事業者申告により確認。中国語・ネパール語・シンハラ語は現在未対応）";

  it("否定された言語は含まれない", () => {
    const { languages } = normalizeLanguages(raw);
    expect(languages).not.toContain("中国語");
    expect(languages).not.toContain("ネパール語");
    expect(languages).not.toContain("シンハラ語");
  });
  it("対応できる言語は残る", () => {
    expect(normalizeLanguages(raw).languages)
      .toEqual(["英語", "ベトナム語", "インドネシア語", "タイ語", "ミャンマー語", "クメール語"]);
  });
  it("除外した記載を negated で返す（黙って消さない）", () => {
    expect(normalizeLanguages(raw).negated).toEqual(["中国語・ネパール語・シンハラ語は現在未対応）"]);
  });
});

describe("読めなかったトークンの報告", () => {
  it("言語でない記載を unrecognized に分ける", () => {
    const { languages, unrecognized } = normalizeLanguages("英語・なんらかの但し書きです");
    expect(languages).toEqual(["英語"]);
    expect(unrecognized).toEqual(["なんらかの但し書きです"]);
  });
  it("記号だけの断片は数えない", () => {
    expect(normalizeLanguages("英語・・／（）").unrecognized).toEqual([]);
  });
  it("括弧分解の副産物である「語」単体は数えない", () => {
    expect(normalizeLanguages("中国（台湾）語").unrecognized).toEqual([]);
    expect(normalizeLanguages("中国（台湾）語").languages).toEqual(["中国語", "台湾語"]);
  });
});

describe("配列の正規化（管理画面での手入力）", () => {
  it("別名を寄せ、重複を除く", () => {
    expect(normalizeLanguageList(["カンボジア語", "クメール語", "英語"]))
      .toEqual(["クメール語", "英語"]);
  });
  it("判別できない値は落とさず残す（運用者が意図して入れた値を消さない）", () => {
    expect(normalizeLanguageList(["英語", "手話"])).toEqual(["英語", "手話"]);
  });
  it("空文字は無視する", () => {
    expect(normalizeLanguageList(["英語", "", "  "])).toEqual(["英語"]);
  });
});
