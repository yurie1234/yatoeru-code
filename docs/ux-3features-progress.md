# コラムUX3機能実装 進捗メモ（2026-07-23）

## 完了
- server/routers/articles.ts に `articles.related` プロシージャ追加（excludeSlug/tags/limit、タグ一致優先＋新着埋め）
- client/src/components/ArticleExtras.tsx 新規作成：
  - estimateReadingMinutes（日本語500字/分）
  - ReadingTime（バッジ表示）
  - ReadingProgressBar（targetSelector指定、fixed top-16 z-40、琥珀グラデ）
  - FloatingToc（md:hidden、右下fixedボタン、Sheet side=bottom）
  - RelatedArticles（静的4本メタ STATIC_COLUMNS + trpc.articles.related、タグ一致数→新着順、最大3件、matchCount>0のみ）
- ColumnArticle.tsx（動的記事）：3機能組み込み済み。Streamdown h2にid付与（markdownComponents + nodeText + headingId）、目次カードもリンク化（-76pxオフセット）
- ColumnSaiyouCost.tsx：ReadingProgressBar(#article-main)/FloatingToc/約7分バッジ/RelatedArticles(tags: 採用コスト,特定技能,比較) 適用済み
- ColumnErabikata.tsx：同上適用済み（約7分、tags: 特定技能,登録支援機関,料金）
- ColumnIkouGuide.tsx：同上適用済み（約5分、tags: 育成就労,監理支援機関,移行）
- 中間チェックポイント e2b5a8fa 保存済み（動的記事分）

## 残作業
1. ColumnShokaiVsShien.tsx への適用（約6分、tags: 特定技能,登録確認,リスク回避、currentSlug: shokai-vs-shien）
   - パターン：import追加 → return直後にReadingProgressBar targetSelector="#article-main" + FloatingToc items={TOC_SECTIONS} → 出典Badgeの後に「約6分で読めます」Badge → container py-10のdivに id="article-main" → `<Card className="bg-brand text-brand-foreground">`（CTA）の直前にRelatedArticles
2. tsc --noEmit / pnpm test（vitest 61件パス基準）
3. スクリーンショット検証（/columns/gaikokujin-koyou-kanri-shishin-kaisei-2026、/columns/saiyou-cost-hikaku、モバイル375x812）
4. todo.md の4項目を[x]に更新
5. webdev_save_checkpoint → 自動公開 → 報告

## 検証結果（2026-07-23）
- tsc・vitest 63件全パス（articles.relatedのテスト2件追加済み）
- モバイルスクショット：右下に「目次」フローティングボタン表示確認済み（動的記事・静的記事とも）
- 動的記事に「約9分で読めます」バッジ表示確認済み
- 静的記事（shokai-vs-shien等）に「あわせて読みたい関連記事」カード表示確認済み（動的記事カードも混在して表示される）
- articles.related APIは200で正常応答（育成就労タグで動的記事1件ヒット）
- 動的記事の末尾にも「あわせて読みたい」セクションあり（フルページSSでCTAカード直前に確認）

## 残作業（更新）
1. todo.mdの4項目を[x]に更新
2. webdev_save_checkpoint（自動公開）→ 報告

## 読了時間計測結果（日本語文字数/500字分）
- ColumnErabikata: 3561字 → 約7分
- ColumnIkouGuide: 2660字 → 約5分
- ColumnShokaiVsShien: 2910字 → 約6分
- ColumnSaiyouCost: 3395字 → 約7分

## 静的コラムslug/タグ（Columns.tsxと同一）
- saiyou-cost-hikaku: 採用コスト/特定技能/比較
- shien-kikan-erabikata: 特定技能/登録支援機関/料金
- kanri-dantai-ikou-guide: 育成就労/監理支援機関/移行
- shokai-vs-shien: 特定技能/登録確認/リスク回避
- 動的記事: gaikokujin-koyou-kanri-shishin-kaisei-2026（タグ：外国人雇用/雇用管理指針/育成就労/在留カード/法改正）→ 静的4本とタグ一致が無い可能性あり（RelatedArticlesはmatchCount>0のみ表示のため、関連ゼロなら非表示になる仕様）
