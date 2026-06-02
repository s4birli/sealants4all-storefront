import { setDefaultResultOrder } from "node:dns";
import { NextResponse } from "next/server";

import { clientKeyFromRequest, rateLimit } from "@/lib/chat/rate-limit";

// Prefer IPv4: hosts like photon.komoot.io resolve IPv6-first, and Node's fetch
// (undici) can hang on an unroutable IPv6 address until timeout
// — while curl falls back to IPv4. This makes outbound lookups reliable on
// IPv6-broken networks.
setDefaultResultOrder("ipv4first");

// Server-only proxy for UK postcode -> deliverable-address lookups. Two tiers:
//
//   PRIMARY  (paid, complete coverage): Ideal Postcodes (PAF). Used when the
//            server-side IDEAL_POSTCODES_API_KEY env var is set. This is the
//            ONLY source with genuinely complete UK delivery-point coverage
//            (Royal Mail PAF). The api_key never reaches the browser.
//   DEFAULT  (free): OpenStreetMap, enumerated via Photon /reverse around the
//            postcode centroid. Used when no paid key is configured.
//
// WHY PHOTON /reverse (not Overpass-forward): live testing (2026-06) showed the
// old public-Overpass path was slow (10-25s, frequently throttled) and returned
// very few rows — RG4 8DD = 1 address in ~25s. The SAME OSM data via
// postcodes.io centroid -> Photon /reverse returned 33 addresses in <1s, because
// Photon expands OSM addr:interpolation number-ranges that an exact-tag Overpass
// query misses. So the free path is now: postcodes.io centroid (~300ms, no key)
// -> Photon /reverse?lat&lon (~0.5-1s) -> filter to the target postcode. Net:
// ~25x faster and far more complete on identical OSM data, no new API key.
//
// HONEST COVERAGE LIMIT: this is still OpenStreetMap, so completeness vs PAF is
// partial and uneven — many postcodes return few or zero addresses (OSM has
// addr:housenumber on ~5M GB objects vs PAF's ~31M delivery points). Photon
// improves SPEED and RELIABILITY and recovers interpolated houses, but it is NOT
// a PAF replacement. For complete coverage set IDEAL_POSTCODES_API_KEY. ODbL-
// licensed: we return the required "© OpenStreetMap contributors" attribution so
// the checkout can display it near the dropdown.
//
// PRODUCTION NOTE: photon.komoot.io is an explicit no-SLA demo (~1 req/s fair
// use; Komoot states it is not for business clients). The per-postcode in-memory
// cache + the shared per-IP rate limiter keep our volume well within fair use,
// but for a real commercial checkout you should SELF-HOST Photon (Apache-2.0,
// prebuilt GB index) and point PHOTON_BASE at it — the /reverse contract and
// mapping below are identical, just without the throttling/terms risk. See the
// self-host notes accompanying this change.
//
// Either way the response shape stays { configured, addresses[] } (+ optional
// source/attribution) that lib/medusa-store.ts findAddresses() consumes. When a
// source returns no street-level results we still set configured:true with an
// empty list, so the checkout cleanly falls back to its postcodes.io city-only
// lookup + manual entry. The handler never 5xx's the free path — a Photon
// failure degrades to an empty list at HTTP 200, never blocking the checkout.
//
// Node runtime + never response-cached so each request runs the handler (and the
// per-IP rate limiter). A small in-memory per-postcode cache lives inside the
// module to respect fair use and make repeat lookups instant.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -- Ideal Postcodes (paid PAF) contract, live-verified ----------------------
// Endpoint: GET https://api.ideal-postcodes.co.uk/v1/postcodes/{postcode}
//   - key is the QUERY param `api_key` (underscore — NOT `api-key`)
//   - postcode is space/case-insensitive ("RG4 8DD" or "rg48dd" both work)
// Success : HTTP 200, body { result: Address[], code: 2000, message: "Success" }
//           -> verify code === 2000, not just res.ok.
// No match: HTTP 404, body { code: 4040, message: "Postcode not found", ... }
//           -> treat as "no addresses", NOT an error.
// Bad key : HTTP 401, body { code: 4010, ... }  -> upstream failure (502).
// Address object has line_1/line_2/line_3, post_town (UPPERCASE), county,
// postcode. There is NO town_or_city, NO line_4, NO formatted_address.
const PROVIDER_BASE = "https://api.ideal-postcodes.co.uk/v1/postcodes";
const SUCCESS_CODE = 2000;
const NOT_FOUND_CODE = 4040;
const PROVIDER_TIMEOUT_MS = 6_000;

