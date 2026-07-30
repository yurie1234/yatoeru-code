# 監理支援機関（育成就労）セクション＋分野特化ページ実装計画（2026-07-30）

ユーザー指示：P0もP1も今すぐ実装。Manus版指示書（pasted_content_2.txt）を実行しつつ、Claude改訂版（メッセージ本文）を正とする。

## 重要ファクト（検証済み・このまま使用）
- 育成就労制度 施行: 2027年4月1日。監理支援機関の許可証交付はこれ以降
- 監理支援機関の許可申請（施行日前申請）: 2026年4月15日受付開始済み
- 育成就労計画認定の施行日前申請: 2026年9月1日開始（最初の照準日・受付開始当日更新記事を予定）
- 監理団体は自動移行なし・全機関が新規許可。外部監査人（行政書士・社労士等）設置義務化
- 登録支援機関 登録簿: 11,494件（2026-07-28現在・法務省）／監理団体: 約3,750団体（OTIT）
- 新4分野（自動車運送・鉄道・林業・木材産業）は2024年3月閣議決定で特定技能に追加。自動車運送は5年24,500人見込み
- 自動車運送の競合: orgonir.comの4選記事あり（薄いコラム）→「空白が埋まり始めた＝今週やる」
- 鉄道の競合: orgonir.com「3選」（2026年5月）先行1件 → P1でDB連動品質差別化
- 出典: 入管庁 育成就労Q&A https://www.moj.go.jp/isa/applications/faq/ikusei_qa_00002.html / JITCO https://www.jitco.or.jp/esd/ / 法務省登録簿 https://www.moj.go.jp/isa/applications/ssw/nyuukokukanri07_00205.html

## Claude改訂版の変更点（正とする）
1. 一覧ページ冒頭で「（監理支援機関の）許可一覧はまだ存在しない」と正直に宣言（E-E-A-T）
2. トラッカーのステータスは全監理団体アンケート＋電話ヒアリングで作る独自データ（アンケート回答=温まった営業リード）
3. マネタイズ: 既存登録支援機関掲載との両制度セットプラン＋外部監査人（行政書士・社労士）紹介枠
4. 実績確認バッジ: メール/電話の一次確認ができた機関のみ・確認日表示
5. 2026年9月1日「受付開始」当日更新記事をスケジュールに組む
6. KPI: アンケート回答50件/90日・セット掲載転換5件・掲載問い合わせ5件・関連クエリ表示1日500件

## P0（今すぐ）
1. ハブ5ページ: /ikusei-shuro/（TOP）、/ikusei-shuro/kanri-shien-kikan/（とは・要件・違い）、/ikusei-shuro/kanri-shien-kikan/list/（一覧DB・トラッカー）、/ikusei-shuro/schedule/、/ikusei-shuro/checklist/
2. 一覧DB・トラッカー: OTIT監理団体一覧（Excel）取込→kanri_dantai テーブル（許可番号・法人名・所在地・許可区分一般/特定・取扱職種・受入国）＋移行ステータス列（未確認/申請準備中/申請中/許可取得/移行しない）。更新日明記。冒頭で「公的な許可一覧はまだない」宣言
3. 分野特化3ページ: /bunya/jidosha-unso/ /bunya/ringyo/ /bunya/mokuzai/ — 4ブロック（制度解説・対応機関一覧DB連動・選び方・費用相場）各5,000字相当
4. アンケート発送準備（サイト側はトラッカー掲載インセンティブの説明ページ＋機関向け回答フォーム）

## P1（今すぐビルド・順次公開）
1. 鉄道ページ /bunya/tetsudo/
2. 都道府県ページ /area/:pref 展開順: 愛知→大阪→東京→埼玉→千葉→神奈川→福岡→北海道→広島→静岡。固有コンテンツ800字以上の県のみindex、それ未満はnoindex。県×分野の機械生成は禁止

## スコープ外
送り出し機関DB・全面リニューアル・47都道府県×分野の機械生成

## 既存資産
- 既存ルート: /guide/ikusei-shuro, /guide/ikusei-shuro-cost, /guide/ikusei-shuro-schedule, /guide/ginou-jisshu-chigai, /guide/tokutei-ginou-ikou, /guide/kanri-shien-kikan（育成就労ガイド既存6ページあり→ハブは既存を活かしつつ新URL体系で構築 or リンク統合）
- /region/:prefecture（既存の県ページあり！）・/field/:field（既存の分野ページあり）→ /area・/bunya は既存と競合しないよう注意。**既存Region/Fieldページとの関係を設計で決める**
- supportOrgsテーブル 11,448件、scripts/gen-sitemap.mjs、SSR prefetch機構（client/src/ssr/prefetch.ts）、verify-ssr.sh
- 実装キット（README.md/otit_kanri_dantai.py/yatoeru_outreach.py/bunya_pages.py/area_pages.py/content/p0-1〜p0-8等）はサンドボックスに**存在しない**→自前実装が必要

## 設計判断（実装時）
- 監理団体データ: OTITの許可一覧Excel（https://www.otit.go.jp/search_kanri/ 等）をダウンロードして取込。取得不可ならスクリプト＋手動DL手順を用意
- 既存 /field/:field と新 /bunya/ の役割分担: /bunya/は固有5000字の編集コンテンツ＋DB連動（リッチページ）、/field/はDBフィルタ（既存維持）で /bunya/ からリンク
- 既存 /region/ と新 /area/ も同様の関係
