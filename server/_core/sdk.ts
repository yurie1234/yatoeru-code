// Manus OAuth依存を廃止し、オーナー1人向けの簡易パスワード認証に置き換えた実装。
// 呼び出し側（server/_core/context.ts, server/registrySync.ts, server/sheetSync.ts,
// server/articlePublish.ts）は `sdk.authenticateRequest(req)` を呼ぶだけの形を維持し、
// admin.tsやevents.tsのadminProcedureも `ctx.user.role === "admin"` を見るだけなので、
// このファイル以外は変更していない。
//
// 2種類の認証を扱う:
//  1. 管理画面（/admin）のオーナーログイン: ADMIN_PASSWORDでログインし、
//     JWTセッションクッキーを発行する（旧実装のOAuthコールバックの代替）。
//  2. 週次/月次の同期ジョブ（旧: Manus Agent cronがOAuth経由で呼んでいた）:
//     CRON_SECRETを共有シークレットとしてAuthorization: Bearerで渡す。
//     新ホスティング先では自前のスケジューラ（GitHub Actions等）から
//     このシークレットを付けて叩く運用にする。
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";

export type SessionPayload = { role: "admin" };

class AuthService {
  private getSecretKey() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /**
   * パスワードを検証し、正しければセッションJWTを返す。
   * ADMIN_PASSWORD未設定時は常に失敗する（誤って無認証で開放されるのを防ぐ）。
   */
  async login(password: string): Promise<string | null> {
    if (!ENV.adminPassword) {
      console.warn("[Auth] ADMIN_PASSWORD is not configured; admin login disabled");
      return null;
    }
    if (password !== ENV.adminPassword) return null;
    return this.signSession({ role: "admin" });
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSecretKey());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSecretKey(), {
        algorithms: ["HS256"],
      });
      if (payload.role !== "admin") return null;
      return { role: "admin" };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    // 1. cron: 共有シークレットのBearerトークン（旧Manus Agent cronの代替）
    if (bearerToken && ENV.cronSecret && bearerToken === ENV.cronSecret) {
      return buildCronUser();
    }

    // 2. 管理画面: セッションクッキー。ブラウザがサードパーティcookieを
    //    ブロックする環境向けに、Authorization: Bearerでのセッショントークン
    //    渡しにもフォールバックする（旧実装のPreview auto-loginパターンを踏襲）。
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(COOKIE_NAME) ?? bearerToken;
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session");
    }
    return buildAdminUser();
  }
}

/** Result of `sdk.authenticateRequest`. Cron呼び出しは isCron=true を立てる。 */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildAdminUser(): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: "owner",
    name: "オーナー",
    email: null,
    loginMethod: null,
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    isCron: false,
  } as AuthenticatedUser;
}

function buildCronUser(): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: "cron",
    name: "Scheduled Job",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new AuthService();
