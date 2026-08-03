import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Request } from "express";

// ENVはprocess.envをモジュール読み込み時に一度だけ評価するため、
// テストごとにprocess.envを設定してからvi.resetModules()で再読み込みする。
const ORIGINAL_ENV = { ...process.env };

function makeReq(opts: { cookie?: string; authorization?: string }): Request {
  return {
    headers: {
      cookie: opts.cookie,
      authorization: opts.authorization,
    },
  } as unknown as Request;
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sdk (owner password login + cron secret)", () => {
  it("login: ADMIN_PASSWORD未設定なら常に失敗する", async () => {
    delete process.env.ADMIN_PASSWORD;
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const token = await sdk.login("anything");
    expect(token).toBeNull();
  });

  it("login: 誤ったパスワードは失敗する", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const token = await sdk.login("wrong-password");
    expect(token).toBeNull();
  });

  it("login: 正しいパスワードでセッショントークンを発行し、verifySessionで検証できる", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const token = await sdk.login("correct-password");
    expect(token).toBeTruthy();
    const session = await sdk.verifySession(token);
    expect(session).toEqual({ role: "admin" });
  });

  it("authenticateRequest: cookie・Authorizationどちらも無い場合はForbidden", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    await expect(sdk.authenticateRequest(makeReq({}))).rejects.toThrow();
  });

  it("authenticateRequest: 有効なセッションcookieでadminユーザーを返す", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const { COOKIE_NAME } = await import("../../shared/const");
    const token = await sdk.login("correct-password");
    const user = await sdk.authenticateRequest(
      makeReq({ cookie: `${COOKIE_NAME}=${token}` })
    );
    expect(user.role).toBe("admin");
    expect(user.isCron).toBe(false);
  });

  it("authenticateRequest: 有効なセッショントークンをAuthorization: Bearerで渡しても通る", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const token = await sdk.login("correct-password");
    const user = await sdk.authenticateRequest(
      makeReq({ authorization: `Bearer ${token}` })
    );
    expect(user.role).toBe("admin");
  });

  it("authenticateRequest: CRON_SECRETと一致するBearerトークンはcronユーザーを返す", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    process.env.CRON_SECRET = "cron-shared-secret";
    const { sdk } = await import("./sdk");
    const user = await sdk.authenticateRequest(
      makeReq({ authorization: "Bearer cron-shared-secret" })
    );
    expect(user.isCron).toBe(true);
  });

  it("authenticateRequest: 不正なcookie値はForbidden", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "test-secret";
    const { sdk } = await import("./sdk");
    const { COOKIE_NAME } = await import("../../shared/const");
    await expect(
      sdk.authenticateRequest(makeReq({ cookie: `${COOKIE_NAME}=garbage` }))
    ).rejects.toThrow();
  });

  it("authenticateRequest: 別のJWT_SECRETで署名されたトークンは検証に失敗する", async () => {
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "secret-a";
    const { sdk: sdkA } = await import("./sdk");
    const token = await sdkA.login("correct-password");

    vi.resetModules();
    process.env.ADMIN_PASSWORD = "correct-password";
    process.env.JWT_SECRET = "secret-b";
    const { sdk: sdkB } = await import("./sdk");
    const { COOKIE_NAME } = await import("../../shared/const");
    await expect(
      sdkB.authenticateRequest(makeReq({ cookie: `${COOKIE_NAME}=${token}` }))
    ).rejects.toThrow();
  });
});
