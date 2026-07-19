import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 日付を日本時間（Asia/Tokyo）固定で「2026年7月16日」形式にフォーマットする。
 * SSR（サーバーはUTC）とクライアント（ユーザーのローカルTZ）で結果が一致するよう、
 * timeZoneを必ず固定すること（hydration mismatch防止）。
 */
export function formatDateJa(
  date: Date | string | number,
  opts: { month?: "long" | "2-digit" } = {},
): string {
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: opts.month ?? "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });
}