// -- postcodes.io (free centroid) contract, live-verified --------------------
// Endpoint: GET https://api.postcodes.io/postcodes/{postcode}  (no key)
// Success : HTTP 200, body { status: 200, result: { latitude, longitude, ... } }
// No match: HTTP 404, body { status: 404, error: "Postcode not found" }
// We only need result.latitude / result.longitude here (the checkout already
// uses postcodes.io separately for town/region fill). ~300ms, OGL-licensed.
const POSTCODES_IO_BASE = "https://api.postcodes.io/postcodes";
const POSTCODES_IO_TIMEOUT_MS = 5_000;

// -- Photon /reverse (free OSM enumeration) contract, live-verified ----------
// Endpoint: GET {PHOTON_BASE}/reverse?lat=..&lon=..&limit=50
//   - REVERSE around the postcode centroid is what enumerates houses. The
//     forward /api?q={postcode} endpoint returns ONLY the postcode centroid
//     (1 feature, 0 housenumbers) — do NOT use it to list addresses.
//   - Returns GeoJSON: { features: [{ properties: { housenumber, street, city,
//     postcode, name, state, district, ... } }] }. A feature is a real address
//     only when it has both `housenumber` and `street`.
//   - The result is RADIUS-based, so it leaks ADJACENT postcodes (RG4 8DD's
//     radius also returns RG4 8BW houses). We MUST filter
//     properties.postcode === the target spaced postcode.
//   - `state` is the country/region ("England"), NOT a county; `county` is
//     almost always null. We leave our `county` blank rather than fabricate it.
// A descriptive User-Agent is sent per OSM/Photon policy. Self-host for prod:
// set PHOTON_BASE to your instance (same /reverse contract, no throttling).
const PHOTON_BASE = process.env.PHOTON_BASE || "https://photon.komoot.io";
// Pull up to 50 features and filter to the target postcode — comfortably covers
// a typical UK postcode's house count (live: RG4 8DD = 33 of 50).
const PHOTON_LIMIT = 50;
// Live measured: postcodes.io ~300ms + Photon ~0.4-1.0s. 7s leaves generous
// headroom while still failing fast to manual entry on a bad day.
const PHOTON_TIMEOUT_MS = 7_000;
// Identify ourselves per OSM/Photon policy (app + contact). Sent on every call.
const GEO_USER_AGENT =
  "sealants4all-storefront/1.0 (+https://sealants4all.co.uk; checkout address lookup)";


// ODbL attribution string surfaced to the client for the OSM source. Show this
// near the address dropdown in the checkout (see lib/medusa-store.ts note).
export const OSM_ATTRIBUTION = "Address data © OpenStreetMap contributors";

// In-memory per-postcode address cache, keyed by "<source>:<no-space postcode>"
// so the free OSM and paid PAF results for the same postcode never collide.
// Address data changes slowly, so caching is safe and serves BOTH tiers:
//   - free (OSM): ODbL-permitted, and our main fair-use protection for the
//     Photon demo endpoint.
//   - paid (PAF): stops a repeat lookup of the same postcode from burning an
//     Ideal Postcodes credit every time — directly lowers the per-lookup bill.
// Positive results cached 24h, empty (sparse/unknown postcode) results cached 1h
// so they don't re-hit the upstream (or re-spend a credit) for junk.
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000; // 24h for results
const CACHE_EMPTY_TTL_MS = 60 * 60 * 1_000; // 1h for empty
const CACHE_MAX = 5_000; // hard cap on map size
type AddressCacheEntry = { expires: number; addresses: LookupAddress[] };
const addressCache = new Map<string, AddressCacheEntry>();

