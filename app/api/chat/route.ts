import { NextResponse } from "next/server";

import { GUARDRAIL_SYSTEM, buildRetrievalBlock } from "@/lib/chat/system-prompt";
import { retrieveForQuery, type Retrieval } from "@/lib/chat/retrieve";
import {
  GET_QUOTE_TOOL,
  runGetQuote,
  isQuoteError,
  type GetQuoteOutput,
} from "@/lib/chat/get-quote";
import { clientKeyFromRequest, rateLimit } from "@/lib/chat/rate-limit";

// Node runtime (the SDK + server-only catalogue code need it) and never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;
/** Safety cap on tool_use round-trips so a misbehaving model can't loop forever. */
const MAX_TOOL_ROUNDS = 5;

// --- Input caps for the public, unauthenticated endpoint --------------------
/** Keep only the most recent N turns the client sends. */
const MAX_MESSAGES = 20;
/** Hard cap per message (characters). Longer content is truncated. */
const MAX_CONTENT_CHARS = 4_000;
/** Reject the whole request if the combined content exceeds this. */
const MAX_TOTAL_CHARS = 24_000;

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

/** Minimal structural typings for the dynamically-imported Anthropic SDK. */
type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};
type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | { type: string; [k: string]: unknown };

type AnthropicMessageParam = {
  role: "user" | "assistant";
  content: string | unknown[];
};

