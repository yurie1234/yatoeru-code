import { List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

/**
 * コラム記事共通：目次（TOC）＋パンくずリストの自動生成コンポーネント。
 *
 * - ArticleBreadcrumb: パンくずUI＋BreadcrumbList JSON-LDを自動挿入
 * - ArticleToc: セクション定義（id + label）からアンカーリンク付き目次を生成。
 *   スクロール位置に応じた現在地ハイライト（IntersectionObserver）付き。
 *
 * 使い方：記事側で sections 配列（h2見出しと同じ順序・id）を渡し、
 * 各 <section> / <h2> に対応する id を付与する。
 */

export interface TocSection {
  id: string;
  label: string;
}

/** パンくずリスト（UI＋BreadcrumbList JSON-LD） */
export function ArticleBreadcrumb({
  articleTitle,
  articlePath,
  shortTitle,
  hubPath = "/columns",
  hubLabel = "コラム",
}: {
  /** 記事の正式タイトル（JSON-LD用） */
  articleTitle: string;
  /** 記事の絶対パス（例: /columns/shien-kikan-erabikata） */
  articlePath: string;
  /** パンくず表示用の短いタイトル（省略時はarticleTitle） */
  shortTitle?: string;
  /** 中間階層のパス（デフォルト: /columns） */
  hubPath?: string;
  /** 中間階層の表示名（デフォルト: コラム） */
  hubLabel?: string;
}) {
  // BreadcrumbList JSON-LD（ホーム > ハブ > 記事）
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ホーム",
          item: "https://yatoeru.jp/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: hubLabel,
          item: `https://yatoeru.jp${hubPath}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: articleTitle,
          item: `https://yatoeru.jp${articlePath}`,
        },
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "breadcrumb-jsonld";
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById("breadcrumb-jsonld")?.remove();
    };
  }, [articleTitle, articlePath, hubPath, hubLabel]);

  return (
    <nav
      aria-label="パンくずリスト"
      className="flex flex-wrap items-center gap-2 text-sm text-brand-foreground/60 mb-3"
    >
      <Link href="/">
        <span className="hover:text-brand-foreground cursor-pointer">ホーム</span>
      </Link>
      <span aria-hidden="true">/</span>
      <Link href={hubPath}>
        <span className="hover:text-brand-foreground cursor-pointer">{hubLabel}</span>
      </Link>
      <span aria-hidden="true">/</span>
      <span className="text-brand-foreground/80" aria-current="page">
        {shortTitle ?? articleTitle}
      </span>
    </nav>
  );
}

/** 目次（h2セクションへのアンカーリンク＋現在地ハイライト） */
export function ArticleToc({ sections }: { sections: readonly TocSection[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 画面上部に近い可視セクションを現在地とする
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72; // ヘッダー分オフセット
      window.scrollTo({ top, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav
      aria-label="目次"
      className="rounded-lg border bg-muted/30 p-5"
    >
      <div className="flex items-center gap-2 font-bold mb-3">
        <List className="h-4 w-4 text-brand" />
        目次
      </div>
      <ol className="space-y-1.5 text-sm list-none">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => handleClick(e, s.id)}
              className={`flex items-baseline gap-2 py-0.5 transition-colors ${
                activeId === s.id
                  ? "text-brand font-semibold"
                  : "text-muted-foreground hover:text-brand"
              }`}
            >
              <span className="text-xs text-brand/60 font-mono shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
