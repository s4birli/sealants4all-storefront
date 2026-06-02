"use client";

import { useState } from "react";
import Link from "next/link";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart, useCartTotals } from "@/components/cart/useCart";
import { useCatalogSearch } from "@/components/catalog/CatalogSearchProvider";
import { plain2 } from "@/lib/fmt";
import {
  type Address,
  type CompletedOrder,
  type ShippingOption,
  createCart,
  setCartCustomer,
  listShippingOptions,
  setShippingMethod,
  initPaymentSession,
  completeCart,
  lookupPostcode,
  findAddresses,
  type FoundAddress,
} from "@/lib/medusa-store";

type Step = "details" | "shipping" | "done";

const EMPTY: Address & { email: string } = {
  email: "",
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  postal_code: "",
  country_code: "gb",
  phone: "",
};

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const totals = useCartTotals();

  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState(EMPTY);
  const [cartId, setCartId] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<CompletedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcMsg, setPcMsg] = useState<string | null>(null);
  const [addrChoices, setAddrChoices] = useState<FoundAddress[]>([]);
  // ODbL attribution, set only when the address list came from OpenStreetMap.
  const [addrAttribution, setAddrAttribution] = useState<string | null>(null);

  const { getBySku, ready } = useCatalogSearch();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Resolve a Medusa variant id for a basket line — legacy items persisted
  // before variantId existed are back-filled from the live catalogue by SKU.
  const resolveVariant = (i: { variantId: string; sku: string }) =>
    i.variantId || getBySku(i.sku)?.variantId || "";

  const shipping = options.find((o) => o.id === selected)?.amount ?? 0;
  // Only flag truly unresolvable items, and only once the catalogue is loaded.
  const missingVariant = ready && items.some((i) => !resolveVariant(i));

  async function findAddress() {
    setPcMsg(null);
    setAddrChoices([]);
    setAddrAttribution(null);
    if (!form.postal_code.trim()) {
      setPcMsg("Enter a postcode first.");
      return;
    }
    setPcLoading(true);
    try {
      // 1) Server-proxied full-address lookup — paid Ideal Postcodes (PAF) when
      //    a key is set, otherwise the free OpenStreetMap (Photon) source.
      const { configured, addresses, attribution } = await findAddresses(form.postal_code);
      if (configured) {
        if (addresses.length === 0) {
          setPcMsg("No addresses found for that postcode — please enter it manually.");
        } else {
          setAddrChoices(addresses);
          // OSM coverage is partial; set honest expectations + ODbL credit.
          setAddrAttribution(attribution ?? null);
          setForm((f) => ({
            ...f,
            city: addresses[0].city || f.city,
            postal_code: addresses[0].postcode || f.postal_code,
            country_code: "gb",
          }));
          const more = attribution
            ? " If yours isn't listed, type it above."
            : "";
          setPcMsg(`Found ${addresses.length} address${addresses.length === 1 ? "" : "es"} — select yours below.${more}`);
        }
        return;
      }
      // 2) No paid key — fall back to the free postcodes.io city lookup.
      const r = await lookupPostcode(form.postal_code);
      if (!r) {
        setPcMsg("Postcode not found — please check it.");
        return;
      }
      setForm((f) => ({
        ...f,
        city: r.city || f.city,
        postal_code: r.postcode,
        country_code: "gb",
      }));
      setPcMsg(`Found: ${[r.city, r.region].filter(Boolean).join(", ")}. Add your street & house number above.`);
    } catch {
      setPcMsg("Address lookup is temporarily unavailable.");
    } finally {
      setPcLoading(false);
    }
  }

  function selectAddress(e: React.ChangeEvent<HTMLSelectElement>) {
    const a = addrChoices[Number(e.target.value)];
    if (!a) return;
    setForm((f) => ({
      ...f,
      address_1: a.line_1,
      address_2: a.line_2 || f.address_2,
      city: a.city || f.city,
      postal_code: a.postcode || f.postal_code,
      country_code: "gb",
    }));
  }

  async function goToShipping(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const lineItems = items.map((i) => ({ variant_id: resolveVariant(i), quantity: i.qty }));
      if (lineItems.some((li) => !li.variant_id)) {
        throw new Error("Some basket items could not be matched. Please remove and re-add them.");
      }
      const id = await createCart(lineItems);
      const { email, ...address } = form;
      await setCartCustomer(id, email, address);
      const opts = await listShippingOptions(id);
      if (opts.length === 0) throw new Error("No delivery options for this address.");
      setCartId(id);
      setOptions(opts);
      setSelected(opts[0].id);
      setStep("shipping");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    if (!cartId || !selected) return;
    setError(null);
    setBusy(true);
    try {
      await setShippingMethod(cartId, selected);
      await initPaymentSession(cartId);
      const placed = await completeCart(cartId);
      setOrder(placed);
      setStep("done");
      clear();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div className="container" style={{ maxWidth: 760 }}>
            <h1 className="h-section" style={{ marginBottom: 24 }}>
              Checkout
            </h1>

            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  borderRadius: "var(--radius)",
                  padding: "12px 16px",
                  marginBottom: 20,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {step === "done" && order ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--success)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Order confirmed
                </div>
                <h2 style={{ fontSize: 28, fontWeight: 800, margin: "12px 0" }}>
                  Thank you{form.first_name ? `, ${form.first_name}` : ""}!
                </h2>
                <p style={{ color: "var(--body)" }}>
                  Order <b>#{order.display_id ?? order.id.slice(-8)}</b> placed · total{" "}
                  <b className="tabular">£{plain2(order.total)}</b>. A confirmation
                  was sent to {order.email}.
                </p>
                <Link href="/" className="btn btn-primary mt-4">
                  Continue shopping
                </Link>
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ color: "var(--body)", marginBottom: 16 }}>
                  Your basket is empty.
                </p>
                <Link href="/" className="btn btn-brand">
                  Browse products
                </Link>
              </div>
            ) : (
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32 }}
                className="pdp-grid"
              >
                <div>
                  {step === "details" && (
                    <form onSubmit={goToShipping}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                        Contact &amp; delivery
                      </h3>
                      <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
                      <div style={{ display: "flex", gap: 12 }}>
                        <Field label="First name" value={form.first_name} onChange={set("first_name")} required />
                        <Field label="Last name" value={form.last_name} onChange={set("last_name")} required />
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <Field label="Postcode" value={form.postal_code} onChange={set("postal_code")} required />
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={findAddress}
                          disabled={pcLoading}
                          style={{ marginBottom: 12, whiteSpace: "nowrap" }}
                        >
                          {pcLoading ? "Finding…" : "Find address"}
                        </button>
                      </div>
                      {pcMsg && (
                        <div style={{ fontSize: 12, color: "var(--body)", marginTop: -6, marginBottom: 12 }}>
                          {pcMsg}
                        </div>
                      )}
                      {addrChoices.length > 0 && (
                        <label style={{ display: "block", marginBottom: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--body)", display: "block", marginBottom: 4 }}>
                            Select your address
                          </span>
                          <select
                            defaultValue=""
                            onChange={selectAddress}
                            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
                          >
                            <option value="" disabled>
                              {addrChoices.length} address{addrChoices.length === 1 ? "" : "es"} found…
                            </option>
                            {addrChoices.map((a, i) => (
                              <option key={i} value={i}>
                                {[a.line_1, a.line_2, a.city].filter(Boolean).join(", ")}
                              </option>
                            ))}
                          </select>
                          {addrAttribution && (
                            <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>
                              {addrAttribution} (
                              <a
                                href="https://www.openstreetmap.org/copyright"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--muted)", textDecoration: "underline" }}
                              >
                                ODbL
                              </a>
                              ) — may be incomplete; type your address above if not listed.
                            </span>
                          )}
                        </label>
                      )}
                      <Field label="Address" value={form.address_1} onChange={set("address_1")} required />
                      <Field label="City" value={form.city} onChange={set("city")} required />
                      <Field label="Phone (optional)" value={form.phone || ""} onChange={set("phone")} />
                      <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 16px" }}>
                        Delivery country: United Kingdom
                      </div>
                      {missingVariant && (
                        <div style={{ fontSize: 13, color: "var(--warning)", marginBottom: 12 }}>
                          Some basket items are out of date — please remove and re-add them.
                        </div>
                      )}
                      <button className="btn btn-primary btn-lg btn-block" disabled={busy || missingVariant}>
                        {busy ? "Loading…" : "Continue to delivery method →"}
                      </button>
                    </form>
                  )}

                  {step === "shipping" && (
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                        Delivery method
                      </h3>
                      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
                        {options.map((o) => (
                          <label
                            key={o.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              border: `1px solid ${selected === o.id ? "var(--brand-500)" : "var(--line)"}`,
                              borderRadius: "var(--radius)",
                              padding: "12px 14px",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <input
                                type="radio"
                                name="ship"
                                checked={selected === o.id}
                                onChange={() => setSelected(o.id)}
                              />
                              {o.name}
                            </span>
                            <b className="tabular">£{plain2(o.amount)}</b>
                          </label>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-lg btn-block" onClick={placeOrder} disabled={busy}>
                        {busy ? "Placing order…" : "Place order"}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm mt-4"
                        onClick={() => setStep("details")}
                        disabled={busy}
                      >
                        ← Back to details
                      </button>
                    </div>
                  )}
                </div>

                <aside
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-lg)",
                    padding: 20,
                    height: "fit-content",
                  }}
                >
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                    Order summary
                  </h3>
                  {items.map((it) => (
                    <div
                      key={it.sku}
                      style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}
                    >
                      <span style={{ color: "var(--body)" }}>
                        {it.qty} × {it.name}
                      </span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid var(--line)", margin: "12px 0", paddingTop: 12 }}>
                    <Row label="Subtotal (ex VAT)" value={`£${plain2(totals.sub)}`} />
                    <Row
                      label="Delivery (ex VAT)"
                      value={step === "shipping" ? `£${plain2(shipping)}` : "Next step"}
                    />
                    {/* VAT applies to goods AND delivery — Medusa charges 20% on
                        shipping too, so include it here or the quote under-bills. */}
                    <Row
                      label="VAT (20%)"
                      value={`£${plain2(totals.vat + (step === "shipping" ? shipping * 0.2 : 0))}`}
                    />
                    <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
                    <Row
                      label="Total"
                      value={`£${plain2(totals.total + (step === "shipping" ? shipping * 1.2 : 0))}`}
                      large
                    />
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex: 1 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--body)", display: "block", marginBottom: 4 }}>
        {label}
      </span>
      <input
        {...props}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          fontSize: 14,
        }}
      />
    </label>
  );
}

function Row({ label, value, large = false }: { label: string; value: React.ReactNode; large?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "3px 0" }}>
      <span style={{ fontSize: 13, color: "var(--body)" }}>{label}</span>
      <span className="tabular" style={{ fontSize: large ? 18 : 14, fontWeight: large ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}
