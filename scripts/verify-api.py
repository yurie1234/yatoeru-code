#!/usr/bin/env python3
"""検索API（京都府×中国語×外食業）と診断APIの動作検証スクリプト"""
import urllib.parse, urllib.request, json, time, sys

BASE = "http://localhost:3000/api/trpc"

def call(proc, payload, timeout=120):
    inp = {"0": {"json": payload}}
    url = f"{BASE}/{proc}?batch=1&input={urllib.parse.quote(json.dumps(inp))}"
    s = time.time()
    with urllib.request.urlopen(url, timeout=timeout) as r:
        data = json.load(r)
    return time.time() - s, data[0]["result"]["data"]["json"]

# 1. 検索：京都府×中国語×外食業（無限読み込み報告のケース）
t, r = call("orgs.search", {"prefecture": "京都府", "language": "中国語", "field": "外食業", "page": 1, "limit": 20, "sort": "affinity"})
print(f"[search] {t:.2f}s total={r['total']} items={len(r['items'])}")
for it in r["items"][:3]:
    aff = it.get("affinity") or {}
    print(f"  - {it['name']} score={aff.get('score')} reasons={[x['label'] for x in aff.get('reasons', [])]}")

# 2. 検索：言語のみフィルタ
t, r = call("orgs.search", {"language": "ベトナム語", "page": 1, "limit": 20, "sort": "affinity"})
print(f"[search lang-only] {t:.2f}s total={r['total']}")

sys.stdout.flush()
