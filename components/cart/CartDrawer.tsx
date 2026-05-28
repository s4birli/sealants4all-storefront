"use client";

import { useEffect, useMemo } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { PRODUCT_BY_SKU } from "@/lib/data/products";
import { plain2, tierForQty } from "@/lib/fmt";
import { Placeholder } from "@/components/ui/Placeholder";
import {
  useCart,
  useCartTotals,
} from "@/components/cart/useCart";

export function CartDrawer() {
  const items = useCart((s) => s.items);
  const update = useCart((s) => s.update);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const totals = useCartTotals();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  const bulkHint = useMemo(() => {
    for (const it of items) {
      const p = PRODUCT_BY_SKU.get(it.sku);
      if (!p) continue;
      const nextTier = p.tiers.find((t) => t.min > it.qty);
      if (!nextTier) continue;
      const need = nextTier.min - it.qty;
      const curT = tierForQty(p.tiers, it.qty);
      const save = (curT.price - nextTier.price) * nextTier.min;
      if (save > 0.5 && need <= 30) return { product: p, need, save, nextTier };
    }
    return null;
  }, [items]);

  const freeShip = totals.sub >= 150;
  const freeShipProgress = Math.min(100, (totals.sub / 150) * 100);
  const remaining = Math.max(0, 150 - totals.sub);

  return (
    <>
      <div
        className={"drawer-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <aside
        className={"drawer" + (open ? " open" : "")}
        aria-hidden={!open}
        aria-label="Basket"
      >
        <div className="drawer-head">
          <div>
            <h3>Your basket</h3>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {items.length} {items.length === 1 ? "line" : "lines"} ·{" "}
              {totals.units} units
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="btn btn-ghost btn-sm"
            aria-label="Close"
          >
            Close ✕
          </button>
        </div>

        {items.length > 0 && (
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            {freeShip ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--success)",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={14} strokeWidth={3} /> You&apos;ve unlocked free UK
                delivery.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--ink)" }}>
                  Add <b>£{plain2(remaining)}</b> more for{" "}
                  <b>free delivery</b>.
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--line)",
                    borderRadius: 999,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${freeShipProgress}%`,
                      background: "var(--cta-500)",
                      transition: "width 240ms ease",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {bulkHint && (
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--line)",
              background: "var(--brand-50)",
              fontSize: 13,
              color: "var(--brand-700)",
            }}
          >
            <b>Tip:</b> Add {bulkHint.need} more {bulkHint.product.name.split(" ")[0]} ({bulkHint.product.sku}) to reach{" "}
            <b>{bulkHint.nextTier.min}+ tier</b> — save £{plain2(bulkHint.save)}{" "}
            on this line.
          </div>
        )}

        <div className="drawer-body">
          {items.length === 0 && (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: "var(--surface)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  color: "var(--muted)",
                }}
              >
                <ShoppingCart size={28} strokeWidth={1.8} />
              </div>
              <h4 style={{ fontSize: 18, marginBottom: 6 }}>
                Your basket is empty
              </h4>
              <p style={{ color: "var(--body)", fontSize: 14 }}>
                Add a product to see bulk pricing kick in.
              </p>
              <button
                onClick={() => setOpen(false)}
                className="btn btn-brand mt-4"
              >
                Continue shopping
              </button>
            </div>
          )}

          {items.map((it) => {
            const p = PRODUCT_BY_SKU.get(it.sku);
            if (!p) return null;
            const tier = tierForQty(p.tiers, it.qty);
            const line = tier.price * it.qty;
            const saving = (p.tiers[0].price - tier.price) * it.qty;
            const tierIdx =
              p.tiers.findIndex((x) => x.min === tier.min) + 1;
            return (
              <div key={it.sku} className="cart-line">
                <div className="thumb">
                  <Placeholder
                    ratio="1 / 1"
                    cap={p.brand.split(" ")[0]}
                    style={{ position: "absolute", inset: 0 }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--brand-500)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.brand}
                  </div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    SKU {p.sku}
                  </div>
                  <div
                    className="tabular"
                    style={{
                      fontSize: 12,
                      color: "var(--body)",
                      marginTop: 4,
                    }}
                  >
                    £{plain2(tier.price)} each · tier {tierIdx}/{p.tiers.length}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="stepper">
                      <button
                        onClick={() => update(p.sku, it.qty - 1)}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        value={it.qty}
                        onChange={(e) =>
                          update(p.sku, parseInt(e.target.value || "0", 10))
                        }
                      />
                      <button
                        onClick={() => update(p.sku, it.qty + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(p.sku)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--muted)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular fw-700">£{plain2(line)}</div>
                  {saving > 0 && (
                    <div
                      className="tabular text-success"
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Saved £{plain2(saving)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <Row label="Subtotal (ex VAT)" value={`£${plain2(totals.sub)}`} />
            <Row label="VAT (20%)" value={`£${plain2(totals.vat)}`} />
            <Row
              label="Delivery"
              value={
                freeShip ? (
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>
                    FREE
                  </span>
                ) : (
                  "Calculated at checkout"
                )
              }
            />
            <div
              style={{
                borderTop: "1px solid var(--line)",
                margin: "10px 0 8px",
              }}
            />
            <Row
              label="Total (inc VAT)"
              value={`£${plain2(totals.total)}`}
              large
            />
            {totals.savings > 0 && (
              <div
                className="tabular text-success"
                style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}
              >
                You saved £{plain2(totals.savings)} vs list price
              </div>
            )}

            <a
              className="btn btn-primary btn-block btn-lg mt-4"
              href="/checkout"
            >
              Proceed to checkout →
            </a>
            <div
              className="flex items-center gap-3 mt-4"
              style={{ justifyContent: "space-between" }}
            >
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Continue shopping
              </button>
              <button
                onClick={clear}
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--muted)" }}
              >
                Clear basket
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  large = false,
}: {
  label: string;
  value: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "4px 0" }}
    >
      <span style={{ fontSize: 13, color: "var(--body)" }}>{label}</span>
      <span
        className="tabular"
        style={{
          fontSize: large ? 18 : 14,
          fontWeight: large ? 700 : 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}
