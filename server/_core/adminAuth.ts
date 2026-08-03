// 旧 oauth.ts（Manus OAuthコールバック）の代替。
// オーナーがADMIN_PASSWORDを入力すると、セッションクッキーを発行して/adminへ通す。
import { ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerAdminAuthRoutes(app: Express) {
  app.post("/api/admin-login", async (req: Request, res: Response) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      res.status(400).json({ error: "password is required" });
      return;
    }

    const sessionToken = await sdk.login(password);
    if (!sessionToken) {
      res.status(401).json({ error: "invalid password" });
      return;
    }

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ ok: true });
  });
}
