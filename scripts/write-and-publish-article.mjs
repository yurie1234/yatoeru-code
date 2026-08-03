/**
 * コラム記事の自動執筆・即時公開スクリプト。
 * Railwayの別サービス（Cron Schedule・週2回）から実行する想定。
 * DATABASE_URL・ANTHROPIC_API_KEY・ANTHROPIC_MODELが必要。
 *
 * 事実の捏造を防ぐため、テーマ・数値・出典はcontent/article-topics-queue.mjs
 * に事前固定しておき、このスクリプトはdocs/writing-style-guide.mdの執筆規範に
 * 沿った文章化のみをAIに任せる。
 *
 * 実行: node scripts/write-and-publish-article.mjs
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import mysql from "mysql2/promise";
import { topicQueue } from "../content/article-topics-queue.mjs";

const DATABASE_URL = process.env.DATABASE_URL;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not set");
  process.exit(1);
}

// server/articlePublish.tsのSTATIC_COLUMNSと同一（TSファイルはmjsから直接importできないため複製）。
const STATIC_SLUGS = [
  "saiyou-cost-hikaku",
  "shien-kikan-erabikata",
  "kanri-dantai-ikou-guide",
  "shokai-vs-shien",
];

// NOTE: AnthropicのStructured Output(json_schema)はarrayのminItems/maxItemsに
// 0/1以外の値を許さない（400エラーになる）。個数制約はprompt文言＋validate()側で担保する。
const ARTICLE_JSON_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    bodyMd: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["slug", "title", "description", "keyPoints", "bodyMd", "tags"],
  additionalProperties: false,
};

function validate(article, expectedSlug) {
  const errors = [];
  if (article.slug !== expectedSlug) errors.push(`slug mismatch: ${article.slug}`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) errors.push("slug format invalid");
  if (article.title.length < 10 || article.title.length > 120) errors.push("title length invalid");
  if (article.description.length < 40 || article.description.length > 300) errors.push("description length invalid");
  if (article.keyPoints.length < 3 || article.keyPoints.length > 5) errors.push("keyPoints count invalid");
  if (article.keyPoints.some((k) => k.length < 10 || k.length > 120)) errors.push("keyPoints item length invalid");
  if (article.bodyMd.length < 1500 || article.bodyMd.length > 40000) errors.push(`bodyMd length invalid (${article.bodyMd.length})`);
  if (article.tags.length < 1 || article.tags.length > 5) errors.push("tags count invalid");
  if (article.tags.some((t) => t.length < 1 || t.length > 24)) errors.push("tags item length invalid");
  return errors;
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  const [rows] = await conn.query("SELECT slug FROM articles");
  const existingSlugs = new Set([...STATIC_SLUGS, ...rows.map((r) => r.slug)]);

  const topic = topicQueue.find((t) => !existingSlugs.has(t.slug));
  if (!topic) {
    console.log("キュー内の全テーマが投稿済みです。content/article-topics-queue.mjsに新規ブリーフを追加してください。");
    await conn.end();
    return;
  }
  console.log(`[選定] ${topic.slug} — ${topic.title}`);

  const styleGuidePath = path.resolve(process.cwd(), "docs/writing-style-guide.md");
  const styleGuide = fs.existsSync(styleGuidePath) ? fs.readFileSync(styleGuidePath, "utf8") : "";
  const aiTellChecklistPath = path.resolve(process.cwd(), "docs/ai-tell-checklist.md");
  const aiTellChecklist = fs.existsSync(aiTellChecklistPath) ? fs.readFileSync(aiTellChecklistPath, "utf8") : "";

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `あなたはヤトエル（外国人材の受け入れ支援機関データベース）のコラム執筆者です。
以下の執筆規範に厳密に従って日本語の記事本文を書いてください。

${styleGuide}

${aiTellChecklist}

【編集方針・厳守事項】
- 与えられた「事実」以外の具体的な数値・統計・固有の出典を新たに創作しないこと。事実の列挥にない情報が必要な場合は、一般的な説明として書き、数値は出さない。
- 与えられた出典以外の出典URLを創作しないこと。
- 本文はMarkdown形式（見出しはH2まで、表・箇条書き可）。生のHTMLは使わない。
- 中立性: 特定の事業者名を推奨・批判しない。読者（外国人材の受け入れを検討する企業、または支援機関自身）が判断に使える記事にする。`;

  const userPrompt = `以下のテーマで記事を1本書いてください。

タイトル案: ${topic.title}
記事の切り口: ${topic.angle}

【使用してよい事実（これ以外の数値・固有情報は創作しないこと）】
${topic.facts.map((f) => `- ${f}`).join("\n")}

【出典】
${topic.sources.map((s) => `- ${s.name}: ${s.url}`).join("\n")}

出力要件:
- slug: "${topic.slug}"（固定・変更しないこと）
- title: 10〜120字
- description: 40〜300字（meta description・一覧カード用）
- keyPoints: 3〜5個、各10〜120字（記事冒頭の「この記事のポイント」）
- bodyMd: 1500〜4000字程度のMarkdown本文（長すぎるとトークン上限で出力が途中で
  切れるため、上記の事実を根拠にしつつこの範囲に収めること）
- tags: 1〜5個、各1〜24字`;

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: { type: "json_schema", schema: ARTICLE_JSON_SCHEMA } },
  });

  if (message.stop_reason !== "end_turn") {
    throw new Error(
      `LLM response did not finish normally (stop_reason=${message.stop_reason}). ` +
        `おそらくmax_tokens不足で出力が途中で切れている。max_tokensを増やすか、bodyMdの上限を下げること。`
    );
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("no text block in LLM response");
  let article;
  try {
    article = JSON.parse(textBlock.text);
  } catch (e) {
    throw new Error(`LLM出力のJSON解析に失敗（文字数: ${textBlock.text.length}）: ${e.message}`);
  }

  const errors = validate(article, topic.slug);
  if (errors.length > 0) {
    console.error("生成結果が仕様を満たしていません:", errors);
    process.exit(1);
  }

  await conn.query(
    `INSERT INTO articles (slug, title, description, keyPoints, bodyMd, tags, baseDate, sources, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
    [
      article.slug,
      article.title,
      article.description,
      JSON.stringify(article.keyPoints),
      article.bodyMd,
      JSON.stringify(article.tags),
      today,
      JSON.stringify(topic.sources),
    ]
  );

  console.log(`[公開完了] ${article.slug} — ${article.title}`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
