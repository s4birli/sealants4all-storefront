import "server-only";

import type { Product } from "@/lib/data/types";
import { deriveTiers, round2 } from "@/lib/pricing";
import { tierForQty } from "@/lib/fmt";
import { resolveSku, type Retrieval } from "@/lib/chat/retrieve";

/** UK standard VAT rate, matching the cart's totals (sub * 0.2). */
const VAT_RATE = 0.2;

/**
 * Anthropic tool definition for the price/bulk-maths tool. The model must call
 * this for ANY pricing or quantity arithmetic — it never computes prices itself.
 *
 * Typed loosely as the SDK's Tool shape is `input_schema: Record<string,unknown>`;
 * keeping this as a plain object avoids importing the SDK at module load.
 */
export const GET_QUOTE_TOOL = {
  name: "get_quote",
  description:
    "Compute the exact ex-VAT and inc-VAT unit price, the line total, and the applied bulk tier for a given product SKU and quantity. Use this for every price, bulk-discount, or line-total figure you state. Only pass a SKU that appears in the RETRIEVED PRODUCTS block.",
  input_schema: {
    type: "object",
    properties: {
      sku: {
        type: "string",
        description:
          "The exact product SKU from the RETRIEVED PRODUCTS block (case-sensitive).",
      },
      quantity: {
        type: "integer",
        description: "Number of units the buyer wants. Must be 1 or more.",
        minimum: 1,
      },
    },
    required: ["sku", "quantity"],
    additionalProperties: false,
  },
} as const;

/** Raw input the model passes to get_quote (validated in {@link runGetQuote}). */
export type GetQuoteInput = {
  sku: string;
  quantity: number;
};

/** Successful quote payload returned to the model as the tool_result. */
export type GetQuoteResult = {
  sku: string;
  name: string;
  brand: string;
  quantity: number;
  /** Unit price ex VAT at the applied tier. */
  unit_ex_vat: number;
  /** Unit price inc VAT (20%) at the applied tier. */
  unit_inc_vat: number;
  /** quantity * unit_inc_vat. */
  line_total_inc_vat: number;
  /** Minimum quantity of the applied bulk tier (1/12/24/100/500). */
  tier_min: number;
  currency: "GBP";
};

/** Error payload returned to the model (so it can recover, not hallucinate). */
export type GetQuoteError = { error: string };

export type GetQuoteOutput = GetQuoteResult | GetQuoteError;

function isQuoteError(out: GetQuoteOutput): out is GetQuoteError {
  return "error" in out;
}

export { isQuoteError };

/**
 * Server-side implementation of get_quote. Validates the model's input,
 * resolves the SKU (preferring the retrieved set), then computes pricing with
 * the same primitives the cart uses: `tierForQty(deriveTiers(price), qty)`.
 *
 * Never throws on bad model input — returns a `{ error }` object the route
 * forwards as the tool_result so the model can correct course.
 */
export async function runGetQuote(
  input: unknown,
  retrieval: Retrieval,
): Promise<GetQuoteOutput> {
  const parsed = parseInput(input);
  if ("error" in parsed) return parsed;

  const product = await resolveSku(parsed.sku, retrieval);
  if (!product) {
    return {
      error: `No product found for SKU "${parsed.sku}". Only quote SKUs listed in the RETRIEVED PRODUCTS block.`,
    };
  }
  if (!product.priceAvailable || product.price <= 0) {
    return {
      error: `Price for SKU "${product.sku}" is not available online (POA). Tell the buyer to contact the team for a price.`,
    };
  }

  return quoteFor(product, parsed.quantity);
}

/** Pure quote computation for a resolved product + quantity. */
export function quoteFor(product: Product, quantity: number): GetQuoteResult {
  const tiers = deriveTiers(product.price);
  const tier = tierForQty(tiers, quantity);
  const unitExVat = round2(tier.price);
  const unitIncVat = round2(unitExVat * (1 + VAT_RATE));
  const lineTotalIncVat = round2(unitIncVat * quantity);

  return {
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    quantity,
    unit_ex_vat: unitExVat,
    unit_inc_vat: unitIncVat,
    line_total_inc_vat: lineTotalIncVat,
    tier_min: tier.min,
    currency: "GBP",
  };
}

/** Coerce/validate the model-supplied tool input. */
function parseInput(input: unknown): GetQuoteInput | GetQuoteError {
  if (typeof input !== "object" || input === null) {
    return { error: "Invalid input: expected an object with sku and quantity." };
  }
  const obj = input as Record<string, unknown>;

  const sku = typeof obj.sku === "string" ? obj.sku.trim() : "";
  if (!sku) return { error: "Invalid input: 'sku' must be a non-empty string." };

  const rawQty = obj.quantity;
  const qty =
    typeof rawQty === "number"
      ? rawQty
      : typeof rawQty === "string"
        ? Number(rawQty)
        : NaN;
  if (!Number.isFinite(qty) || qty < 1) {
    return { error: "Invalid input: 'quantity' must be a number of 1 or more." };
  }

  return { sku, quantity: Math.floor(qty) };
}
