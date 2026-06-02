/**
 * Client-side Medusa Store API helpers for the checkout flow. Runs in the
 * browser; uses the public backend URL + publishable key.
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

type FetchInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

async function storeApi<T>(path: string, init?: FetchInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/store/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Medusa store/${path} → ${res.status} ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export type Address = {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  postal_code: string;
  country_code: string; // ISO-2 lowercase, e.g. "gb"
  phone?: string;
  company?: string;
};

export type ShippingOption = { id: string; name: string; amount: number };

let cachedRegionId: string | null = null;

export async function getGbpRegionId(): Promise<string> {
  if (cachedRegionId) return cachedRegionId;
  const { regions } = await storeApi<{ regions: { id: string; currency_code: string }[] }>(
    "regions",
  );
  const region = regions.find((r) => r.currency_code === "gbp") || regions[0];
  if (!region) throw new Error("No region configured in Medusa");
  cachedRegionId = region.id;
  return region.id;
}

export type CreateCartItem = { variant_id: string; quantity: number };

export async function createCart(items: CreateCartItem[]): Promise<string> {
  const region_id = await getGbpRegionId();
  const { cart } = await storeApi<{ cart: { id: string } }>("carts", {
    method: "POST",
    body: JSON.stringify({ region_id, items }),
  });
  return cart.id;
}

export async function setCartCustomer(
  cartId: string,
  email: string,
  address: Address,
): Promise<void> {
  await storeApi(`carts/${cartId}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      shipping_address: address,
      billing_address: address,
    }),
  });
}

export async function listShippingOptions(cartId: string): Promise<ShippingOption[]> {
  const { shipping_options } = await storeApi<{ shipping_options: ShippingOption[] }>(
    `shipping-options?cart_id=${cartId}`,
  );
  return shipping_options;
}

export async function setShippingMethod(cartId: string, optionId: string): Promise<void> {
  await storeApi(`carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  });
}

/** Create a payment collection and initialise the system payment session. */
export async function initPaymentSession(cartId: string): Promise<void> {
  const { payment_collection } = await storeApi<{ payment_collection: { id: string } }>(
    "payment-collections",
    { method: "POST", body: JSON.stringify({ cart_id: cartId }) },
  );
  await storeApi(`payment-collections/${payment_collection.id}/payment-sessions`, {
    method: "POST",
    body: JSON.stringify({ provider_id: "pp_system_default" }),
  });
}

export type CompletedOrder = { id: string; display_id?: number; total: number; email: string };

export type PostcodeResult = {
  postcode: string;
  city: string;
  region: string;
  country: string;
};

/**
 * UK postcode → location, via the free, key-less, CORS-enabled postcodes.io.
 * Returns null for an unknown postcode. Gives town/borough + region (not the
 * street/house number — full address autocomplete needs a paid PAF provider).
 */
export async function lookupPostcode(postcode: string): Promise<PostcodeResult | null> {
  const pc = postcode.trim().replace(/\s+/g, "");
  if (!pc) return null;
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`postcode lookup ${res.status}`);
  const data = (await res.json()) as {
    result?: { postcode?: string; admin_district?: string; parish?: string; region?: string; country?: string };
  };
  const r = data.result;
  if (!r) return null;
  return {
    postcode: r.postcode || postcode.toUpperCase(),
    city: r.admin_district || r.parish || r.region || "",
    region: r.region || r.country || "",
    country: r.country || "United Kingdom",
  };
}

/**
 * One deliverable address from our server-side PAF proxy (Ideal Postcodes).
 * Mirrors the shape returned by /api/address-lookup.
 */
export type FoundAddress = {
  line_1: string;
  line_2: string;
  city: string;
  county: string;
  postcode: string;
};

export type FindAddressesResult = {
  /**
   * true when a street-level source ran (paid Ideal Postcodes OR free OSM).
   * The caller shows the dropdown / autofills. When true with an empty list,
   * fall back to the postcodes.io city lookup + manual entry. false only when
   * no street-level source could run at all (same fallback applies).
   */
  configured: boolean;
  addresses: FoundAddress[];
  /** Which source produced the addresses ("osm" | "ideal-postcodes"). */
  source?: "osm" | "ideal-postcodes";
  /**
   * ODbL attribution text to display when the addresses came from OpenStreetMap
   * (source === "osm"). Render this near the address dropdown — it is required
   * by the ODbL licence. Undefined for the paid provider.
   */
  attribution?: string;
};

/**
 * Full-address autocomplete via our server-proxied lookup (/api/address-lookup).
 * The route uses paid Ideal Postcodes (PAF) when a server-side key is set, and
 * otherwise the FREE OpenStreetMap (Photon) source. Either way the paid api_key
 * stays on the server; the browser only ever calls our own route. Returns
 * { configured: true, addresses: [] } when the source ran but found nothing
 * (e.g. sparse OSM coverage or unknown postcode), so the caller can fall back to
 * the free postcodes.io city lookup. When source === "osm", `attribution` carries
 * the required "© OpenStreetMap contributors" text to display by the dropdown.
 */
export async function findAddresses(postcode: string): Promise<FindAddressesResult> {
  const pc = postcode.trim();
  if (!pc) return { configured: true, addresses: [] };
  const res = await fetch(`/api/address-lookup?postcode=${encodeURIComponent(pc)}`);
  if (!res.ok) {
    throw new Error(`address lookup ${res.status}`);
  }
  const data = (await res.json()) as Partial<FindAddressesResult>;
  return {
    configured: data.configured ?? false,
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    source: data.source,
    attribution: data.attribution,
  };
}

export async function completeCart(cartId: string): Promise<CompletedOrder> {
  const result = await storeApi<
    | { type: "order"; order: CompletedOrder }
    | { type: "cart"; error?: { message?: string } }
  >(`carts/${cartId}/complete`, { method: "POST" });
  if (result.type !== "order") {
    throw new Error(result.error?.message || "Order could not be completed");
  }
  return result.order;
}
