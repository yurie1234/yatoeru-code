#!/usr/bin/env bash
# SSR crawler verification.
#
# COPY THIS SCRIPT INTO THE PROJECT (scripts/verify-ssr.sh) and edit the route
# table at the bottom THERE — never edit the bundled skill copy.
#
# Fetches key routes with crawler User-Agents and asserts, on the raw HTML
# (no JS executed):
#   - HTTP status 200
#   - the content needle appears in the SERVER-RENDERED BODY — the slice inside
#     <div id="root"> with the dehydrated-state script stripped, so a needle can
#     never false-pass by matching <title>/og: tags or the __RQ_STATE__ JSON
#   - exactly one <title> in <head> (a leftover static title = two titles),
#     containing the expected substring; exactly one og:title and (when
#     required) one canonical — scrapers take the FIRST title/og:title, and
#     duplicated canonicals make Google ignore ALL canonical hints
#   - the og:title VALUE contains the expected title substring
#   - twitter:card present; canonical + og:url present (see REQUIRE_CANONICAL)
#   - NO robots-noindex meta on rows not flagged "noindex" — a public page
#     accidentally shipping noindex is the worst silent SEO fault
#   - routes flagged "state": dehydrated state exists AND holds >=1 query
#   - routes flagged "ogimage": og:image present with an ABSOLUTE http(s) URL
# And for bogus URLs: real HTTP 404 + noindex robots meta + no unreplaced
# <!--app-html-->/<!--app-head--> placeholder. check_301 rows assert the
# conversion's redirect layer (/index.html -> /, trailing slashes, legacy
# routes). Exits non-zero if ANY assertion fails — safe for CI.
#
# NOTE: the head-tag greps assume composeHtml/buildHeadTags' serialization
# (one tag per line, double-quoted attributes, property= before content= —
# playbook §6). A valid but different serialization false-FAILS (never
# false-passes): a red "title"/"og:title" row on a tag that is visibly present
# means nonstandard serialization, not a missing tag. Exception: the
# robots-meta grep is serialization-tolerant (case/quotes/attribute order),
# but a robots TAG split across multiple lines escapes the unexpected-noindex
# inverse check — the one false-PASS window; keep that tag on one line.
#
# Usage:
#   BASE=http://localhost:4101 bash scripts/verify-ssr.sh
#   FULL_UA_MATRIX=1   test all UAs (default: Googlebot + facebookexternalhit —
#                      the SSR path never branches on UA, so more UAs mostly
#                      add runtime, not signal)
#   REQUIRE_CANONICAL=0  skip canonical/og:url checks (only when
#                      CANONICAL_ORIGIN is intentionally unset in this env).
#                      NOTE: "ogimage" rows also depend on CANONICAL_ORIGIN —
#                      relative storage images (/manus-storage/...) are only
#                      absolutized, and thus emitted, when it is set. For local
#                      runs prefer CANONICAL_ORIGIN=$BASE on the server process;
#                      otherwise expect ogimage rows to fail.
set -u
BASE="${BASE:-http://localhost:4101}"
BASE="${BASE%/}" # tolerate a trailing slash — "$BASE$url" must not double the "/"
PASS=0; FAIL=0; CONTENT=0 # CONTENT counts check() rows — check_404/check_301 alone must not satisfy the "checks ran" guard

UAS=(
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
)
if [ "${FULL_UA_MATRIX:-0}" = "1" ]; then
  UAS+=(
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
    "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
    "Twitterbot/1.0"
    "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)"
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49"
    "Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)"
    "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)"
  )
fi

# React (body text) and buildHeadTags' escapeHtml (head values) entity-encode
# & < > " ' — so a needle like "Smith & Jones" or "We're" would NEVER match the
# raw HTML. Decode those five entities before comparing; needles are written as
# the text a reader SEES. (&amp; must decode LAST or &amp;lt; double-decodes.)
decode_entities() {
  sed -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/&quot;/"/g' \
      -e "s/&#x27;/'/g" -e "s/&#39;/'/g" -e 's/&amp;/\&/g'
}

# fetch <url> <ua> — sets CODE and HTML; returns 1 on curl transport failure.
fetch() {
  local resp
  if ! resp="$(curl -s --compressed --max-time 15 --connect-timeout 5 "$BASE$1" -A "$2" -w '__HTTP__%{http_code}')"; then
    CODE=""; HTML=""; return 1
  fi
  CODE="${resp##*__HTTP__}"
  HTML="${resp%__HTTP__*}"
}