// UK postcodes are at most 8 chars (incl. the single space), e.g. "EC1A 1BB".
const MAX_POSTCODE_LEN = 8;
// Structural UK-postcode check on the no-space, uppercased value (e.g. "RG48DD").
// The old /^[A-Z0-9]{5,7}$/ accepted any 5-7 alphanumerics, so well-formed junk
// like "ZZZZZZZ"/"AAAAAA"/"ABC123" sailed through to the PAID Ideal Postcodes
// path and burned a credit each. This real-format check rejects that junk LOCALLY
// (before idealPostcodesLookup runs). Covers every UK format incl. the GIR 0AA
// special case; inward letters exclude C,I,K,M,O,V per Royal Mail PAF.
const POSTCODE_RE =
  /^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[ABD-HJLNP-UW-Z]{2})$/;

/** A single deliverable address as exposed to our own client (checkout form). */
export type LookupAddress = {
  line_1: string;
  line_2: string;
  city: string;
  county: string;
  postcode: string;
};

export type LookupResponse = {
  /**
   * true when a street-level source ran (paid OR free OSM). The checkout shows
   * the address dropdown / autofills from `addresses`. When this is true but
   * `addresses` is empty, the checkout falls back to its postcodes.io city
   * lookup + manual entry. false only when NO street-level source is available
   * (no paid key AND the free path could not run) — same fallback applies.
   */
  configured: boolean;
  addresses: LookupAddress[];
  /** Which source produced the addresses (for debugging / UI attribution). */
  source?: "ideal-postcodes" | "osm";
  /** ODbL attribution to display when source === "osm". Omitted otherwise. */
  attribution?: string;
};

/** The Ideal Postcodes address fields we consume (confirmed names only). */
type IdealPostcodesAddress = {
  line_1: string;
  line_2: string;
  line_3: string;
  post_town: string;
  county: string;
  postcode: string;
};

type IdealPostcodesEnvelope = {
  code: number;
  message: string;
  result?: IdealPostcodesAddress[];
};

/** postcodes.io single-postcode envelope (only the fields we read). */
type PostcodesIoEnvelope = {
  status: number;
  result?: { latitude?: number; longitude?: number } | null;
};

/** One Photon GeoJSON feature's properties (only the address fields we use). */
type PhotonProperties = {
  housenumber?: string;
  street?: string;
  name?: string;
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  county?: string;
  postcode?: string;
};

type PhotonEnvelope = {
  features?: { properties?: PhotonProperties }[];
};

/** Collapse runs of whitespace and uppercase, so "rg4 8dd" -> "RG48DD". */
function normalisePostcode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Re-insert the canonical single space before the 3-char inward code, so the
 * no-space "RG48DD" -> "RG4 8DD". Both OSM (addr:postcode) and Photon store the
 * postcode in this spaced form, so we filter Photon features against it exactly.
 */
function spacedPostcode(noSpace: string): string {
  return noSpace.replace(/^(.+?)(\d\w\w)$/, "$1 $2");
}

/** post_town comes back UPPERCASE (e.g. "LONDON"); title-case it for the form. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (_m, c: string) => c.toUpperCase());
}

/** Map a paid-provider address to our client shape, dropping empty fields. */
function toLookupAddress(a: IdealPostcodesAddress): LookupAddress {
  // PAF gives up to three print-ready lines. For sub-premise addresses (flats,
  // units, named businesses) line_3 carries the THOROUGHFARE — live example
  // RG4/E14: line_1 "Subway", line_2 "Unit 3b", line_3 "185 Marsh Wall". Our
  // checkout form has only one secondary line (address_2), so merge lines 2+3
  // there — dropping line_3 would lose the street and break delivery.
  const line_2 = [a.line_2, a.line_3]
    .map((l) => (l || "").trim())
    .filter(Boolean)
    .join(", ");
  return {
    line_1: a.line_1 || "",
    line_2,
    city: a.post_town ? titleCase(a.post_town) : "",
    county: a.county || "",
    postcode: a.postcode || "",
  };
}