type AnthropicFinalMessage = {
  stop_reason: string | null;
  content: AnthropicContentBlock[];
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured. The assistant is currently unavailable." },
      { status: 503 },
    );
  }

  // Per-IP rate limit before doing any work (catalogue index build, model call).
  const limit = rateLimit(clientKeyFromRequest(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      },
    );
  }

  let messages: ChatMessage[];
  try {
    messages = parseBody(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Invalid request body." },
      { status: 400 },
    );
  }

  // Dynamic import so the route never crashes at module load if the SDK is
  // absent; treat a missing package like a missing key (503, not a 500).
  let Anthropic: typeof import("@anthropic-ai/sdk").default;
  try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
  } catch {
    return NextResponse.json(
      { error: "Chat is not available in this environment." },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  // v1 retrieval: search the catalogue for the latest user message only.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const retrieval = await retrieveForQuery(lastUser?.content ?? "");

  // Propagate client disconnects to the SDK so we stop spending tokens.
  const signal = req.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      // Track controller state so terminal writes can never throw on a closed
      // or cancelled stream (client navigated away / aborted mid-answer).
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // Consumer is gone — mark closed so we stop trying to write.
          closed = true;
        }
      };

      // Accumulate every character the model emits so we can detect which
      // retrieved SKUs it actually cited, for the final `products` event.
      let assistantText = "";
      const citedSkus = new Set<string>();
      // Only emit product cards if the turn completed cleanly; on a mid-stream
      // error we suppress cards to avoid a half-answer + apology + cards.
      let completedCleanly = false;

      try {
        const conversation: AnthropicMessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const system = [
          {
            type: "text" as const,
            text: GUARDRAIL_SYSTEM,
            // Cache the static guardrail block; the retrieval block is dynamic.
            cache_control: { type: "ephemeral" as const },
          },
          { type: "text" as const, text: buildRetrievalBlock(retrieval.lines) },
        ];

        let lastWasToolUse = false;

        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          if (signal?.aborted) {
            closed = true;
            break;
          }

          const final = await streamTurn({
            client,
            model,
            system,
            messages: conversation,
            signal,
            onText: (delta) => {
              assistantText += delta;
              send({ type: "text", text: delta });
            },
          });

          // Append the assistant's full turn (text + tool_use) to history.
          conversation.push({ role: "assistant", content: final.content });

          const toolUses = final.content.filter(
            (b): b is AnthropicToolUseBlock => b.type === "tool_use",
          );

          if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
            lastWasToolUse = false;
            break;
          }
          lastWasToolUse = true;

          // Run each get_quote call server-side and feed results back. Error
          // payloads are flagged with is_error so the model treats them as
          // failures and recovers rather than quoting a bogus result.
          const toolResults = await Promise.all(
            toolUses.map(async (use) => {
              const result = await runTool(use, retrieval, citedSkus);
              return {
                type: "tool_result" as const,
                tool_use_id: use.id,
                content: JSON.stringify(result),
                ...(isQuoteError(result) ? { is_error: true } : {}),
              };
            }),
          );

          conversation.push({ role: "user", content: toolResults });
        }

        // If we exhausted the tool-round cap mid-tool-call, the model never got
        // to write its closing answer. Do one final tool-disabled turn so the
        // user isn't left with a dangling pre-tool fragment.
        if (lastWasToolUse && !signal?.aborted && !closed) {
          await streamTurn({
            client,
            model,
            system,
            messages: conversation,
            signal,
            toolChoiceNone: true,
            onText: (delta) => {
              assistantText += delta;
              send({ type: "text", text: delta });
            },
          });
        }

        completedCleanly = !signal?.aborted && !closed;
      } catch (err) {
        // Surface a clearly-delimited terminal note then close cleanly; the
        // client UI shows the partial answer plus this message. Do NOT emit a
        // products event for a turn that errored before completing.
        if ((err as Error)?.name !== "AbortError") {
          const message =
            err instanceof Error ? err.message : "the assistant hit an error";
          send({
            type: "text",
            text: `\n\n— Sorry, I couldn't finish that (${message}). Please try again or email sales@sealants4all.co.uk.`,
          });
        }
      } finally {
        try {
          if (completedCleanly) {
            // Final products event: retrieved SKUs the model cited in prose or
            // via a get_quote call, intersected with the retrieved set so we
            // only ever render cards for products that exist in the catalogue.
            const skus = collectCitedSkus(assistantText, retrieval, citedSkus);
            send({ type: "products", skus });
          }
          send({ type: "done" });
        } catch {
          /* ignore — controller already gone */
        }
        try {
          if (!closed) controller.close();
        } catch {
          /* already closed/cancelled */
        }
        closed = true;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stream a single model turn, forwarding text deltas; resolve the final message. */
async function streamTurn(args: {
  client: import("@anthropic-ai/sdk").default;
  model: string;
  system: unknown;
  messages: AnthropicMessageParam[];
  signal?: AbortSignal | null;
  /** When true, disable tools so the model produces a plain closing answer. */
  toolChoiceNone?: boolean;
  onText: (delta: string) => void;
}): Promise<AnthropicFinalMessage> {
  const { client, model, system, messages, signal, toolChoiceNone, onText } =
    args;

  const body: Record<string, unknown> = {
    model,
    max_tokens: MAX_TOKENS,
    system,
    tools: [GET_QUOTE_TOOL],
    messages,
  };
  if (toolChoiceNone) body.tool_choice = { type: "none" };

  const runner = client.messages.stream(
    body as never,
    signal ? { signal } : undefined,
  );

  // Abort the upstream Anthropic request if the client disconnects mid-turn.
  const onAbort = () => runner.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  runner.on("text", (delta: string) => {
    if (delta) onText(delta);
  });

  try {
    const final = (await runner.finalMessage()) as unknown as AnthropicFinalMessage;
    return final;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Execute one tool_use block. Only `get_quote` is supported. */
async function runTool(
  use: AnthropicToolUseBlock,
  retrieval: Retrieval,
  citedSkus: Set<string>,
): Promise<GetQuoteOutput> {
  if (use.name !== GET_QUOTE_TOOL.name) {
    return { error: `Unknown tool "${use.name}".` };
  }
  const result = await runGetQuote(use.input, retrieval);
  if (!isQuoteError(result)) citedSkus.add(result.sku);
  return result;
}

/** Escape a string for safe inclusion in a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Final list of SKUs to render as product cards: any retrieved SKU the model
 * referenced in its visible text, unioned with SKUs it quoted via get_quote.
 * Only SKUs present in the retrieved (catalogue) set are returned.
 *
 * Prose matches use word/token boundaries so naming a longer SKU (e.g. FIX-12)
 * does not also surface a card for a shorter one that is its substring (FIX-1).
 */
function collectCitedSkus(
  assistantText: string,
  retrieval: Retrieval,
  citedSkus: Set<string>,
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (sku: string) => {
    if (!seen.has(sku) && retrieval.bySku.has(sku)) {
      seen.add(sku);
      ordered.push(sku);
    }
  };

  // SKUs explicitly quoted via the tool come first (highest intent, exact).
  for (const sku of citedSkus) push(sku);

  // Then SKUs that appear in the assistant's prose on a token boundary.
  for (const product of retrieval.products) {
    const re = new RegExp(
      `(?<![A-Za-z0-9-])${escapeRegExp(product.sku)}(?![A-Za-z0-9-])`,
    );
    if (re.test(assistantText)) push(product.sku);
  }

  return ordered;
}

/** Validate and normalise the POST body into a clean message list. */
function parseBody(raw: unknown): ChatMessage[] {
  if (typeof raw !== "object" || raw === null || !("messages" in raw)) {
    throw new Error("Request body must include a 'messages' array.");
  }
  const list = (raw as { messages: unknown }).messages;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("'messages' must be a non-empty array.");
  }

  const messages: ChatMessage[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      const trimmed = content.trim().slice(0, MAX_CONTENT_CHARS);
      if (trimmed) messages.push({ role, content: trimmed });
    }
  }

  if (messages.length === 0) {
    throw new Error("No valid messages provided.");
  }

  // Keep only the most recent turns to bound token spend on long histories.
  const trimmed = messages.slice(-MAX_MESSAGES);

  const totalChars = trimmed.reduce((acc, m) => acc + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error("Conversation is too long. Please start a new chat.");
  }

  if (trimmed[trimmed.length - 1].role !== "user") {
    throw new Error("The last message must be from the user.");
  }
  return trimmed;
}
