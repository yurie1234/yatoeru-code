// Manus Forge（OpenAI互換プロキシ）依存を廃止し、Anthropic APIを直接呼ぶ実装。
// server/routers/orgs.ts 側の呼び出し（invokeLLM({model:"gpt-4o-mini", messages, response_format, max_tokens})）
// は変更していない。呼び出し側から見たOpenAI互換の型・戻り値の形はそのまま維持し、
// このファイル内部でAnthropic Messages APIへの変換だけを行う。
import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const DEFAULT_MAX_TOKENS = 4096;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  if (!ENV.anthropicApiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured (server/_core/env.ts: anthropicApiKey)"
    );
  }
  cachedClient = new Anthropic({ apiKey: ENV.anthropicApiKey });
  return cachedClient;
}

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

// OpenAI形式のcontentパーツ → Anthropicのcontent blockへ変換。
// file_urlはこのアプリでは使われていない（診断・提案書生成はテキストのみ）ため、
// テキストとして注記して落とさずに残す。
function toAnthropicContentBlock(
  part: MessageContent
): Anthropic.ContentBlockParam {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return { type: "text", text: part.text };
  }
  if (part.type === "image_url") {
    return { type: "image", source: { type: "url", url: part.image_url.url } };
  }
  // file_url: 未使用パス。テキストとしてURLを渡す（画像以外のファイル添付はサポート対象外）。
  return { type: "text", text: `[file: ${part.file_url.url}]` };
}

// OpenAI形式のmessages配列 → Anthropicの { system, messages } へ分離・変換。
// role: "system" はAnthropicではmessages配列ではなくトップレベルsystemパラメータになる。
// role: "tool"/"function" はこのアプリの呼び出し元では使われていないが、
// 万一渡された場合もエラーにせずuserメッセージとして継続できるようにしている。
function toAnthropicRequest(messages: Message[]): {
  system: string | undefined;
  messages: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const converted: Anthropic.MessageParam[] = [];

  for (const message of messages) {
    const parts = ensureArray(message.content);
    const text = parts
      .map((p) => (typeof p === "string" ? p : toAnthropicContentBlock(p)))
      .map((p) => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
      .filter(Boolean)
      .join("\n");

    if (message.role === "system") {
      systemParts.push(text);
      continue;
    }

    if (message.role === "tool" || message.role === "function") {
      // ツール結果メッセージ。呼び出し元は現時点でtoolsを使わないため、
      // フォールバックとしてuserメッセージ扱いにする。
      converted.push({ role: "user", content: text });
      continue;
    }

    const blocks = parts.map(toAnthropicContentBlock);
    converted.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: blocks.length === 1 && blocks[0].type === "text" ? blocks[0].text : blocks,
    });
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: converted,
  };
}

// OpenAI風のfunction呼び出しツール定義 → Anthropicのtool定義へ変換。
// 現在のorgs.tsの呼び出しではtoolsは使われていないが、将来の互換性のために残す。
function toAnthropicTools(tools: Tool[] | undefined): Anthropic.Tool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: (t.function.parameters as Anthropic.Tool.InputSchema) ?? {
      type: "object",
      properties: {},
    },
  }));
}

function toAnthropicToolChoice(
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): Anthropic.MessageCreateParams["tool_choice"] | undefined {
  if (!toolChoice) return undefined;
  if (toolChoice === "none") return { type: "none" };
  if (toolChoice === "auto") return { type: "auto" };
  if (toolChoice === "required") return { type: "any" };
  if ("name" in toolChoice) return { type: "tool", name: toolChoice.name };
  return { type: "tool", name: toolChoice.function.name };
}

// OpenAIのresponse_format(json_schema) → Anthropicのoutput_config.format(json_schema)。
// Anthropic側はスキーマに name/strict を持たない（schemaのみ）ため、それらは捨てる。
function toOutputConfig(params: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): Anthropic.MessageCreateParams["output_config"] | undefined {
  const explicit = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;
  const jsonSchema =
    explicit?.type === "json_schema" ? explicit.json_schema.schema : schema?.schema;
  if (!jsonSchema) return undefined;
  return { format: { type: "json_schema", schema: jsonSchema } };
}

// Anthropicのstop_reason → 呼び出し元(orgs.ts)が見ているOpenAI形式のfinish_reasonへ変換。
// orgs.tsは"length"（トークン上限で途切れた）だけを分岐条件に使っている。
function toFinishReason(stopReason: string | null): string | null {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return stopReason;
  }
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

  const { system, messages } = toAnthropicRequest(params.messages);
  const tools = toAnthropicTools(params.tools);
  const toolChoice = toAnthropicToolChoice(params.toolChoice || params.tool_choice, params.tools);
  const outputConfig = toOutputConfig(params);
  const maxTokens = params.max_tokens ?? params.maxTokens ?? DEFAULT_MAX_TOKENS;

  const response = await client.messages.create({
    model: ENV.anthropicModel,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    ...(outputConfig ? { output_config: outputConfig } : {}),
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `LLM invoke refused: ${response.stop_details?.category ?? "unknown"} – ${response.stop_details?.explanation ?? ""}`
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  const toolUseBlocks = response.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );

  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textBlock?.text ?? "",
          ...(toolUseBlocks.length > 0
            ? {
                tool_calls: toolUseBlocks.map((b) => ({
                  id: b.id,
                  type: "function" as const,
                  function: { name: b.name, arguments: JSON.stringify(b.input) },
                })),
              }
            : {}),
        },
        finish_reason: toFinishReason(response.stop_reason),
      },
    ],
    usage: response.usage
      ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        }
      : undefined,
  };
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  const client = getClient();
  const models: ModelInfo[] = [];
  for await (const m of client.models.list()) {
    models.push({
      id: m.id,
      object: "model",
      created: Math.floor(new Date(m.created_at).getTime() / 1000),
      owned_by: "anthropic",
    });
  }
  return { object: "list", data: models };
}
