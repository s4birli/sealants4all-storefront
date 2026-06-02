"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  MessageCircle,
  X,
  Send,
  ShoppingCart,
  Mail,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart/useCart";
import { useCatalogSearch } from "@/components/catalog/CatalogSearchProvider";
import { Placeholder } from "@/components/ui/Placeholder";
import { plain2 } from "@/lib/fmt";
import { deriveTiers } from "@/lib/pricing";

/* ──────────────────────────────────────────────────────────────────────────
 * Types — mirror the fixed /api/chat contract.
 * ───────────────────────────────────────────────────────────────────────── */

type ChatRole = "user" | "assistant";

/** A product card the model asked us to render inline (resolved client-side). */
type ChatProductCard = {
  sku: string;
  variantId: string;
  name: string;
  brand: string;
  image: string | null;
  basePrice: number;
  stock: "in" | "low" | "out";
  priceAvailable: boolean;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  /** SKUs the assistant attached to this message (rendered as cards). */
  skus?: string[];
};

/** Server-Sent Event payloads as defined by the fixed contract. */
type SseEvent =
  | { type: "text"; text: string }
  | { type: "products"; skus: string[] }
  | { type: "done" };

const STORAGE_KEY = "s4a-v2:chat";
const SALES_EMAIL = "sales@sealants4all.co.uk";
/** Mirror the server's per-message cap so we never send rejectable input. */
const INPUT_MAX_CHARS = 4000;

const SUGGESTED_PROMPTS = [
  "Which sealant for a bathroom?",
  "Fire-rated sealant for around 24 tubes",
  "Best adhesive for fixing skirting board",
  "What do you stock for exterior render cracks?",
] as const;

const UNAVAILABLE_MESSAGE =
  "Sorry — the assistant is unavailable right now. You can still use the search box at the top to find products, or email our team at " +
  SALES_EMAIL +
  " and we'll help you out.";

/* ──────────────────────────────────────────────────────────────────────────
 * Persistence helpers.
 * ───────────────────────────────────────────────────────────────────────── */

function makeId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" ||
          (m as ChatMessage).role === "assistant"),
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    // Keep storage bounded — only persist the last 40 turns.
    const trimmed = messages.slice(-40);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/** Build a short plaintext transcript for the "Talk to a human" mailto. */
