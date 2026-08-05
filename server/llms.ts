import type { Express, Request, Response } from "express";
import { articles } from "../drizzle/schema";
import { getDb } from "./db";
import { ALL_BUNYA_PAGES } from "../shared/bunya";

/**
 * /llms.txt — AIクローラー・LLM向けのサイト概要（llmstxt.org準拠）
 * 公開情報のみを記載すること（内部メモ等は絶対に含めない）。
 */
const SITE_URL = "https://yatoeru.jp";

const LLMS_TXT = `# ヤトエル（Yatoeru）

> 特定技能の登録支援機関を比較できるデータベース。育成就労・監理支援機関の制度移行情報にも対応（監理支援機関は2027年4月1日の制度施行に向けて許可申請を受付中の段階です）。出入国在留管理庁の公開登録簿（一次情報）を基に掲載し、対応言語・地域・業種・行政処分歴・新規相談受付状況で検索できます。事業者への直接確認情報を順次反映しており、事業者への確認が取れた機関には「掲載情報 運営確認済み」と確認日を表示しています。相談・掲載情報の確認修正はすべて無料です。

## 主要ページ

- [登録支援機関を検索](${SITE_URL}/search): 全国の登録支援機関を対応言語・地域・業種・処分歴で検索。親和性スコア順に表示
- [外国人採用の費用・助成金・支援機関の無料診断](${SITE_URL}/diagnose): 会社名またはURLを入力するとAIが業種・地域を読み取り、6問の質問で概算費用・助成金候補・適合機関を提示
- [一括相談](${SITE_URL}/consult): 条件に合う受付可能な登録支援機関へ無料で一括相談（候補数により最大5社）
- [統計データ](${SITE_URL}/stats): 都道府県別の登録支援機関数・処分歴の統計
- [登録簿の更新情報](${SITE_URL}/updates): 出入国在留管理庁登録簿の週次更新（新規登録・抹消）

## 助成金ガイド（一次情報リンク・最終確認日付き）

- [外国人雇用で使える助成金ガイド](${SITE_URL}/joseikin): 受け取れる可能性のある助成金の全体像と申請の流れ
- [人材確保等支援助成金（外国人労働者就労環境整備助成コース）](${SITE_URL}/joseikin/jinzai-kakuho)
- [業務改善助成金](${SITE_URL}/joseikin/gyomu-kaizen)
- [キャリアアップ助成金](${SITE_URL}/joseikin/career-up)
- [トライアル雇用助成金](${SITE_URL}/joseikin/trial-koyou)
- [人材開発支援助成金](${SITE_URL}/joseikin/jinzai-kaihatsu)

## 育成就労制度ハブ（2027年4月1日施行）

- [育成就労制度まとめ](${SITE_URL}/ikusei-shuro): 監理支援機関の移行状況・スケジュール・受入企業の準備の入口
- [監理団体の移行状況トラッカー](${SITE_URL}/ikusei-shuro/kanri-shien-kikan/list): 全国3,733団体の監理支援機関への移行状況を独自調査・毎月更新（公的な許可済み一覧はまだ存在しない）
- [施行スケジュール完全ガイド](${SITE_URL}/ikusei-shuro/schedule): 2026年9月1日に育成就労計画の認定申請受付開始
- [受入企業の準備チェックリスト10項目](${SITE_URL}/ikusei-shuro/checklist)
- [監理団体向け：移行状況の情報提供（無料掲載）](${SITE_URL}/ikusei-shuro/for-kanri-dantai)

## 分野特化ガイド（特定技能全19分野）

${ALL_BUNYA_PAGES.map((p) => `- [特定技能「${p.field}」対応の登録支援機関一覧と受入ガイド](${SITE_URL}/bunya/${p.slug})`).join("\n")}

## 都道府県別受入ガイド（特定技能在留者数上位10県・固有コンテンツ付き）

- [愛知県](${SITE_URL}/area/aichi): 全国1位・自動車産業中心・支援機関1,121社
- [大阪府](${SITE_URL}/area/osaka): 全国2位・外食・製造・支援機関1,014社
- [東京都](${SITE_URL}/area/tokyo): 全国3位・支援機関2,326社（全国最多）
- [埼玉県](${SITE_URL}/area/saitama): 全国4位・食品製造・物流
- [千葉県](${SITE_URL}/area/chiba): 全国5位・農業・航空
- [神奈川県](${SITE_URL}/area/kanagawa): 全国6位・京浜工業地帯
- [福岡県](${SITE_URL}/area/fukuoka): 全国7位・九州最大
- [北海道](${SITE_URL}/area/hokkaido): 全国8位・農業・漁業・水産加工
- [広島県](${SITE_URL}/area/hiroshima): 全国9位・造船・自動車
- [静岡県](${SITE_URL}/area/shizuoka): 全国10位・輸送用機器

## 制度解説

- [育成就労制度とは](${SITE_URL}/guide/ikusei-shuro): 2027年4月1日施行。技能実習制度との違い・移行スケジュール
- [技能実習／育成就労から特定技能への移行ガイド](${SITE_URL}/guide/tokutei-ginou-ikou)
- [育成就労制度の費用ガイド](${SITE_URL}/guide/ikusei-shuro-cost)
- [育成就労施行までの準備スケジュール](${SITE_URL}/guide/ikusei-shuro-schedule)
- [育成就労と技能実習の違い](${SITE_URL}/guide/ginou-jisshu-chigai)
- [監理支援機関とは](${SITE_URL}/guide/kanri-shien-kikan): 育成就労制度で監理団体に代わる許可制の機関。施行日前申請は2026年4月15日から受付中
- [登録支援機関の選び方](${SITE_URL}/columns/shien-kikan-erabikata): 料金相場（月額平均約28,000円：入管庁調査）・確認すべき7項目
- [外国人採用のコスト比較：特定技能・育成就労 vs 人材紹介・求人広告・派遣](${SITE_URL}/columns/saiyou-cost-hikaku)
- [監理団体から監理支援機関への移行ガイド](${SITE_URL}/columns/kanri-dantai-ikou-guide): 2026年9月30日の監理団体新規許可申請期限までにやること
- [人材紹介会社と登録支援機関の違い](${SITE_URL}/columns/shokai-vs-shien): 別制度・別登録である理由と登録番号の確認方法

## 登録支援機関の方へ

- [自社情報の確認・修正（無料）](${SITE_URL}/for-organizations): 掲載情報の確認・修正は無料。確認済みの機関には確認日を表示

## データについて

- 出典: 出入国在留管理庁「登録支援機関登録簿」（週次で同期）
- 機関個別ページ: ${SITE_URL}/org/{id} 形式（正本URL）。JSON-LD（ProfessionalService・BreadcrumbList）を含む
- **登録番号からURLを組み立てられます**: 登録番号「22登-007304」の機関は
  ${SITE_URL}/org/22to-007304 で開けます（「登」を to に置き換えるだけ。ほかは変えない）。
  正本URL ${SITE_URL}/org/{id} へ301で転送します。{id} は内部の連番で登録簿には現れないため、
  登録番号しか手元に無い場合はこちらを使ってください
- サイトマップ: ${SITE_URL}/sitemap.xml
- 運営確認済み情報: 運営が事業者に直接確認した相談受付状況・希望する相談条件・対応言語を確認日つきで表示
- 親和性スコア: 分野40点・地域30点・言語20点・信頼性10点（処分歴なし5点＋実確認鮮度最大5点）。有料掲載の有無はスコアに影響しません

## 運営方針

- [中立性ポリシー](${SITE_URL}/neutrality-policy): 掲載料による順位優遇は一切行わないこと、並び順ロジックの公開基準
- サービス範囲: ヤトエルは情報提供・比較プラットフォームであり、職業紹介事業（有料職業紹介）は行いません。在留資格の可否判断も行いません
- [ヤトエルについて](${SITE_URL}/about) / [プライバシーポリシー](${SITE_URL}/privacy) / [利用規約](${SITE_URL}/terms)
`;

