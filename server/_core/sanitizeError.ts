/**
 * 公開APIのエラー応答から内部情報を落とす。
 *
 * きっかけ：診断APIが 500 を返したとき、応答にAnthropic APIキーの値が
 * そのまま含まれていた（`Headers.append: "sk-ant-..." is an invalid header value`）。
 * SDKやNode組み込みの例外メッセージは、渡した値をそのまま本文に埋め込むことがある。
 * tRPCは既定でその message をクライアントへ返すため、サーバー側の例外文がそのまま
 * 公開されてしまう。
 *
 * 方針：
 *  - 入力検証エラー（BAD_REQUEST）と、こちらが意図して出したメッセージは残す
 *    （「登録番号が見つかりません」等は利用者に伝わる必要がある）
 *  - INTERNAL_SERVER_ERROR は定型文に置き換える（原因は必ずサーバーログに残す）
 *  - 万一メッセージに秘密らしき文字列が含まれていたらマスクする（多重防御）
 */

/** APIキー・トークンらしき文字列。値そのものは残さない */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_\-]{8,}/g, // Anthropic / OpenAI 形式
  /\bBearer\s+[A-Za-z0-9._\-]{8,}/gi,
  /\bmysql:\/\/[^\s"']+/gi, // 接続文字列（認証情報を含む）
  /\bpostgres(?:ql)?:\/\/[^\s"']+/gi,
  /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+/g, // JWT
];

/** 秘密らしき文字列を [REDACTED] に置き換える */
export function redactSecrets(message: string): string {
  let out = message;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out;
}

const GENERIC_MESSAGE = "サーバー側でエラーが発生しました。時間をおいて再度お試しください。";

/**
 * クライアントへ返してよいメッセージを組み立てる。
 * INTERNAL_SERVER_ERROR は内容を伏せ、それ以外は秘密のマスクだけを行う。
 */
export function clientSafeMessage(code: string | undefined, message: string): string {
  if (code === "INTERNAL_SERVER_ERROR") return GENERIC_MESSAGE;
  return redactSecrets(message);
}

/**
 * /api/scheduled/* 等の素のExpressハンドラ用のエラー応答。
 * スタックトレースは返さない（ファイルパスと内部構造が漏れる）。
 * 原因はサーバーログに残す。
 */
export function respondServerError(
  res: { status: (code: number) => { json: (body: unknown) => unknown } },
  error: unknown,
  context: Record<string, unknown> = {}
) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[api] error", { ...context, message: err.message, stack: err.stack });
  return res.status(500).json({
    error: redactSecrets(err.message),
    context,
    timestamp: new Date().toISOString(),
  });
}