# check <url> <body_needle> <title_substring> [flags] [canon_substring]
#   flags: comma-separated — "state" (route prefetches data; assert non-empty
#   dehydrated state), "ogimage" (detail route with a share image; assert an
#   ABSOLUTE og:image URL), "nocanon" (route intentionally sets no canonicalPath),
#   "noindex" (auth-gated / cart / internal-search rows: assert the robots
#   noindex meta on the 200 response — the gated-route contract).
#   canon_substring: if set, the canonical href VALUE must contain it — use on
#   paginated rows ("page=2") to catch canonical collapsing back to page 1.
#   body_needle MUST be text that appears ONLY in the rendered body — never in
#   the title or meta description — or this check cannot catch a body that
#   failed to render.
check() {
  local url="$1" needle="$2" title="$3" flags="${4:-}" canon_expect="${5:-}"
  local ua ok why body head_part tcount tval ogt canon ogtcount ccount f nl
  CONTENT=$((CONTENT+1))
  # Row-authoring validation — a silently skipped assertion is a false pass:
  # an unknown flag (typo, off-by-one arg, space after the comma) would skip
  # the row's strongest checks; an empty needle/title matches ANYTHING; an
  # embedded newline makes grep -F match EITHER line.
  flags="$(printf '%s' "$flags" | tr -d ' ')"
  for f in $(printf '%s' "$flags" | tr ',' ' '); do
    case "$f" in
      state|ogimage|nocanon|noindex) ;;
      *) echo "verify-ssr: unknown flag '$f' in row $url (flags are arg 4, canonical substring is arg 5)"; exit 2;;
    esac
  done
  nl=$'\n'
  case "$needle" in ""|*"$nl"*) echo "verify-ssr: empty or multi-line needle for row $url"; exit 2;; esac
  case "$title" in ""|*"$nl"*) echo "verify-ssr: empty or multi-line title for row $url"; exit 2;; esac
  for ua in "${UAS[@]}"; do
    if ! fetch "$url" "$ua"; then
      FAIL=$((FAIL+1)); printf "  [FAIL] %-28s ua=%.20s curl-error\n" "$url" "$ua"; continue
    fi
    ok=1; why=""
    [ "$CODE" = "200" ] || { ok=0; why=" status=$CODE"; }
    # Body slice: content inside #root, with the state script (and everything
    # after it) cut off, so the needle can only match server-rendered body HTML.
    # PERF: containment + slicing use grep/awk, NOT bash case-globs/parameter
    # expansion — bash 3.2 glob matching is ~16s PER CHECK on the template's
    # ~370KB prod HTML (inline manus-runtime script), turning a 14-row table
    # into an 8-minute run; the awk slice is ~2000x faster with identical cuts.
    if printf '%s' "$HTML" | grep -qF '<div id="root"></div>'; then
      ok=0; why="$why empty-root"
    fi
    if printf '%s' "$HTML" | grep -qF '<div id="root">'; then
      # Cut from after the first <div id="root"> to before the first
      # window.__RQ_STATE__ — the marker itself, NOT a literal "<script>"
      # prefix: an attribute on the state script (CSP nonce, id) would silently
      # disable a tag-anchored strip and needles would false-pass against the
      # state JSON. React does NOT escape the marker (none of & < > " ' in it),
      # so a page whose BODY literally discusses window.__RQ_STATE__ truncates
      # the slice at that mention — needles after it false-FAIL (never
      # false-pass; the slice only shrinks). Pick earlier needles there.
      body="$(printf '%s' "$HTML" | awk '
        !inb { i = index($0, "<div id=\"root\">"); if (!i) next; inb = 1; $0 = substr($0, i + 15) }
        { j = index($0, "window.__RQ_STATE__"); if (j) { printf "%s", substr($0, 1, j - 1); exit } print }
      ')"
      # Loud degradation if the strip anchor ever stops matching (e.g. the
      # assignment is renamed) — never let the slice silently keep the JSON.
      if printf '%s' "$body" | grep -qF '__RQ_STATE__'; then
        ok=0; why="$why state-script-in-body-slice"
      fi
    else
      ok=0; why="$why no-root"; body=""
    fi
    printf '%s' "$body" | decode_entities | grep -qF -- "$needle" || { ok=0; why="$why content"; }
    # Head checks: exactly one <title>, and its TEXT contains the expected
    # substring (fixed-string matched — regex metacharacters are inert).
    head_part="${HTML%%</head>*}"
    tcount="$(printf '%s' "$head_part" | grep -o '<title>' | wc -l | tr -d ' ')"
    [ "$tcount" = "1" ] || { ok=0; why="$why title-count=$tcount"; }
    tval="$(printf '%s' "$head_part" | sed -n 's#.*<title>\([^<]*\)</title>.*#\1#p' | decode_entities)"
    printf '%s' "$tval" | grep -qF -- "$title" || { ok=0; why="$why title"; }
    # Exactly one og:title (a leftover static og:title = two, and scrapers take
    # the FIRST — head-scoped so state JSON can't inflate the count).
    ogtcount="$(printf '%s' "$head_part" | grep -o 'property="og:title"' | wc -l | tr -d ' ')"
    [ "$ogtcount" = "1" ] || { ok=0; why="$why og:title-count=$ogtcount"; }
    ogt="$(printf '%s' "$HTML" | sed -n 's#.*property="og:title" content="\([^"]*\)".*#\1#p' | decode_entities)"
    printf '%s' "$ogt" | grep -qF -- "$title" || { ok=0; why="$why og:title"; }
    printf '%s' "$HTML" | grep -qF 'property="og:description"' || { ok=0; why="$why og:description"; }
    printf '%s' "$HTML" | grep -qF 'name="twitter:card"' || { ok=0; why="$why twitter:card"; }
    if [ "${REQUIRE_CANONICAL:-1}" = "1" ] && [[ ",$flags," != *",nocanon,"* ]]; then
      printf '%s' "$HTML" | grep -qF 'rel="canonical"' || { ok=0; why="$why canonical"; }
      printf '%s' "$HTML" | grep -qF 'property="og:url"' || { ok=0; why="$why og:url"; }
      # Exactly one canonical (duplicates make Google ignore ALL canonical
      # hints — a leftover static one, usually pointing at "/", silently
      # equals shipping no canonical at all).
      ccount="$(printf '%s' "$head_part" | grep -o 'rel="canonical"' | wc -l | tr -d ' ')"
      [ "$ccount" = "1" ] || { ok=0; why="$why canonical-count=$ccount"; }
      if [ -n "$canon_expect" ]; then
        canon="$(printf '%s' "$HTML" | sed -n 's#.*rel="canonical" href="\([^"]*\)".*#\1#p' | decode_entities)"
        printf '%s' "$canon" | grep -qF -- "$canon_expect" || { ok=0; why="$why canonical-value"; }
      fi
    fi
    if [[ ",$flags," == *",state,"* ]]; then
      printf '%s' "$HTML" | grep -qF '__RQ_STATE__' || { ok=0; why="$why state-missing"; }
      # superjson.serialize keeps the plain JSON shape, so >=1 dehydrated query
      # always serializes as `"queries":[{` — an empty state has `"queries":[]`.
      printf '%s' "$HTML" | grep -q '"queries":\[{' || { ok=0; why="$why state-empty"; }
    fi
    if [[ ",$flags," == *",ogimage,"* ]]; then
      # scrapers ignore relative og:image — the URL must be absolute
      printf '%s' "$HTML" | grep -qE 'property="og:image" content="https?://' || { ok=0; why="$why og:image"; }
    fi
    # noindex is a TWO-SIDED contract: flagged rows must carry the robots
    # noindex meta; UNFLAGGED (indexable) rows must NOT — a public page silently
    # shipping noindex is deindexed by Google. BOTH directions scope the grep to
    # the robots meta TAG itself (grep -o, works even on single-line HTML):
    # body text saying "noindex" can't false-trigger the inverse check, and a
    # robots meta with the WRONG value ("index, follow") plus a stray "noindex"
    # elsewhere can't false-pass the positive check. The tag pattern is
    # case/quote/attribute-order-tolerant (a hand-written static tag counts
    # too); the one remaining escape is a robots TAG split across lines — the
    # inverse check misses (false-passes) that, see the header NOTE.
    if [[ ",$flags," == *",noindex,"* ]]; then
      if ! printf '%s' "$HTML" | grep -io '<meta[^>]*name=.robots.[^>]*>' | grep -qiF 'noindex'; then
        ok=0; why="$why noindex"
      fi
    elif printf '%s' "$HTML" | grep -io '<meta[^>]*name=.robots.[^>]*>' | grep -qiF 'noindex'; then
      ok=0; why="$why unexpected-noindex"
    fi
    if [ "$ok" = "1" ]; then
      PASS=$((PASS+1)); printf "  [PASS] %-28s ua=%.20s\n" "$url" "$ua"
    else
      FAIL=$((FAIL+1)); printf "  [FAIL] %-28s ua=%.20s missing:%s\n" "$url" "$ua" "$why"
    fi
  done
}

# check_404 <url> — real 404 status + noindex meta + no raw-template leak.
check_404() {
  local url="$1" ok why
  if ! fetch "$url" "${UAS[0]}"; then
    FAIL=$((FAIL+1)); printf "  [FAIL] %-28s curl-error\n" "$url"; return
  fi
  ok=1; why=""
  [ "$CODE" = "404" ] || { ok=0; why=" status=$CODE"; }
  if ! printf '%s' "$HTML" | grep -io '<meta[^>]*name=.robots.[^>]*>' | grep -qiF 'noindex'; then
    ok=0; why="$why noindex"
  fi
  if printf '%s' "$HTML" | grep -qE -- '<!--app-(html|head)-->'; then
    ok=0; why="$why raw-template"
  fi
  if [ "$ok" = "1" ]; then
    PASS=$((PASS+1)); printf "  [PASS] %-28s status=404\n" "$url"
  else
    FAIL=$((FAIL+1)); printf "  [FAIL] %-28s%s\n" "$url" "$why"
  fi
}

# check_301 <from> <expected_target_path> — asserts the conversion's redirect
# layer (/index.html -> /, trailing-slash normalization, legacy-route 301s).
# Must be exactly 301 (playbook §11 uses 302 for Accept-Language locale
# redirects, which should NOT match here). curl's %{redirect_url} resolves
# Express's relative Location against the request URL, so same-origin targets
# compare EXACTLY as "$BASE$want" (want = full target path, query included).
# Never loosen this to a suffix match: it would false-pass wrong targets that
# share the tail (/en/news for want /news) and — for want="/" — even redirect
# loops (/index.html -> /index.html/). Non-ASCII paths: write BOTH from and
# want PERCENT-ENCODED with matching hex case (Express percent-encodes its
# Location and %{redirect_url} preserves it — a raw-unicode want never
# matches), e.g. check_301 "/%E5%85%B3%E4%BA%8E/" "/%E5%85%B3%E4%BA%8E".
check_301() {
  local from="$1" want="$2" out code loc
  out="$(curl -s -o /dev/null --max-time 15 --connect-timeout 5 -w '%{http_code} %{redirect_url}' "$BASE$from" -A "${UAS[0]}")" || {
    FAIL=$((FAIL+1)); printf "  [FAIL] %-28s curl-error\n" "$from"; return; }
  code="${out%% *}"; loc="${out#* }"
  if [ "$code" = "301" ] && [ "$loc" = "$BASE$want" ]; then
    PASS=$((PASS+1)); printf "  [PASS] %-28s 301 -> %s\n" "$from" "$loc"
  else
    FAIL=$((FAIL+1)); printf "  [FAIL] %-28s want 301->%s%s got %s %s\n" "$from" "$BASE" "$want" "$code" "$loc"
  fi
}

echo "== SSR crawler verification against $BASE =="
# ---- EDIT PER PROJECT: one row per route CLASS ----------------------------
# The rows below are a WORKED EXAMPLE from a real law-firm build — replace
# every one. Cover route CLASSES, not every URL: home, each list (page 1 AND
# page >= 2 if paginated), ONE ROW PER DETAIL TYPE, plus content edge cases
# (unicode slug, very long article), plus — if the app has auth-gated routes —
# one gated row, and one row per redirect class. Refresh record-derived needles
# when content churns. Rules:
#   - needle: body-only text (hero copy, section intro, record excerpt) that
#     does NOT appear in the title or meta description. Write it as the text a
#     READER sees ("Smith & Jones", not "Smith &amp; Jones") — the script
#     decodes HTML entities before comparing. Empty/multi-line needles are
#     rejected (they would match anything).
#   - title: substring of that route's expected <title> (same rule).
#   - flags (arg 4, comma-separated, NO spaces): "state" if the route
#     prefetches data; "ogimage" for detail pages with a share image; "nocanon"
#     only for routes with no canonicalPath; "noindex" for gated/cart/internal-
#     search rows (asserts the robots noindex meta). An unknown/typo'd flag is a
#     hard error, not a silent skip.
#   - 5th arg (paginated rows): substring the canonical href VALUE must contain,
#     so a canonical collapsing back to page 1 turns the row red.
check "/"                              "外国人採用の費用・助成金・支援機関を" "ヤトエル" state
check "/search"                        "登録支援機関を探す" "登録支援機関を検索" state
# detail row: 運営確認済み機関（エドミール）— 確認済みブロックの本文をneedleに
check "/org/39735"                     "掲載情報 運営確認済み" "合同会社エドミール" state
# unicode-slug rows — decodeURI seed-keyのE2E検証
check "/region/東京都"                  "出入国在留管理庁の登録簿に基づく" "東京都の登録支援機関" state
check "/field/介護"                    "高齢化に伴い最も受入れが進む分野" "介護分野対応の登録支援機関" state
check "/for-organizations"             "自社情報を確認・修正する（無料）" "ヤトエル"
# ── 大改修（診断ファースト化）で追加した新規ページ群（1クラス1行）──
check "/joseikin"                      "外国人雇用で検討できる助成金" "助成金"
check "/joseikin/jinzai-kakuho"        "人材確保等支援助成金" "人材確保等支援助成金"
check "/guide/tokutei-ginou-ikou"      "育成就労" "特定技能"
check "/columns/saiyou-cost-hikaku"    "採用コスト" "外国人採用のコストは高い？"
check "/neutrality-policy"             "中立性" "中立性"
# gated route: asserts the 200 + default-head + noindex contract.
# /adminはSSRではスケルトン（divのみ・テキストなし）を描画するため、body needleはマークアップの一部で代用
check "/admin"                         "<div" "ヤトエル" nocanon,noindex
# redirect layer — one row per class:
# NOTE: devサーバー（NODE_ENV=development→setupVite）はリダイレクト層（serveStatic内）を
# 通らないため200が返る。devでは SKIP_301=1 でスキップ（本番 yatoeru.jp では
# /index.html→/ と /search/→/search の301をcurlで検証済み 2026-07-18）。
if [ "${SKIP_301:-0}" != "1" ]; then
  check_301 "/index.html"                "/"
  check_301 "/search/"                   "/search"
else
  echo "  [SKIP] check_301 rows (SKIP_301=1 — dev server has no redirect layer)"
fi
# soft-404方式：本番ゲートウェイがアプリの404応答を横取りして生テンプレートを200で
# 返すため、not-foundは200+noindexで配信する（nocanon,noindexフラグで検証）。
# 存在しないorg ID：SSRではデータなしのため「戻る」ナビのみ描画される
check "/org/99999999"                  "戻る" "ヤトエル" nocanon,noindex
check "/definitely-not-a-route"        "Page Not Found" "ヤトエル" nocanon,noindex
# static mount guard (KEEP this row): a bare directory path (dist/public/assets/
# always exists) must NOT 301-loop with the trailing-slash normalizer — needs
# express.static's redirect:false (playbook §6); it then falls through to the
# SSR catch-all as a real 404 + noindex.
check "/assets"                        "Page Not Found" "ヤトエル" nocanon,noindex
# ---------------------------------------------------------------------------

echo "== Result: PASS=$PASS FAIL=$FAIL =="
if [ $((PASS + FAIL)) -eq 0 ]; then
  echo "NO CHECKS RAN (route table empty?)"
  exit 1
fi
if [ "$CONTENT" -eq 0 ]; then
  echo "NO CONTENT ROUTE CHECKS RAN — the table needs at least one check row (check_404/check_301 alone verify nothing about SSR output)"
  exit 1
fi
if [ "$FAIL" = "0" ]; then
  echo "ALL GREEN"
else
  echo "SOME FAILED"
  exit 1
fi