// DB記事を含めたllms.txtの10分キャッシュ
let llmsCache: { text: string; at: number } | null = null;
const LLMS_CACHE_MS = 10 * 60 * 1000;

/** DB保存の動的コラム記事を「制度解説」セクション末尾に追記する */
async function buildLlmsTxt(): Promise<string> {
  if (llmsCache && Date.now() - llmsCache.at < LLMS_CACHE_MS) {
    return llmsCache.text;
  }
  let text = LLMS_TXT;
  try {
    const db = await getDb();
    if (db) {
      const rows = await db
        .select({ slug: articles.slug, title: articles.title })
        .from(articles);
      if (rows.length > 0) {
        const lines = rows
          .map((a) => `- [${a.title}](${SITE_URL}/columns/${a.slug})`)
          .join("\n");
        text = text.replace(
          "\n## 登録支援機関の方へ",
          `${lines}\n\n## 登録支援機関の方へ`
        );
      }
    }
  } catch (e) {
    console.error("[llms.txt] failed to append db articles:", e);
  }
  llmsCache = { text, at: Date.now() };
  return text;
}

export function registerLlmsTxtRoute(app: Express) {
  app.get("/llms.txt", async (_req: Request, res: Response) => {
    res
      .status(200)
      .set({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      })
      .send(await buildLlmsTxt());
  });
}
