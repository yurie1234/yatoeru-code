/**
 * AI（Anthropic）設定の健全性チェック。
 *
 * Railwayのairy-prosperityサービス「Console」タブで実行する:
 *   node scripts/check-llm-config.mjs
 *
 * 診断が auth-failed で失敗する原因を1回で切り分ける。
 * **APIキーの値は一切出力しない**（長さ・接頭辞・空白の有無だけを出す）。
 * 公開APIの応答にキーが載っていた事故があったため、確認手段も値を出さない形にする。
 */
import Anthropic from "@anthropic-ai/sdk";

const raw = process.env.ANTHROPIC_API_KEY ?? "";
const cleaned = raw.replace(/\s+/g, "");
const model = (process.env.ANTHROPIC_MODEL ?? "claude-opus-5").trim();

function mask(v) {
  if (!v) return "(未設定)";
  const prefix = v.slice(0, 13); // "sk-ant-api03-" まで
  return `${prefix}…（以降${Math.max(0, v.length - 13)}文字）`;
}

console.log("=== 環境変数の状態（値は出力しません） ===");
console.log("ANTHROPIC_API_KEY:");
console.log("  設定あり          :", raw.length > 0 ? "はい" : "いいえ");
console.log("  生の長さ          :", raw.length);
console.log("  空白・改行の混入  :", /\s/.test(raw) ? `あり（${raw.length - cleaned.length}文字ぶん）` : "なし");
console.log("  除去後の長さ      :", cleaned.length, "（Anthropicのキーは通常108文字前後）");
console.log("  接頭辞            :", mask(cleaned));
console.log("  形式が妥当か      :", /^sk-ant-api03-[A-Za-z0-9_-]{80,}$/.test(cleaned) ? "はい" : "いいえ（形式が想定と異なります）");
console.log("ANTHROPIC_MODEL     :", model);
console.log("他のAI系環境変数    :",
  Object.keys(process.env)
    .filter((k) => /ANTHROPIC|CLAUDE|OPENAI/i.test(k))
    .join(", ") || "（なし）"
);

if (!cleaned) {
  console.log("\n→ キーが未設定です。Railwayの Variables に ANTHROPIC_API_KEY を1行で設定してください。");
  process.exit(1);
}

const client = new Anthropic({ apiKey: cleaned });

console.log("\n=== 認証チェック（モデル一覧の取得） ===");
try {
  const list = await client.models.list({ limit: 20 });
  console.log("→ 認証OK。キーは有効です。");
  const ids = list.data.map((m) => m.id);
  console.log("利用可能なモデル:", ids.join(", "));
  console.log(
    `\nANTHROPIC_MODEL（${model}）が一覧に含まれるか:`,
    ids.includes(model) ? "はい" : "いいえ ← ここが原因の可能性があります"
  );
} catch (e) {
  const status = e?.status ?? e?.statusCode;
  console.log("→ 認証に失敗しました。");
  console.log("  HTTPステータス:", status ?? "(不明)");
  console.log("  エラー種別    :", e?.error?.error?.type ?? e?.name ?? "(不明)");
  console.log("  メッセージ    :", (e?.error?.error?.message ?? e?.message ?? "").slice(0, 200));
  if (status === 401) {
    console.log("\n→ キーが無効か失効しています。Anthropicコンソールで新しいキーを発行し、");
    console.log("   Railwayの ANTHROPIC_API_KEY に1行で貼り直してください。");
    console.log("   （貼り付け後、サービスが再デプロイされるまで反映されません）");
  } else if (status === 403) {
    console.log("\n→ キーは認識されましたが権限がありません。組織・ワークスペースの設定を確認してください。");
  }
  process.exit(1);
}

console.log("\n=== 実際の生成リクエスト（最小） ===");
try {
  const res = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: "user", content: "OKとだけ返してください" }],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  console.log("→ 生成OK。応答:", JSON.stringify(text.slice(0, 50)));
  console.log("\n診断機能は動作するはずです。yatoeru.jp/diagnose で確認してください。");
} catch (e) {
  const status = e?.status ?? e?.statusCode;
  console.log("→ 生成に失敗しました。");
  console.log("  HTTPステータス:", status ?? "(不明)");
  console.log("  エラー種別    :", e?.error?.error?.type ?? e?.name ?? "(不明)");
  console.log("  メッセージ    :", (e?.error?.error?.message ?? e?.message ?? "").slice(0, 200));
  if (status === 404) {
    console.log(`\n→ モデル「${model}」が使えません。ANTHROPIC_MODEL を上の一覧の値に変更してください。`);
  } else if (status === 400) {
    console.log("\n→ リクエスト内容またはクレジット残高の問題です。上のメッセージを確認してください。");
  }
  process.exit(1);
}