function buildTranscript(messages: ChatMessage[]): string {
  return messages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Me" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

/* ──────────────────────────────────────────────────────────────────────────
 * Widget.
 * ───────────────────────────────────────────────────────────────────────── */

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Reuse the warmed catalogue from CatalogSearchProvider — no extra fetch,
  // no risk of a transient 502 being cached as authoritative.
  const { getBySku } = useCatalogSearch();

  const panelId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Hydrate persisted messages after mount (avoids SSR mismatch). */
  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  /* Persist on change. */
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  /* Auto-scroll the message list to the newest content. */
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  /* Esc closes. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* Focus the input when the panel opens. */
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  /* Abort any in-flight stream on unmount. */
  useEffect(() => () => abortRef.current?.abort(), []);

  /** Resolve a SKU to an inline product card using the warmed catalogue. */
  const resolveCard = useCallback(
    (sku: string): ChatProductCard | null => {
      const p = getBySku(sku);
      if (!p) return null;
      // Base (qty 1) price from the same tier logic the cart uses.
      const basePrice = p.tiers?.[0]?.price ?? deriveTiers(p.price)[0]?.price ?? 0;
      return {
        sku: p.sku,
        variantId: p.variantId,
        name: p.name,
        brand: p.brand,
        image: p.image,
        basePrice,
        stock: p.stock,
        priceAvailable: p.priceAvailable,
      };
    },
    [getBySku],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, INPUT_MAX_CHARS);
      if (!trimmed || busy) return;

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: trimmed,
      };
      const assistantId = makeId();

      // Snapshot the history we send to the server (contract: last item is the
      // new user message; assistant cards/ids are storefront-only).
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? fn(m) : m)),
        );

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        // 503/429 (or any non-stream JSON error) → graceful fallback message.
        if (!res.ok || !res.body) {
          patchAssistant((m) => ({ ...m, content: UNAVAILABLE_MESSAGE }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const pendingSkus: string[] = [];

        const handleEvent = (evt: SseEvent) => {
          if (evt.type === "text") {
            patchAssistant((m) => ({ ...m, content: m.content + evt.text }));
          } else if (evt.type === "products") {
            for (const s of evt.skus) {
              if (!pendingSkus.includes(s)) pendingSkus.push(s);
            }
            patchAssistant((m) => ({ ...m, skus: [...pendingSkus] }));
          }
          // "done" needs no client action — the stream simply ends.
        };

        // SSE frame parser: events are separated by a blank line; each "data:"
        // line carries one JSON payload.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            for (const line of frame.split("\n")) {
              const t = line.trimStart();
              if (!t.startsWith("data:")) continue;
              const json = t.slice(5).trim();
              if (!json) continue;
              try {
                handleEvent(JSON.parse(json) as SseEvent);
              } catch {
                /* ignore malformed frame */
              }
            }
          }
        }

        // If the stream produced no text at all, show a gentle fallback.
        patchAssistant((m) =>
          m.content.trim().length === 0 && !(m.skus && m.skus.length)
            ? { ...m, content: UNAVAILABLE_MESSAGE }
            : m,
        );
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        patchAssistant((m) =>
          m.content.trim().length === 0
            ? { ...m, content: UNAVAILABLE_MESSAGE }
            : m,
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const mailtoHref = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
    "Sealants4All — chat enquiry",
  )}&body=${encodeURIComponent(
    `Hi team,\n\nI was using the chat assistant and would like to speak to someone.\n\n— Transcript —\n${buildTranscript(
      messages,
    )}\n\nThanks,`,
  )}`;

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        className={"chat-fab" + (open ? " is-open" : "")}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X size={24} strokeWidth={2} />
        ) : (
          <MessageCircle size={24} strokeWidth={2} />
        )}
        {!open && <span className="chat-fab-label">Ask an expert</span>}
      </button>

      {/* Backdrop (mobile sheet) */}
      <div
        className={"chat-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <section
        id={panelId}
        className={"chat-panel" + (open ? " open" : "")}
        role="dialog"
        aria-modal="false"
        aria-label="Sealants4All product assistant"
        aria-hidden={!open}
      >
        <header className="chat-head">
          <div className="chat-head-title">
            <span className="chat-head-avatar" aria-hidden="true">
              <Sparkles size={16} strokeWidth={2.2} />
            </span>
            <div>
              <strong>Sealants4All assistant</strong>
              <span className="chat-head-sub">
                Product picks &amp; trade advice
              </span>
            </div>
          </div>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="chat-body" ref={listRef} aria-live="polite">
          {isEmpty && (
            <div className="chat-intro">
              <p>
                Hi! Tell me your job and I&apos;ll suggest products from our
                range — with trade prices and bulk tiers. I can only recommend
                items we actually stock.
              </p>
              <div className="chat-chips" role="list">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="listitem"
                    className="chat-chip"
                    onClick={() => void send(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              resolveCard={resolveCard}
              streaming={busy && m.role === "assistant"}
            />
          ))}

          {busy &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content.length === 0 && (
              <div className="chat-msg assistant">
                <div className="chat-bubble chat-typing" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
        </div>

        <footer className="chat-foot">
          {!isEmpty && (
            <div className="chat-foot-actions">
              <a
                className="chat-human-link"
                href={mailtoHref}
                onClick={() =>
                  toast.success("Opening your email — we'll reply fast.")
                }
              >
                <Mail size={13} strokeWidth={2} /> Talk to a human
              </a>
            </div>
          )}
          <form className="chat-input-row" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              maxLength={INPUT_MAX_CHARS}
              placeholder="Ask about a product or job…"
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              aria-label="Message the assistant"
            />
            <button
              type="submit"
              className="chat-send"
              disabled={busy || input.trim().length === 0}
              aria-label="Send message"
            >
              {busy ? (
                <Loader2 size={18} strokeWidth={2.2} className="chat-spin" />
              ) : (
                <Send size={18} strokeWidth={2.2} />
              )}
            </button>
          </form>
          <p className="chat-disclaimer">
            AI assistant — please verify specifications before purchase.
          </p>
        </footer>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Message bubble + inline product card.
 * ───────────────────────────────────────────────────────────────────────── */

function MessageBubble({
  message,
  resolveCard,
  streaming,
}: {
  message: ChatMessage;
  resolveCard: (sku: string) => ChatProductCard | null;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const resolved = (message.skus ?? [])
    .map((sku) => resolveCard(sku))
    .filter((c): c is ChatProductCard => !!c);

  return (
    <div className={"chat-msg " + (isUser ? "user" : "assistant")}>
      {message.content.length > 0 && (
        <div className="chat-bubble">
          {message.content}
          {streaming && message.content.length > 0 && (
            <span className="chat-caret" aria-hidden="true" />
          )}
        </div>
      )}
      {resolved.length > 0 && (
        <div className="chat-cards">
          {resolved.map((c) => (
            <ChatProductCardView key={c.sku} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChatProductCardView({ card }: { card: ChatProductCard }) {
  const add = useCart((s) => s.add);
  const setCartOpen = useCart((s) => s.setOpen);
  const outOfStock = card.stock === "out" || !card.priceAvailable;

  return (
    <article className="chat-card">
      <div className="chat-card-thumb">
        {card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            sizes="56px"
            style={{ objectFit: "contain", padding: 4 }}
            unoptimized={card.image.endsWith(".webp")}
          />
        ) : (
          <Placeholder
            ratio="1 / 1"
            cap={card.brand.split(" ")[0]}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
      </div>
      <div className="chat-card-info">
        <div className="chat-card-brand">{card.brand}</div>
        <div className="chat-card-name">{card.name}</div>
        <div className="chat-card-meta">
          {card.priceAvailable ? (
            <span className="chat-card-price">
              £{plain2(card.basePrice)}{" "}
              <span className="chat-card-vat">ex VAT</span>
            </span>
          ) : (
            <span className="chat-card-vat">Price on request</span>
          )}
          <span className="chat-card-sku">SKU {card.sku}</span>
        </div>
      </div>
      <button
        type="button"
        className="chat-card-add"
        aria-label={`Add ${card.name} to basket`}
        disabled={outOfStock}
        onClick={() => {
          add(
            {
              sku: card.sku,
              variantId: card.variantId,
              name: card.name,
              brand: card.brand,
              image: card.image,
              basePrice: card.basePrice,
            },
            1,
          );
          toast.success(`Added to basket — ${card.name}`);
          setCartOpen(true);
        }}
      >
        {outOfStock ? "Out" : <ShoppingCart size={16} strokeWidth={2} />}
      </button>
    </article>
  );
}
