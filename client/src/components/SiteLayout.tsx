import { Button } from "@/components/ui/button";
import { Globe2, Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

/**
 * 公開ページ共通レイアウト（ヘッダー＋フッター）
 * 管理画面（/admin）はDashboardLayoutを使用するためこのレイアウトは使わない
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Globe2 className="h-6 w-6 text-brand" />
            <span className="text-xl font-bold tracking-tight text-foreground">ヤトエル</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">支援機関を探す</Link>
            <Link href="/diagnose" className="text-muted-foreground hover:text-foreground transition-colors">支援機関マッチ診断</Link>
            <Link href="/stats" className="text-muted-foreground hover:text-foreground transition-colors">統計データ</Link>
            <Link href="/updates" className="text-muted-foreground hover:text-foreground transition-colors">登録簿更新情報</Link>
            <Link href="/columns" className="text-muted-foreground hover:text-foreground transition-colors">コラム</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button className="hidden sm:flex" onClick={() => setLocation("/diagnose")}>
              無料診断
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="メニュー">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container py-4 flex flex-col gap-3 text-sm font-medium">
              <Link href="/search" onClick={() => setMobileOpen(false)} className="py-2">支援機関を探す</Link>
              <Link href="/diagnose" onClick={() => setMobileOpen(false)} className="py-2">支援機関マッチ診断</Link>
              <Link href="/stats" onClick={() => setMobileOpen(false)} className="py-2">統計データ</Link>
              <Link href="/updates" onClick={() => setMobileOpen(false)} className="py-2">登録簿更新情報</Link>
              <Link href="/columns" onClick={() => setMobileOpen(false)} className="py-2">コラム</Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-brand text-brand-foreground py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 className="h-6 w-6 text-amber-accent" />
                <span className="text-xl font-bold tracking-tight">ヤトエル</span>
              </div>
              <p className="text-brand-foreground/70 max-w-sm">
                特定技能・育成就労の支援機関データベース。<br />
                条件が一致する理由を明示して候補を表示する比較プラットフォームです。
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">サービス</h3>
              <ul className="space-y-2 text-brand-foreground/70">
                <li><Link href="/search" className="hover:text-amber-accent transition-colors">支援機関を探す</Link></li>
                <li><Link href="/diagnose" className="hover:text-amber-accent transition-colors">支援機関マッチ診断</Link></li>
                <li><Link href="/stats" className="hover:text-amber-accent transition-colors">統計データ</Link></li>
                <li><Link href="/updates" className="hover:text-amber-accent transition-colors">登録簿更新情報</Link></li>
                <li><Link href="/guide/ikusei-shuro" className="hover:text-amber-accent transition-colors">育成就労制度ガイド</Link></li>
                <li><Link href="/guide/kanri-shien-kikan" className="hover:text-amber-accent transition-colors">監理支援機関とは</Link></li>
                <li><Link href="/columns" className="hover:text-amber-accent transition-colors">コラム（実務解説）</Link></li>
                <li><a href="/rss.xml" className="hover:text-amber-accent transition-colors">RSSフィード</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">地域から探す</h3>
              <ul className="space-y-2 text-brand-foreground/70">
                <li><Link href="/region/東京都" className="hover:text-amber-accent transition-colors">東京都の支援機関</Link></li>
                <li><Link href="/region/愛知県" className="hover:text-amber-accent transition-colors">愛知県の支援機関</Link></li>
                <li><Link href="/region/大阪府" className="hover:text-amber-accent transition-colors">大阪府の支援機関</Link></li>
                <li><Link href="/field/介護" className="hover:text-amber-accent transition-colors">介護分野の支援機関</Link></li>
              </ul>
              <h3 className="font-bold mb-4 mt-8">運営</h3>
              <ul className="space-y-2 text-brand-foreground/70">
                <li><Link href="/about" className="hover:text-amber-accent transition-colors">ヤトエルについて</Link></li>
                <li>
                  <a href="https://tenbouworks.jp/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-accent transition-colors">
                    運営会社（Tenbou Works）
                  </a>
                </li>
                <li><Link href="/for-organizations" className="hover:text-amber-accent transition-colors">支援機関の方へ</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-brand-foreground/20 pt-8 text-center text-brand-foreground/50 text-sm">
            &copy; {new Date().getFullYear()} ヤトエル / 運営：<a href="https://tenbouworks.jp/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-accent transition-colors underline underline-offset-2">Tenbou Works</a> All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
