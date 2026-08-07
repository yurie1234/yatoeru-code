import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock, ListOrdered, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";

/**
 * コラム記事共通のUX強化コンポーネント群。
 *
 * - estimateReadingMinutes: Markdown本文から読了目安時間を計算（日本語 約500字/分）
 * - ReadingProgressBar: スクロール位置に応じてヘッダー直下に読み進めバーを表示
 * - FloatingToc: スマホ（md未満）専用の追従目次ボタン。タップで下からシートを開き節へ移動
 * - RelatedArticles: 同じタグの公開記事を最大3件、記事下部にカード表示
 *
 * 動的コラム（ColumnArticle.tsx）と静的コラム4本の両方から利用する。
 */

/** Markdown/プレーン本文から読了目安（分）を計算。日本語は約500字/分で概算 */
export function estimateReadingMinutes(text: string): number {
  const plain = text
    .replace(/```[\s\S]*?```/g, "") // コードブロック除去
    .replace(/\|/g, "") // 表の罫線
    .replace(/[#>*_`\-\[\]()!]/g, "") // Markdown記号
    .replace(/https?:\/\/\S+/g, "") // URL
    .replace(/\s+/g, "");
  return Math.max(1, Math.round(plain.length / 500));
}

/** 読了目安時間の表示バッジ */
export function ReadingTime({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      約{minutes}分で読めます
    </span>
  );
}

/**
 * 読み進めプログレスバー。
 * targetSelectorで指定した要素（記事本体）の読み進め率を、
 * sticky headerの直下（top-16）に琥珀色のバーで表示する。
 */
export function ReadingProgressBar({
  targetSelector = "article",
}: {
  targetSelector?: string;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.querySelector(targetSelector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // 記事先頭が画面上端に来た時点を0%、記事末尾が画面下端に来た時点を100%
      const total = rect.height - viewportH;
      const scrolled = -rect.top;
      const ratio = total > 0 ? scrolled / total : 1;
      setProgress(Math.min(1, Math.max(0, ratio)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetSelector]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-16 left-0 right-0 z-40 h-1 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export interface FloatingTocItem {
  id: string;
  label: string;
}

/**
 * スマホ専用フローティング目次。
 * 右下の追従ボタンをタップすると下からシートが開き、節をタップでスムーズスクロール。
 */
export function FloatingToc({ items }: { items: readonly FloatingTocItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length < 2) return null;

  const handleJump = (id: string) => {
    setOpen(false);
    // シートが閉じるアニメーションを待ってからスクロール
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 76;
        window.scrollTo({ top, behavior: "smooth" });
        history.replaceState(null, "", `#${id}`);
      }
    }, 200);
  };

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="目次を開く"
            className="fixed bottom-5 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-brand text-brand-foreground shadow-lg shadow-black/20 px-4 py-3 text-sm font-bold active:scale-95 transition-transform"
          >
            <ListOrdered className="h-4 w-4" />
            目次
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-1">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="h-4 w-4 text-brand" />
              目次
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="目次" className="px-4 pb-6">
            <ol className="space-y-1 list-none">
              {items.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleJump(s.id)}
                    className="w-full text-left flex items-baseline gap-2.5 py-2.5 px-2 rounded-lg text-[15px] leading-snug text-foreground/90 hover:bg-muted active:bg-muted transition-colors"
                  >
                    <span className="text-xs text-amber-600 font-mono font-bold shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** 静的コラム4本のメタ情報（関連記事カードにも出せるようにここで一元管理） */
const STATIC_COLUMNS = [
  {
    slug: "saiyou-cost-hikaku",
    title:
      "外国人採用のコストは高い？特定技能・育成就労と人材紹介・求人広告・派遣を徹底比較",
    description:
      "特定技能・育成就労の採用コストを1人あたり年間総額で人材紹介・求人広告・派遣と比較。助成金活用で実質負担を下げる方法も解説。",
    baseDate: "2026-07-17",
    tags: ["採用コスト", "特定技能", "比較"],
  },
  {
    slug: "shien-kikan-erabikata",
    title: "登録支援機関の選び方：料金相場・確認すべき7項目・登録番号の確認方法",
    description:
      "委託料金の相場（月額平均約28,000円：入管庁調査）、契約前に確認すべき7項目、登録簿での登録番号の確認方法を解説。",
    baseDate: "2026-07-16",
    tags: ["特定技能", "登録支援機関", "料金"],
  },
  {
    slug: "kanri-dantai-ikou-guide",
    title: "監理団体から監理支援機関への移行ガイド：2027年4月施行までの手続き一覧と申請期限（9月30日）",
    description:
      "監理団体の許可は監理支援機関に引き継がれません。施行日前申請と新規許可申請の期限を踏まえた準備6ステップ。",
    baseDate: "2026-07-16",
    tags: ["育成就労", "監理支援機関", "移行"],
  },
  {
    slug: "shokai-vs-shien",
    title: "人材紹介会社と登録支援機関の違い：委託前に登録番号を確認すべき理由",
    description:
      "人材紹介（厚労省許可）と支援（入管庁登録）は別制度・別登録。委託リスクと5分でできる登録確認の手順。",
    baseDate: "2026-07-16",
    tags: ["特定技能", "登録確認", "リスク回避"],
  },
] as ReadonlyArray<{
  slug: string;
  title: string;
  description: string;
  baseDate: string;
  tags: readonly string[];
}>;

/** "2026-07-17" → "2026年7月17日" */
function toJpDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

type RelatedCard = {
  slug: string;
  title: string;
  description: string;
  baseDate: string;
  tags: readonly string[];
  matchCount: number;
};

/**
 * 関連記事セクション。
 * DB記事（articles.related）と静的コラム4本の両方からタグ一致記事を集め、
 * 一致タグ数→新しい順で最大limit件をカード表示する。
 */
export function RelatedArticles({
  currentSlug,
  tags,
  limit = 3,
}: {
  currentSlug: string;
  tags: readonly string[];
  limit?: number;
}) {
  const tagsInput = useMemo(() => [...tags], [tags.join("|")]);
  const { data: dbRelated } = trpc.articles.related.useQuery(
    { excludeSlug: currentSlug, tags: tagsInput, limit: 6 },
    { enabled: tagsInput.length > 0, staleTime: 5 * 60 * 1000 }
  );

  const cards: RelatedCard[] = useMemo(() => {
    const tagSet = new Set(tagsInput);
    const countMatch = (ts: readonly string[]) =>
      ts.filter((t) => tagSet.has(t)).length;

    const fromStatic: RelatedCard[] = STATIC_COLUMNS.filter(
      (c) => c.slug !== currentSlug
    ).map((c) => ({ ...c, tags: c.tags, matchCount: countMatch(c.tags) }));

    const staticSlugs = new Set(STATIC_COLUMNS.map((c) => c.slug));
    const fromDb: RelatedCard[] = (dbRelated ?? [])
      .filter((a) => a.slug !== currentSlug && !staticSlugs.has(a.slug))
      .map((a) => ({
        slug: a.slug,
        title: a.title,
        description: a.description,
        baseDate: a.baseDate,
        tags: (a.tags ?? []) as string[],
        matchCount: countMatch((a.tags ?? []) as string[]),
      }));

    return [...fromStatic, ...fromDb]
      .sort(
        (x, y) =>
          y.matchCount - x.matchCount || y.baseDate.localeCompare(x.baseDate)
      )
      .filter((c, i, arr) => arr.findIndex((d) => d.slug === c.slug) === i)
      .filter((c) => c.matchCount > 0)
      .slice(0, limit);
  }, [dbRelated, tagsInput, currentSlug, limit]);

  if (cards.length === 0) return null;

  return (
    <section aria-label="関連記事" className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
        <Newspaper className="h-5 w-5 text-brand" />
        あわせて読みたい関連記事
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.slug} href={`/columns/${c.slug}`}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="p-4 flex flex-col h-full">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {c.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-bold text-[15px] leading-snug mb-1.5 line-clamp-3">
                  {c.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                  {c.description}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {toJpDate(c.baseDate)}
                  </span>
                  <span className="text-xs text-brand inline-flex items-center gap-1 font-medium">
                    読む
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
