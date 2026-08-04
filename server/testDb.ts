import { describe, it } from "vitest";

/**
 * 実DB接続が必要なテストの目印。
 *
 * `articles.related` や `events.track` のようにDBへ書いて読み返す検証は、
 * DATABASE_URL が無い環境では必ず失敗する。落ちたままにしておくと
 * 「4件落ちるのが正常」という状態になり、**本物の回帰が混ざっても気づけない**。
 * 落とすのではなく、DBが無いことを理由に明示的にスキップする。
 *
 * DBありで回すとき（Dockerがあれば手元でも本番同等のMySQLで検証できる）:
 *
 *   docker run -d --name yatoeru-test-db \
 *     -e MYSQL_ROOT_PASSWORD=test -e MYSQL_DATABASE=yatoeru -p 13306:3306 mysql:8
 *   DATABASE_URL="mysql://root:test@127.0.0.1:13306/yatoeru" npx drizzle-kit migrate
 *   DATABASE_URL="mysql://root:test@127.0.0.1:13306/yatoeru" npm test
 *
 * 本番のDATABASE_URLは絶対に使わないこと（テストが実データへ書き込む）。
 */
export const HAS_TEST_DB = Boolean(process.env.DATABASE_URL);

/** DB接続が必要な it。DATABASE_URL が無ければスキップする */
export const itWithDb = HAS_TEST_DB ? it : it.skip;

/** DB接続が必要な describe。DATABASE_URL が無ければスキップする */
export const describeWithDb = HAS_TEST_DB ? describe : describe.skip;

/** スキップした理由をテスト名に添えるための接尾辞 */
export const DB_SUFFIX = HAS_TEST_DB ? "" : "（DATABASE_URL未設定のためスキップ）";
