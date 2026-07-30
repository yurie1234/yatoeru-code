import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function publicCtx(ua: string | null = BROWSER_UA): TrpcContext {
  return {
    user: null,
    req: { headers: ua ? { "user-agent": ua } : {} } as unknown as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function adminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test",
      name: "admin",
      email: null,
      avatarUrl: null,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    } as unknown as NonNullable<TrpcContext["user"]>,
    req: { headers: { "user-agent": BROWSER_UA } } as unknown as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("events.track", () => {
  it("記録に成功するとok:trueを返す（サイト全体イベント）", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const res = await caller.events.track({
      eventType: "diagnose_start",
      orgId: null,
      source: "vitest",
      path: "/diagnose",
      referrer: "https://example.com/some/page",
    });
    expect(res.ok).toBe(true);
  });

  it("機関別イベント（org_detail_view）も記録できる", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const res = await caller.events.track({
      eventType: "org_detail_view",
      orgId: 1,
      source: "vitest",
      path: "/org/1",
    });
    expect(res.ok).toBe(true);
  });

  it("不正なイベント種別は拒否される", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(
      // @ts-expect-error 意図的に不正な値を渡す
      caller.events.track({ eventType: "hacky_event", orgId: null }),
    ).rejects.toThrow();
  });

  it("botのUser-Agentは記録されない（ok:false）", async () => {
    const caller = appRouter.createCaller(
      publicCtx("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    );
    const res = await caller.events.track({
      eventType: "org_detail_view",
      orgId: 1,
      source: "vitest",
      path: "/org/1",
    });
    expect(res.ok).toBe(false);
  });

  it("User-Agentなしは記録されない（ok:false）", async () => {
    const caller = appRouter.createCaller(publicCtx(null));
    const res = await caller.events.track({
      eventType: "diagnose_start",
      orgId: null,
      source: "vitest",
      path: "/diagnose",
    });
    expect(res.ok).toBe(false);
  });
});

describe("events.monthlyReport", () => {
  it("非管理者はアクセスできない", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.events.monthlyReport({ year: 2026, month: 7 })).rejects.toThrow();
  });

  it("管理者は月次集計を取得できる（vitest記録分が含まれる）", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const now = new Date();
    const res = await caller.events.monthlyReport({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
    expect(Array.isArray(res.orgRows)).toBe(true);
    expect(Array.isArray(res.siteRows)).toBe(true);
    // 直前のテストで記録したサイト全体イベントが集計に含まれる
    const diag = res.siteRows.find((r) => r.eventType === "diagnose_start");
    expect(Number(diag?.count ?? 0)).toBeGreaterThan(0);
  });
});
