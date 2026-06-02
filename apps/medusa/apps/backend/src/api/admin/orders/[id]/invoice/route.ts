import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const COMPANY = {
  name: "All 4 Construction Limited",
  trading: "Sealants4All",
  reg: "Co. No. 12 487 553",
  vat: "VAT GB 348 9921 04",
  address: "London SW18 4GQ, United Kingdom",
  email: "sales@sealants4all.co.uk",
  phone: "020 8050 3959",
};

function money(n: unknown, currency = "GBP"): string {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? "0")) || 0;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v);
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

/** GET /admin/orders/:id/invoice → printable HTML invoice (save as PDF in browser). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderService = req.scope.resolve(Modules.ORDER);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  let order: Record<string, unknown>;
  try {
    order = (await orderService.retrieveOrder(id, {
      relations: ["items", "shipping_address", "shipping_methods"],
    })) as unknown as Record<string, unknown>;
  } catch {
    res.status(404).send("Order not found");
    return;
  }

  // retrieveOrder() returns the computed money totals (tax_total / shipping_total
  // / total) as 0/undefined — that printed a £0.00 VAT invoice with an understated
  // total. The graph query surfaces the REAL calculated totals (same source the
  // accounting CSV uses), fetched WITHOUT the items relation (requesting items via
  // query.graph is what zeroes the totals). Ex-VAT subtotals + one VAT line keep
  // the document a correct UK VAT invoice.
  let totals: Record<string, unknown> = {};
  try {
    const { data } = await query.graph({
      entity: "order",
      fields: ["item_subtotal", "shipping_subtotal", "tax_total", "total"],
      filters: { id },
    });
    totals = (data?.[0] as Record<string, unknown>) || {};
  } catch {
    totals = {};
  }

  const cur = (order.currency_code as string)?.toUpperCase() || "GBP";
  const addr = (order.shipping_address || {}) as Record<string, string>;
  const items = (order.items || []) as Record<string, unknown>[];
  const lineTotal = (it: Record<string, unknown>) =>
    (Number(it.unit_price) || 0) * (Number(it.quantity) || 0);
  const itemsSubtotal = items.reduce((sum, it) => sum + lineTotal(it), 0);
  const subtotal = Number(totals.item_subtotal) || itemsSubtotal;
  const shippingMethods = (order.shipping_methods || []) as Record<string, unknown>[];
  const shipping =
    Number(totals.shipping_subtotal) ||
    shippingMethods.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const tax = Number(totals.tax_total) || 0;
  const grandTotal = Number(totals.total) || subtotal + shipping + tax;
  const rows = items
    .map(
      (it) => `<tr>
        <td>${esc(it.title)}</td>
        <td class="num">${esc(it.quantity)}</td>
        <td class="num">${money(it.unit_price, cur)}</td>
        <td class="num">${money(lineTotal(it), cur)}</td>
      </tr>`,
    )
    .join("");

  const created = order.created_at ? new Date(order.created_at as string).toLocaleDateString("en-GB") : "";

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<title>Invoice #${esc(order.display_id ?? order.id)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 40px; }
  .sheet { max-width: 760px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: 800; }
  .brand span { color: #1E5BBE; }
  .muted { color: #666; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eee; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #666; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { width: 280px; margin-left: auto; font-size: 14px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 800; font-size: 16px; border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; }
  .print { margin: 24px 0; }
  .print button { background: #1E5BBE; color: #fff; border: 0; border-radius: 6px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
  @media print { .print { display: none; } body { padding: 0; } }
</style></head>
<body><div class="sheet">
  <div class="print"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="top">
    <div>
      <div class="brand">Sealants<span>4</span>All</div>
      <div class="muted">${esc(COMPANY.name)}<br>${esc(COMPANY.reg)} · ${esc(COMPANY.vat)}<br>${esc(COMPANY.address)}<br>${esc(COMPANY.email)} · ${esc(COMPANY.phone)}</div>
    </div>
    <div style="text-align:right">
      <h1>INVOICE</h1>
      <div class="muted">No. <b>#${esc(order.display_id ?? order.id)}</b><br>Date: ${esc(created)}</div>
    </div>
  </div>
  <div class="muted"><b>Bill to</b><br>${esc(addr.first_name)} ${esc(addr.last_name)}<br>${esc(addr.address_1)}<br>${esc(addr.city)} ${esc(addr.postal_code)}<br>${esc((addr.country_code || "").toUpperCase())}<br>${esc(order.email)}</div>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit (ex VAT)</th><th class="num">Total (ex VAT)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal (ex VAT)</span><span class="num">${money(subtotal, cur)}</span></div>
    <div><span>Delivery</span><span class="num">${money(shipping, cur)}</span></div>
    <div><span>VAT (20%)</span><span class="num">${money(tax, cur)}</span></div>
    <div class="grand"><span>Total</span><span class="num">${money(grandTotal, cur)}</span></div>
  </div>
  <p class="muted" style="margin-top:40px">Thank you for your order. Goods remain the property of ${esc(COMPANY.name)} until paid in full.</p>
</div></body></html>`);
}
