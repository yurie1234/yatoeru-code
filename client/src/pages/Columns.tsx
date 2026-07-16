import SiteLayout from "@/components/SiteLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, BookOpen, Rss } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

/**
 * コラム一覧ページ /columns
 * E-E-A-Tフォーマットの記事インデックス。すべて一次情報突合済み・内容確認基準日つき。
 */

const COLUMNS = [
  {
    slug: "shien-kikan-erabikata",
    title: "登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法",
    description:
      "委託料金の相場（月額平均約28,000円・約9割が3万円以下：入管庁調査）、契約前に確認すべき7項目、入管庁登録簿での登録番号の確認方法を解説。",
    baseDate: "2026年7月16日",
    tags: ["特定技能", "登録支援機関", "料金"],
  },
  {
    slug: "kanri-dantai-ikou-guide",
    title: "監理団体から監理支援機関への移行ガイド：2026年9月の期限までにやること",
    description:
      "監理団体の許可は監理支援機関に引き継がれません。施行日前申請（2026年4月15日〜受付中）と監理団体新規許可申請の期限（2026年9月30日）を踏まえた準備6ステップ。",
    baseDate: "2026年7月16日",
    tags: ["育成就労", "監理支援機関", "移行"],
  },
  {
    slug: "shokai-vs-shien",
    title: "人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由",
    description:
      "人材紹介（厚労省許可）と支援（入管庁登録）は別制度・別登録。「紹介はできるが支援はできない」会社に委託するリスクと、5分でできる登録確認の手順。",
    baseDate: "2026年7月16日",
    tags: ["特定技能", "登録確認", "リスク回避"],
  },
] as const;

const GUIDES = [
  {
    href: "/guide/ikusei-shuro",
    title: "育成就労制度ガイド（2027年4月1日施行）",
    description: "技能実習との違い・施行スケジュール・転籍ルール・特定技能への接続を一次情報ベースで解説。",
  },
  {
    href: "/guide/kanri-shien-kikan",
    title: "監理支援機関ガイド",
    description: "許可申請スケジュール・監理団体との比較・登録支援機関との関係を解説。",
  },
] as const;

export default function Columns() {
  useEffect(() => {
    document.title = "コラム一覧｜特定技能・育成就労の実務解説 - ヤトエル";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? "";
    meta?.setAttribute(
      "content",
      "登録支援機関の選び方・料金相場、監理支援機関への移行、人材紹介会社との違いなど、特定技能・育成就労の実務を一次情報（出入国在留管理庁・OTIT）と突合して解説するコラム一覧。"
    );
    return () => {
      document.title = "登録支援機関・監理支援機関を比較｜ヤトエル";
      meta?.setAttribute("content", prev);
    };
  }, []);

  return (
    <SiteLayout>
      <div className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-brand-foreground/60 mb-3">
            <Link href="/">
              <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
            </Link>
            <span>/</span>
            <span>コラム</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-amber-accent shrink-0" />
            コラム：特定技能・育成就労の実務解説
          </h1>
          <p className="text-brand-foreground/80 max-w-3xl leading-relaxed">
            すべての記事は出入国在留管理庁・外国人技能実習機構の一次情報と突合し、内容確認基準日を明記しています。制度の改正があった場合は基準日を更新します。
          </p>
          <a
            href="/rss.xml"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-amber-accent hover:underline"
          >
            <Rss className="h-4 w-4" />
            更新情報をRSSで受け取る
          </a>
        </div>
      </div>

      <div className="container py-10 max-w-4xl space-y-10">
        <section>
          <h2 className="text-xl font-bold mb-4">実務コラム</h2>
          <div className="space-y-4">
            {COLUMNS.map((c) => (
              <Link key={c.slug} href={`/columns/${c.slug}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        内容確認基準日：{c.baseDate}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-1.5 flex items-start gap-2">
                      {c.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      {c.description}
                    </p>
                    <span className="text-sm text-brand inline-flex items-center gap-1">
                      続きを読む
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">制度ガイド</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {GUIDES.map((g) => (
              <Link key={g.href} href={g.href}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-base mb-1.5">{g.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {g.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">データ更新情報</h2>
          <Link href="/updates">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <h3 className="font-bold text-base mb-1.5">登録支援機関 登録簿の更新情報</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  入管庁の登録支援機関登録簿の新規登録・抹消を週次で自動集計しています（基準日つき）。
                </p>
              </CardContent>
            </Card>
          </Link>
        </section>
      </div>
    </SiteLayout>
  );
}
