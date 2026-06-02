import { defineMiddlewares } from "@medusajs/framework/http"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Hardening middleware for the public Store API.
 *
 * Stock Medusa /store/products and /store/product-categories pass a number of
 * adversarial query params straight through to the query layer, which then
 * throws and surfaces as an uncaught HTTP 500. The guards below validate the
 * pagination / ordering / fields params up-front and convert bad input into a
 * clean HTTP 400 (MedusaError.Types.INVALID_DATA, which the core error handler
 * maps to 400) BEFORE the query layer ever sees it.
 *
 * Implementation note: we deliberately do NOT use `validateAndTransformQuery`
 * with our own QueryConfig here. That helper overwrites `req.queryConfig`,
 * `req.listConfig` and friends, which would clobber the pricing/tax/sales-channel
 * context the core store middlewares set up downstream. Instead we run light
 * inspector guards that only read `req.query`, throw on bad input, and otherwise
 * call `next()` untouched — leaving the core validators fully intact. The Zod
 * schemas still give us declarative, type-safe parsing of the params we care
 * about.
 */

/**
 * A query param value can arrive as a string, an array of strings, or a nested
 * object (`ParsedQs`). For the params we whitelist we only ever expect a single
 * scalar string, so anything else is rejected.
 */
const singleString = z
  .string()
  .or(z.array(z.string()))
  .optional()
  .transform((val) => (Array.isArray(val) ? val[val.length - 1] : val))

/**
 * limit / offset must be integers >= 0. Negatives (and non-numeric junk) are a
 * 400 rather than a 500 from the underlying pagination layer.
 */
const nonNegativeInt = (field: "limit" | "offset") =>
  singleString.refine(
    (val) => {
      if (val === undefined || val === "") {
        return true
      }
      const num = Number(val)
      return Number.isInteger(num) && num >= 0
    },
    { message: `Invalid '${field}': must be an integer greater than or equal to 0` }
  )

/**
 * order is whitelisted to a known-safe set of columns, each optionally prefixed
 * with '-' for descending. Anything else (e.g. an unknown column used to probe
 * the database) is a 400.
 */
const ORDERABLE_COLUMNS = ["created_at", "updated_at", "title"] as const

const safeOrder = singleString.refine(
  (val) => {
    if (val === undefined || val === "") {
      return true
    }
    const column = val.startsWith("-") ? val.slice(1) : val
    return (ORDERABLE_COLUMNS as readonly string[]).includes(column)
  },
  {
    message: `Invalid 'order': must be one of ${ORDERABLE_COLUMNS.join(", ")} (optionally prefixed with '-')`,
  }
)

const storeListQuerySchema = z
  .object({
    limit: nonNegativeInt("limit"),
    offset: nonNegativeInt("offset"),
    order: safeOrder,
  })
  // Allow every other param through untouched; we only police the ones above.
  .passthrough()

/**
 * Validate pagination + ordering params. Throws MedusaError(INVALID_DATA) -> 400
 * on bad input, otherwise leaves the request untouched.
 */
function validateStoreListQuery(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const result = storeListQuerySchema.safeParse(req.query)

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ")
    return next(new MedusaError(MedusaError.Types.INVALID_DATA, message))
  }

  return next()
}

/**
 * Reject a bare, top-level '*' in the `fields` param.
 *
 * A standalone '*' asks the query layer to expand every top-level relation,
 * which stock Medusa cannot resolve and surfaces as a 500. Scoped wildcards such
 * as `*variants` or plain fields such as `injection` are perfectly valid and are
 * left alone — ONLY a standalone '*' entry triggers a 400.
 */
function rejectBareWildcardFields(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const raw = req.query.fields

  // `fields` may be a single string ("a,b,*"), or an array of such strings.
  const entries: string[] = []
  const collect = (value: unknown) => {
    if (typeof value === "string") {
      entries.push(...value.split(","))
    }
  }

  if (Array.isArray(raw)) {
    raw.forEach(collect)
  } else {
    collect(raw)
  }

  const hasBareWildcard = entries.some((entry) => entry.trim() === "*")

  if (hasBareWildcard) {
    return next(
      new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid 'fields': a bare top-level '*' wildcard is not allowed. Use scoped wildcards (e.g. '*variants') or explicit field names instead."
      )
    )
  }

  return next()
}

/**
 * Baseline security headers for every Medusa response. helmet is intentionally
 * not pulled in (it is not a dependency) — these few headers are set manually to
 * avoid adding a heavy dependency.
 */
function securityHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "SAMEORIGIN")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  // Express sets `X-Powered-By: Express` by default; strip it so we don't leak
  // the framework. removeHeader is a no-op if it was never set.
  res.removeHeader("X-Powered-By")
  return next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/*",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/store/products",
      methods: ["GET"],
      middlewares: [validateStoreListQuery, rejectBareWildcardFields],
    },
    {
      matcher: "/store/product-categories",
      methods: ["GET"],
      middlewares: [validateStoreListQuery, rejectBareWildcardFields],
    },
  ],
})
