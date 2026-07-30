import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

/** 計測専用のvanilla tRPCクライアント（Reactフック外から呼べる） */
const trackClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
});

export type TrackEventType =
  | "org_detail_view"
  | "consult_submit"
  | "bulk_consult_submit"
  | "phone_tap"
  | "website_click"
  | "diagnose_start"
  | "diagnose_complete"
  | "proposal_generate";

const SRC_KEY = "yatoeru_src";

/** bot・ヘッドレス環境・運営者（yt_exclude）を計測から除外 */
function isExcluded(): boolean {
  try {
    if (localStorage.getItem("yt_exclude") === "1") return true;
  } catch {
    /* noop */
  }
  try {
    const ua = navigator.userAgent || "";
    if (/bot|crawl|spider|slurp|headless|lighthouse|prerender|scrapy|python-requests|curl|wget/i.test(ua)) {
      return true;
    }
    if ((navigator as { webdriver?: boolean }).webdriver) return true;
  } catch {
    /* noop */
  }
  return false;
}

/** ページ到達時に ?src= 流入元パラメータを保持（セッション内で維持） */
export function captureSource(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get("src") || params.get("utm_source");
    if (src) sessionStorage.setItem(SRC_KEY, src.slice(0, 128));
  } catch {
    /* noop */
  }
}

function getSource(): string | null {
  try {
    return sessionStorage.getItem(SRC_KEY);
  } catch {
    return null;
  }
}

/** GA4（gtag）へのイベント送信（タグ未ロード時は何もしない） */
function sendGa4Event(eventType: TrackEventType, orgId?: number | null): void {
  try {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", eventType, {
      org_id: orgId ?? undefined,
      source: getSource() ?? undefined,
      page_path: window.location.pathname,
    });
  } catch {
    /* noop */
  }
}

/**
 * ファーストパーティイベント記録（fire-and-forget）。
 * 自前DBとGA4の両方に送る。失敗してもUIに影響しない。
 */
export function trackEvent(eventType: TrackEventType, orgId?: number | null): void {
  if (isExcluded()) return;
  sendGa4Event(eventType, orgId);
  try {
    void trackClient.events.track
      .mutate({
        eventType,
        orgId: orgId ?? null,
        source: getSource(),
        path: window.location.pathname.slice(0, 512),
        referrer: document.referrer || null,
      })
      .catch(() => {});
  } catch {
    /* noop */
  }
}
