import type { Express, Request, Response } from "express";

/**
 * /llms.txt — AIクローラー・LLM向けのサイト概要（llmstxt.org準拠）
 * 公開情報のみを記載すること（内部メモ等は絶対に含めない）。
 */
const SITE_URL = "https://yatoeru.jp";

const LLMS_TXT = `# ヤトエル（Yatoeru）

> 登録支援機関（特定技能）・監理支援機関（育成就労）を比較できるデータベース。出入国在留管理庁の公開登録簿（一次情報）を基に掲載し、対応言語・地域・業種・行政処分歴・新規相談受付状況で検索できます。事業者への直接確認情報を順次反映しており、本人確認済みの機関には「掲載情報 運営確認済み」と確認日を表示しています。相談・掲載情報の確認修正はすべて無料です。

## 主要ページ

- [登録支援機関を検索](${SITE_URL}/search): 全国の登録支援機関を対応言語・地域・業種・処分歴で検索。親和性スコア順に表示
- [外国人雇用の準備度診断](${SITE_URL}/diagnose): 業種と地域を選ぶだけの無料診断。条件に合う登録支援機関も案内
- [一括相談](${SITE_URL}/consult): 条件に合う登録支援機関へ最大5社まで無料で一括相談
- [統計データ](${SITE_URL}/stats): 都道府県別の登録支援機関数・処分歴の統計
- [登録簿の更新情報](${SITE_URL}/updates): 出入国在留管理庁登録簿の週次更新（新規登録・抹消）

## 制度解説

- [育成就労制度とは](${SITE_URL}/guide/ikusei-shuro): 2027年4月1日施行。技能実習制度との違い・移行スケジュール
- [監理支援機関とは](${SITE_URL}/guide/kanri-shien-kikan): 育成就労制度で監理団体に代わる許可制の機関。施行日前申請は2026年4月15日から受付中
- [登録支援機関の選び方](${SITE_URL}/columns/shien-kikan-erabikata): 料金相場（月額平均約28,000円：入管庁調査）・確認すべき7項目
- [監理団体から監理支援機関への移行ガイド](${SITE_URL}/columns/kanri-dantai-ikou-guide): 2026年9月30日の監理団体新規許可申請期限までにやること
- [人材紹介会社と登録支援機関の違い](${SITE_URL}/columns/shokai-vs-shien): 別制度・別登録である理由と登録番号の確認方法

## 登録支援機関の方へ

- [自社情報の確認・修正（無料）](${SITE_URL}/for-organizations): 掲載情報の確認・修正は無料。確認済みの機関には確認日を表示

## データについて

- 出典: 出入国在留管理庁「登録支援機関登録簿」（週次で同期）
- 機関個別ページ: ${SITE_URL}/org/{id} 形式。JSON-LD（ProfessionalService・BreadcrumbList）を含む
- サイトマップ: ${SITE_URL}/sitemap.xml
- 運営確認済み情報: 運営が機関本人に確認した相談受付状況・希望する相談条件・対応言語を確認日つきで表示
- 親和性スコア: 分野40点・地域30点・言語20点・信頼性10点（処分歴なし5点＋実確認鮮度最大5点）。有料掲載の有無はスコアに影響しません
`;

export function registerLlmsTxtRoute(app: Express) {
  app.get("/llms.txt", (_req: Request, res: Response) => {
    res
      .status(200)
      .set({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      })
      .send(LLMS_TXT);
  });
}
