/* global React, useCartV2, Stars, HeartIcon, ChevronL, ChevronR, gbp, plain2, tierForQty2, PHv2, CheckIcon, CartIcon */
// Sealants4All V2 — Product card, Carousel wrapper, Cart drawer

// ─── Product Card ───────────────────────────────────────────────
function ProductCard({ sku, showBadges = true, isNew, showBulkHint = true }) {
  const product = window.S4A.PRODUCTS.find(p => p.sku === sku);
  if (!product) return null;
  const meta = window.S4A.V2.productMeta[sku];
  const dealPct = meta.saving;
  const list = product.tiers[0].price;
  const display = dealPct > 0 ? list * (1 - dealPct / 100) : list;
  const incVat = display * 1.2;
  const stockBadge = meta.stock > 200 ? 'badge-stock' : meta.stock > 30 ? 'badge-low' : 'badge-out';
  const stockLabel = meta.stock > 200 ? 'In stock' : meta.stock > 30 ? 'Low stock' : 'Out of stock';
  const { add } = useCartV2();

  return (
    <article className="card product-card" id={sku}>
      <div className="thumb">
        <PHv2 ratio="1 / 1" cap={product.cap} style={{ position: 'absolute', inset: 0 }} />
        {showBadges && (
          <div className="thumb-badges">
            {dealPct > 0 && <span className="badge badge-deal">SAVE {dealPct}%</span>}
            {isNew && <span className="badge badge-new">NEW</span>}
            {product.brand === 'S4ALL PRO' && !isNew && <span className="badge badge-trade">OWN LABEL</span>}
          </div>
        )}
        <button className="wishlist" aria-label="Add to wishlist"><HeartIcon size={16} /></button>
      </div>

      <div className="brand-row">{product.brand}</div>
      <div className="name">{product.name}</div>
      <div className="use">{product.use}</div>

      <div className="meta-row">
        <Stars value={meta.rating} />
        <span style={{ color: 'var(--body)', fontWeight: 600 }}>{meta.rating.toFixed(1)}</span>
        <span>({meta.reviews})</span>
        <span>·</span>
        <span>SKU {product.sku}</span>
      </div>

      <div className="price-row">
        <span className="price tabular">£{plain2(display)}</span>
        {dealPct > 0 && <span className="price-strike tabular">£{plain2(list)}</span>}
        <span className="price-vat tabular">ex VAT</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--body)' }} className="tabular">£{plain2(incVat)} inc VAT</div>

      <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
        <span className="stock"><span className="dot-status" /> {stockLabel} ({meta.stock})</span>
      </div>

      {showBulkHint && (
        <div className="bulk-hint">
          Buy {product.tiers[1].min}+ for £{plain2(product.tiers[1].price)} each
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={() => add(sku, 1)}>
        <CartIcon size={16} /> Add to basket
      </button>
    </article>
  );
}

// ─── Carousel wrapper ───────────────────────────────────────────
function Carousel({ children, title, link, kicker }) {
  const ref = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateBtns = () => {
    const el = ref.current; if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    updateBtns();
    const el = ref.current; if (!el) return;
    el.addEventListener('scroll', updateBtns, { passive: true });
    window.addEventListener('resize', updateBtns);
    return () => { el.removeEventListener('scroll', updateBtns); window.removeEventListener('resize', updateBtns); };
  }, []);

  const scrollBy = (dir) => {
    const el = ref.current; if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div>
      {(title || kicker || link) && (
        <div className="section-head">
          <div>
            {kicker && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cta-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{kicker}</div>}
            {title && <h2 className="h-section">{title}</h2>}
          </div>
          {link && <a href={link.href} className="link">{link.label} →</a>}
        </div>
      )}
      <div className="carousel-wrap">
        <button className="carousel-btn prev" disabled={!canPrev} aria-label="Scroll left" onClick={() => scrollBy(-1)}><ChevronL size={18} /></button>
        <button className="carousel-btn next" disabled={!canNext} aria-label="Scroll right" onClick={() => scrollBy(1)}><ChevronR size={18} /></button>
        <div className="carousel-scroll" ref={ref}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Cart Drawer ────────────────────────────────────────────────
function CartDrawerV2() {
  const { items, update, remove, open, setOpen, totals, clear } = useCartV2();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, setOpen]);

  // Bulk savings hint — find an item closest to next tier
  const bulkHint = useMemo(() => {
    for (const it of items) {
      const p = window.S4A.PRODUCTS.find(pp => pp.sku === it.sku);
      if (!p) continue;
      const nextTier = p.tiers.find(t => t.min > it.qty);
      if (!nextTier) continue;
      const need = nextTier.min - it.qty;
      const curT = tierForQty2(p.tiers, it.qty);
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
      <div className={"drawer-backdrop" + (open ? " open" : "")} onClick={() => setOpen(false)} aria-hidden={!open} />
      <aside className={"drawer" + (open ? " open" : "")} aria-hidden={!open} aria-label="Basket">
        <div className="drawer-head">
          <div>
            <h3>Your basket</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{items.length} {items.length === 1 ? 'line' : 'lines'} · {totals.units} units</div>
          </div>
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" aria-label="Close">Close ✕</button>
        </div>

        {/* Free-shipping progress */}
        {items.length > 0 && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
            {freeShip ? (
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                <CheckIcon size={14} /> You've unlocked free UK delivery.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  Add <b>£{plain2(remaining)}</b> more for <b>free delivery</b>.
                </div>
                <div style={{ height: 6, background: 'var(--line)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${freeShipProgress}%`, background: 'var(--cta-500)', transition: 'width 240ms ease' }} />
                </div>
              </>
            )}
          </div>
        )}

        {bulkHint && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', background: 'var(--brand-50)', fontSize: 13, color: 'var(--brand-700)' }}>
            <b>Tip:</b> Add {bulkHint.need} more {bulkHint.product.name.split(' ')[0]} ({bulkHint.product.sku}) to reach <b>{bulkHint.nextTier.min}+ tier</b> — save £{plain2(bulkHint.save)} on this line.
          </div>
        )}

        <div className="drawer-body">
          {items.length === 0 && (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--surface)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--muted)' }}>
                <CartIcon size={28} />
              </div>
              <h4 style={{ fontSize: 18, marginBottom: 6 }}>Your basket is empty</h4>
              <p style={{ color: 'var(--body)', fontSize: 14 }}>Add a product to see bulk pricing kick in.</p>
              <button onClick={() => setOpen(false)} className="btn btn-brand mt-4">Continue shopping</button>
            </div>
          )}

          {items.map(it => {
            const p = window.S4A.PRODUCTS.find(pp => pp.sku === it.sku);
            if (!p) return null;
            const tier = tierForQty2(p.tiers, it.qty);
            const line = tier.price * it.qty;
            const saving = (p.tiers[0].price - tier.price) * it.qty;
            return (
              <div key={it.sku} className="cart-line">
                <div className="thumb"><PHv2 ratio="1 / 1" cap={p.brand.split(' ')[0]} style={{ position: 'absolute', inset: 0 }} /></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-500)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.brand}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>SKU {p.sku}</div>
                  <div className="tabular" style={{ fontSize: 12, color: 'var(--body)', marginTop: 4 }}>£{plain2(tier.price)} each · tier {p.tiers.findIndex(x => x.min === tier.min) + 1}/{p.tiers.length}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="stepper">
                      <button onClick={() => update(p.sku, it.qty - 1)} aria-label="Decrease">−</button>
                      <input value={it.qty} onChange={(e) => update(p.sku, parseInt(e.target.value || '0', 10))} />
                      <button onClick={() => update(p.sku, it.qty + 1)} aria-label="Increase">+</button>
                    </div>
                    <button onClick={() => remove(p.sku)} className="btn btn-ghost btn-sm" style={{ color: 'var(--muted)' }}>Remove</button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular fw-700">£{plain2(line)}</div>
                  {saving > 0 && <div className="tabular text-success" style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>Saved £{plain2(saving)}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <Row label="Subtotal (ex VAT)" value={`£${plain2(totals.sub)}`} />
            <Row label="VAT (20%)" value={`£${plain2(totals.vat)}`} />
            <Row label="Delivery" value={freeShip ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span> : 'Calculated at checkout'} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0 8px' }} />
            <Row label="Total (inc VAT)" value={`£${plain2(totals.total + (freeShip ? 0 : 0))}`} large />
            {totals.savings > 0 && <div className="tabular text-success" style={{ fontSize: 12, marginTop: 6, fontWeight: 600 }}>You saved £{plain2(totals.savings)} vs list price</div>}

            <button className="btn btn-primary btn-block btn-lg mt-4" onClick={() => alert('Checkout (Phase 1 placeholder).')}>
              Proceed to checkout →
            </button>
            <div className="flex items-center gap-3 mt-4" style={{ justifyContent: 'space-between' }}>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Continue shopping</button>
              <button onClick={clear} className="btn btn-ghost btn-sm" style={{ color: 'var(--muted)' }}>Clear basket</button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({ label, value, large }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <span className="tabular" style={{ fontSize: large ? 18 : 14, fontWeight: large ? 700 : 600 }}>{value}</span>
    </div>
  );
}

Object.assign(window, { ProductCard, Carousel, CartDrawerV2 });
