import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const HEADERS = [
  "invoice_number",
  "date",
  "customer",
  "email",
  "country",
  "net_ex_vat",
  "shipping",
  "vat",
  "gross_total",
  "currency",
];

function csvCell(v: unknown): string {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection: a cell that opens with one of
  // these chars can execute when the CSV is opened in Excel/Sheets. Customer
  // name/email come from checkout (user-controlled), so prefix with a quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function n2(v: unknown): string {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
  return x.toFixed(2);
}

/**
 * GET /admin/finance/accounting-export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Per-order summary CSV for import into Xero / QuickBooks (the A2X alternative).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { from, to } = req.query as { from?: string; to?: string };

  const filters: Record<string, unknown> = {};
  const createdAt: Record<string, string> = {};
  if (from) createdAt.$gte = `${from}T00:00:00.000Z`;
  if (to) createdAt.$lte = `${to}T23:59:59.999Z`;
  if (Object.keys(createdAt).length) filters.created_at = createdAt;

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "display_id",
      "email",
      "created_at",
      "currency_code",
      "item_total",
      "shipping_total",
      "tax_total",
      "total",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.country_code",
    ],
    filters,
  });

  const orders = data as Record<string, unknown>[];
  const lines = [HEADERS.join(",")];
  for (const o of orders) {
    const addr = (o.shipping_address || {}) as Record<string, string>;
    lines.push(
      [
        `INV-${o.display_id ?? o.id}`,
        o.created_at ? new Date(o.created_at as string).toISOString().slice(0, 10) : "",
        `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
        o.email,
        (addr.country_code || "").toUpperCase(),
        n2(o.item_total),
        n2(o.shipping_total),
        n2(o.tax_total),
        n2(o.total),
        (o.currency_code as string)?.toUpperCase() || "GBP",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const filename = `accounting-export${from ? `-${from}` : ""}${to ? `-${to}` : ""}.csv`;
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(lines.join("\n"));
}