// -- OSM address helpers (used by the Photon mapper) -------------------------

/** Stable dedupe key — OSM commonly repeats an address as node + building way. */
function addressKey(a: LookupAddress): string {
  return `${a.line_1.trim().toLowerCase()}|${a.line_2.trim().toLowerCase()}`;
}

/** Leading integer of a line ("12-14 Foo St" -> 12, "Flat A" -> null). */
function leadingInt(line: string): number | null {
  const m = line.match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Numeric-aware house-number sort: 1, 2, 2A, 10, 12-14 (not lexical 1, 10, 2).
 * Elements whose house number has no leading integer sort last, by street.
 */
function compareAddresses(a: LookupAddress, b: LookupAddress): number {
  const na = leadingInt(a.line_1);
  const nb = leadingInt(b.line_1);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.line_1.localeCompare(b.line_1, undefined, { numeric: true });
}

/**
 * Dedupe (keeping the richer row when one carries a city) and numeric-sort a
 * raw address list, so the Photon mapper produces an ordered, gap-free dropdown.
 */
function dedupeAndSort(rows: LookupAddress[]): LookupAddress[] {
  const seen = new Map<string, LookupAddress>();
  for (const addr of rows) {
    const key = addressKey(addr);
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, addr);
    } else if (!prev.city && addr.city) {
      // Prefer the variant that carries a city if the first lacked it.
      seen.set(key, addr);
    }
  }
  return [...seen.values()].sort(compareAddresses);
}

// -- Photon (primary free) mapping -------------------------------------------

/** Map one Photon feature to our address shape (or null if not a usable house). */
function photonFeatureToAddress(
  props: PhotonProperties,
  spacedPc: string,
): LookupAddress | null {
  // line_1 = house number + street (the requirement). A Photon feature is a real
  // deliverable address only when it has BOTH a house number and a street; a
  // bare `name` (a named building/POI) is not a numbered delivery point.
  const houseNumber = props.housenumber || "";
  const street = props.street || "";
  if (!houseNumber || !street) return null;
  const line_1 = `${houseNumber} ${street}`.trim();
  return {
    line_1,
    // Photon's `name` is a building/POI name (e.g. "The Old Bakery") that PAF
    // would carry as line_2 / a sub-building; surface it when it isn't just the
    // street/number we already used.
    line_2: props.name && props.name !== line_1 ? props.name : "",
    city: props.city || props.town || props.village || props.district || "",
    // Photon's `state` is "England"/region, not a county, and `county` is almost
    // always null — leave blank rather than fabricate (the checkout's
    // postcodes.io fill supplies the region separately).
    county: props.county || "",
    postcode: props.postcode || spacedPc,
  };
}

/**
 * Fetch the postcode centroid (postcodes.io) then enumerate house-level
 * addresses around it via Photon /reverse. Filters to the target spaced postcode
 * (Photon's radius leaks adjacent postcodes), maps, dedupes and sorts. Returns a
 * (possibly empty) list — never throws. ~0.4-1.0s end-to-end (live-measured).
 */
