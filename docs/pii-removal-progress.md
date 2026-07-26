# 個人情報削除タスク 調査メモ（2026-07-26）

## ユーザー依頼
サイトから運営者の氏名・住所・メールアドレス等の個人情報を削除する。

## これまでの調査結果（コード検索）
- 個人名・住所（〒付き番地等）の直書きはこれまでの検索では未検出
- メールアドレス：`client/src/pages/ForOrganizations.tsx:90` に `mailto:info@yatoeru.jp?subject=...` → これはサービス用アドレスであり個人情報ではない可能性が高いが要確認
- 運営者表記：
  - `client/src/components/SiteLayout.tsx:93` フッター「運営会社（Tenbou Works）」外部リンク（tenbouworks.jp）
  - `client/src/pages/Home.tsx:387` 同様
  - `client/src/pages/StaticPages.tsx:51-54` About「運営会社：Tenbou Works（tenbouworks.jp）へのリンク」
  - `client/src/pages/StaticPages.tsx:162` 中立性ポリシー「制定日：2026年7月18日　運営：Tenbou Works」
- StaticPages.tsx（About/Terms/Privacy/NeutralityPolicy）には個人名・住所・電話番号の記載なし

## 未確認・要検索箇所
- OWNER_NAME env の表示利用（検索済み：client/serverでヒットなし）
- index.htmlのJSON-LD・メタタグに author/publisher で個人名がないか
- server側（提案書生成プロンプト・メール送信等）に個人情報がないか
- sitemap/robots/README/todo.md等（公開されないファイルは対象外）
- Pricing.tsx（特商法系記載）、ForOrganizations.tsx全体
- 電話番号パターン（0\d{1,4}-\d{1,4}-\d{3,4}）の全検索
- 「ヤトエル運営チーム」表記は個人名でないためOK

## 調査完了（2026-07-26）
- 個人名・個人住所・電話番号・個人メールアドレスの直書きは、コード全体・index.html・SSR/JSON-LD・DB記事（1件、bodyMd/keyPoints/description検査済み）ともに検出されず
- 検出された関連情報：(1) info@yatoeru.jp（ForOrganizations.tsxのmailto、サービス用）(2) Tenbou Works表記＋tenbouworks.jpリンク（SiteLayoutフッター2箇所・Home 1箇所・About 1箇所・NeutralityPolicy 1箇所）
- tenbouworks.jp本体を確認：ミッション・サービス・バリューのみで氏名・住所・連絡先の掲載なし
- JSON-LD authorは「ヤトエル運営チーム」（Organization型）で個人名なし

## 方針
- 個人名・個人住所・個人メール・電話番号があれば削除または「お問い合わせフォーム」誘導に置換
- Tenbou Works（屋号・会社名）の扱いはユーザー確認が必要かもしれないが、ユーザーの依頼は「私の名前・住所・アドレス」なので、個人を特定できる情報が対象。tenbouworks.jpリンク先に個人情報がある場合、リンク自体の削除も検討・提案
