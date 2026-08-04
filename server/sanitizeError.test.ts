import { describe, expect, it } from "vitest";
import { clientSafeMessage, redactSecrets } from "./_core/sanitizeError";

// 診断APIの500応答に Anthropic APIキーの値がそのまま含まれていた事故の再発防止。
// SDKやNode組み込みの例外は渡した値をメッセージに埋め込むことがあり、
// tRPCは既定でその message をクライアントへ返す。

describe("redactSecrets", () => {
  it("Anthropic形式のAPIキーをマスクする", () => {
    const msg =
      'Headers.append: "sk-ant-api03-AAAAbbbbCCCCddddEEEEffffGGGGhhhh" is an invalid header value.';
    const out = redactSecrets(msg);
    expect(out).not.toContain("sk-ant-api03");
    expect(out).toContain("[REDACTED]");
  });

  it("改行を含むキーでもマスクする（実際の事故はキーに改行が混入していた）", () => {
    const msg = 'Headers.append: "sk-ant-api03-AAAAbbbb\nCCCCddddEEEE" is an invalid header value.';
    const out = redactSecrets(msg);
    expect(out).not.toContain("sk-ant-api03-AAAAbbbb");
  });

  it("OpenAI形式のキーもマスクする", () => {
    expect(redactSecrets("bad key sk-proj-abcdefghijklmnop")).not.toContain("sk-proj-abcdefghij");
  });

  it("Bearerトークンをマスクする", () => {
    const out = redactSecrets("Authorization: Bearer abcdef1234567890XYZ failed");
    expect(out).not.toContain("abcdef1234567890XYZ");
  });

  it("DB接続文字列をマスクする（認証情報を含む）", () => {
    const out = redactSecrets("connect ECONNREFUSED mysql://user:pass@host:3306/db");
    expect(out).not.toContain("user:pass");
    expect(out).toContain("[REDACTED]");
  });

  it("JWTをマスクする", () => {
    const out = redactSecrets(
      "invalid token eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.s5gnATcxE9k"
    );
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });

  it("秘密を含まないメッセージは変えない", () => {
    const msg = "登録番号が見つかりません";
    expect(redactSecrets(msg)).toBe(msg);
  });
});

describe("clientSafeMessage", () => {
  it("INTERNAL_SERVER_ERROR は内容を伏せて定型文にする", () => {
    const out = clientSafeMessage(
      "INTERNAL_SERVER_ERROR",
      'Headers.append: "sk-ant-api03-secretvalue1234" is an invalid header value.'
    );
    expect(out).not.toContain("sk-ant");
    expect(out).not.toContain("Headers.append");
    expect(out).toContain("時間をおいて");
  });

  it("利用者に伝えるべきメッセージは残す", () => {
    expect(clientSafeMessage("NOT_FOUND", "登録番号が見つかりません")).toBe(
      "登録番号が見つかりません"
    );
    expect(clientSafeMessage("BAD_REQUEST", "支援料の下限が上限を超えています")).toBe(
      "支援料の下限が上限を超えています"
    );
    expect(clientSafeMessage("CONFLICT", "同一登録番号が複数件あります。手動確認が必要です")).toBe(
      "同一登録番号が複数件あります。手動確認が必要です"
    );
  });

  it("INTERNAL_SERVER_ERROR以外でも秘密はマスクする（多重防御）", () => {
    const out = clientSafeMessage("BAD_REQUEST", "invalid sk-ant-api03-leakedvalue0000");
    expect(out).not.toContain("sk-ant-api03-leakedvalue");
  });

  it("codeが無い場合もマスクは効く", () => {
    const out = clientSafeMessage(undefined, "sk-ant-api03-leakedvalue0000");
    expect(out).toBe("[REDACTED]");
  });
});