async function queryPhoton(noSpacePc: string): Promise<LookupAddress[]> {
  const spacedPc = spacedPostcode(noSpacePc);

  // 1) Centroid from postcodes.io (free, no key, ~300ms). No centroid -> no
  //    reverse enumeration possible; return empty so we fall through.
  let lat: number | undefined;
  let lon: number | undefined;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), POSTCODES_IO_TIMEOUT_MS);
    let env: PostcodesIoEnvelope | null = null;
    try {
      const res = await fetch(
        `${POSTCODES_IO_BASE}/${encodeURIComponent(spacedPc)}`,
        {
          signal: ctrl.signal,
          headers: { Accept: "application/json", "User-Agent": GEO_USER_AGENT },
          cache: "no-store",
        },
      );
      // 404 = unknown postcode: a clean "no addresses", not an error.
      if (res.ok) env = (await res.json()) as PostcodesIoEnvelope;
    } finally {
      clearTimeout(timer);
    }
    lat = env?.result?.latitude;
    lon = env?.result?.longitude;
  } catch {
    return [];
  }
  if (typeof lat !== "number" || typeof lon !== "number") return [];

  // 2) Reverse-geocode around the centroid via Photon. limit=50 features, then
  //    keep only those whose postcode matches the target (radius leaks
  //    neighbours). Any failure -> empty (degrades to manual entry).
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PHOTON_TIMEOUT_MS);
    let body: PhotonEnvelope | null = null;
    try {
      const url =
        `${PHOTON_BASE}/reverse?lat=${encodeURIComponent(String(lat))}` +
        `&lon=${encodeURIComponent(String(lon))}&limit=${PHOTON_LIMIT}`;
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json", "User-Agent": GEO_USER_AGENT },
        cache: "no-store",
      });
      if (!res.ok) return [];
      body = (await res.json()) as PhotonEnvelope;
    } finally {
      clearTimeout(timer);
    }
    const features = Array.isArray(body?.features) ? body.features : [];
    const rows: LookupAddress[] = [];
    for (const f of features) {
      const props = f?.properties;
      if (!props) continue;
      // CRITICAL: drop addresses from adjacent postcodes the radius pulled in.
      if (props.postcode !== spacedPc) continue;
      const addr = photonFeatureToAddress(props, spacedPc);
      if (addr) rows.push(addr);
    }
    return dedupeAndSort(rows);
  } catch {
    return [];
  }
}

/**
 * Free OSM enumeration via Photon /reverse — fast (~0.4s) and, by expanding
 * addr:interpolation ranges, far more complete than an exact-tag Overpass query
 * on the same OSM data. Photon is the SOLE free source: a Photon miss means OSM
 * genuinely has no address there, so a miss degrades straight to manual entry
 * (no slow public-Overpass fallback — it only added ~8s for the same empty result).
 */
async function queryFreeOsm(noSpacePc: string): Promise<LookupAddress[]> {
  return queryPhoton(noSpacePc);
}

// -- Cache -------------------------------------------------------------------

/** Read + expire the per-postcode address cache. Returns addresses or null. */
function readAddressCache(key: string, now: number): LookupAddress[] | null {
  const hit = addressCache.get(key);
  if (hit && hit.expires > now) return hit.addresses;
  if (hit) addressCache.delete(key);
  return null;
}

/** Store a result, evicting expired/oldest entries to stay bounded. */
function writeAddressCache(
  key: string,
  addresses: LookupAddress[],
  now: number,
): void {
  if (addressCache.size >= CACHE_MAX) {
    for (const [k, v] of addressCache) if (v.expires <= now) addressCache.delete(k);
    if (addressCache.size >= CACHE_MAX) {
      // Last resort: drop the oldest-inserted entry (Map preserves order).
      const oldest = addressCache.keys().next().value;
      if (oldest !== undefined) addressCache.delete(oldest);
    }
  }
  const ttl = addresses.length > 0 ? CACHE_TTL_MS : CACHE_EMPTY_TTL_MS;
  addressCache.set(key, { expires: now + ttl, addresses });
}

// -- Handler -----------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  // Per-IP rate limit before any network path (shared limiter with /api/chat).
  // Applies to the free path too, to keep the Photon demo endpoint within fair
  // use.
  const limit = rateLimit(clientKeyFromRequest(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { configured: true, addresses: [], error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const raw = new URL(req.url).searchParams.get("postcode") ?? "";
  const postcode = normalisePostcode(raw);

  // Reject malformed postcodes locally so scrapers can't burn paid credits or
  // hammer the free upstreams on junk. Invalid postcode == "no addresses".
  if (
    !postcode ||
    postcode.length > MAX_POSTCODE_LEN ||
    !POSTCODE_RE.test(postcode)
  ) {
    return NextResponse.json<LookupResponse>({ configured: true, addresses: [] });
  }

  const apiKey = process.env.IDEAL_POSTCODES_API_KEY;

  // PRIMARY: paid Ideal Postcodes (PAF) when a key is configured — complete UK
  // coverage. The free OSM path below is a best-effort fallback, not equivalent.
  if (apiKey) {
    return idealPostcodesLookup(postcode, apiKey);
  }

  // FREE DEFAULT: OpenStreetMap via Photon /reverse. Cache-first (namespaced
  // "osm:" so it never collides with a paid result for the same postcode);
  // never 5xx's. ~0.4-1.0s on a cache miss vs the old ~25s.
  const now = Date.now();
  const cacheKey = `osm:${postcode}`;
  const cached = readAddressCache(cacheKey, now);
  const addresses = cached ?? (await queryFreeOsm(postcode));
  if (!cached) writeAddressCache(cacheKey, addresses, now);

  return NextResponse.json<LookupResponse>({
    configured: true,
    addresses,
    source: "osm",
    attribution: OSM_ATTRIBUTION,
  });
}

/** The paid path: PAF lookup with a 24h per-postcode cache, source:"ideal-postcodes". */
async function idealPostcodesLookup(
  postcode: string,
  apiKey: string,
): Promise<Response> {
  // Serve repeats of the same postcode from cache so we don't spend a credit on
  // every lookup. The cache key is the postcode only (NEVER the api_key), and is
  // namespaced "paf:" so it can't be served a stale free-OSM result. PAF data
  // changes on a slow (≈monthly) epoch, so a 24h cache is safe. Only successes
  // and clean 404s are cached below — upstream failures are not, so they retry.
  const now = Date.now();
  const cacheKey = `paf:${postcode}`;
  const cached = readAddressCache(cacheKey, now);
  if (cached) {
    return NextResponse.json<LookupResponse>({
      configured: true,
      addresses: cached,
      source: "ideal-postcodes",
    });
  }

  const url =
    `${PROVIDER_BASE}/${encodeURIComponent(postcode)}` +
    `?api_key=${encodeURIComponent(apiKey)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      // no-store keeps the api_key-bearing URL out of Next's fetch data cache.
      // (We cache the RESULT ourselves in-memory, keyed by postcode only — the
      // key is never part of any cache key.)
      cache: "no-store",
    });
  } catch {
    clearTimeout(timer);
    // Network/timeout/abort — upstream failure.
    return NextResponse.json(
      { configured: true, addresses: [], error: "Address lookup unavailable." },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  let body: IdealPostcodesEnvelope | null = null;
  try {
    body = (await res.json()) as IdealPostcodesEnvelope;
  } catch {
    body = null;
  }

  // Explicit not-found: HTTP 404 + code 4040. This is a clean "no addresses"
  // state, NOT an error — the checkout shows manual entry / postcodes.io. Cache
  // the empty result (1h) so a re-typed unknown postcode doesn't re-spend.
  if (res.status === 404 || body?.code === NOT_FOUND_CODE) {
    writeAddressCache(cacheKey, [], now);
    return NextResponse.json<LookupResponse>({
      configured: true,
      addresses: [],
      source: "ideal-postcodes",
    });
  }

  // Anything that isn't a clean success envelope is an upstream failure
  // (invalid key 401/4010, balance exhausted 402, rate limit 429, 5xx, ...).
  if (
    !res.ok ||
    !body ||
    body.code !== SUCCESS_CODE ||
    !Array.isArray(body.result)
  ) {
    return NextResponse.json(
      { configured: true, addresses: [], error: "Address lookup failed." },
      { status: 502 },
    );
  }

  const addresses = body.result.map(toLookupAddress);
  writeAddressCache(cacheKey, addresses, now);
  return NextResponse.json<LookupResponse>({
    configured: true,
    addresses,
    source: "ideal-postcodes",
  });
}
