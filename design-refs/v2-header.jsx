/* global React, useCartV2, SearchIcon, CartIcon, UserIcon, ChevronDown, TruckIcon, ShieldCheck, PhoneIcon, MenuIcon */
// Sealants4All V2 — Header (utility bar + main header + mega nav) + Hero carousel

// ─── Utility Bar ────────────────────────────────────────────────
function UtilityBar() {
  return (
    <div className="utility">
      <div className="container">
        <div className="row">
          <div className="group">
            <span className="item"><span className="tick"><ShieldCheck size={14} /></span> Free UK delivery over £150</span>
            <span className="item"><span className="tick"><ShieldCheck size={14} /></span> Official UK distributor</span>
            <span className="item"><span className="tick"><ShieldCheck size={14} /></span> Net-30 trade accounts</span>
          </div>
          <div className="group">
            <a href="#help" className="item">Help</a>
            <a href="#shipping" className="item">Delivery info</a>
            <a href="tel:02080503959" className="item"><PhoneIcon size={14} /> 020 8050 3959</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main header with search ────────────────────────────────────
function HeaderV2({ onOpenCart }) {
  const { items, totals } = useCartV2();
  const count = items.reduce((s, i) => s + i.qty, 0);
  const placeholders = [
    'Sikaflex 522 caravan sealant',
    'Fire-rated intumescent mastic',
    'Fischer chemical anchor 360ml',
    'S4ALL Pro hybrid sealant',
    'Soudal Fix All high tack',
  ];
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPh(p => (p + 1) % placeholders.length), 3500);
    return () => clearInterval(id);
  }, []);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  // Suggestion list
  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return window.S4A.PRODUCTS
      .filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.use.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  return (
    <header className="header">
      <div className="container">
        <div className="row">
          <a href="#top" className="brand-logo" aria-label="Sealants4All home">
            <span>Sealants<span className="four">4</span>All</span>
          </a>

          <div className="search-wrap">
            <span className="search-icon"><SearchIcon size={18} /></span>
            <input
              className="search-input"
              placeholder={`Search "${placeholders[ph]}"...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              aria-label="Search products, brands, SKUs"
            />
            <button className="search-go" aria-label="Search">Search</button>

            {focused && suggestions.length > 0 && (
              <div role="listbox" style={{
                position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)',
                background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)', zIndex: 60, overflow: 'hidden',
              }}>
                {suggestions.map(p => (
                  <a key={p.sku} href={`#${p.sku}`} role="option"
                     onMouseDown={() => { setQuery(p.name); setFocused(false); }}
                     style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--surface-2)' }}>
                    <PHv2 ratio="1 / 1" cap={p.brand.split(' ')[0]} style={{ width: 48 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.brand} · {p.use}</div>
                    </div>
                    <div className="tabular" style={{ fontSize: 14, fontWeight: 700 }}>{gbp(p.from)}</div>
                  </a>
                ))}
                <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                  Press <kbd style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>↵</kbd> to search the full catalogue
                </div>
              </div>
            )}
          </div>

          <div className="header-actions">
            <a className="icon-btn" href="#account" aria-label="Account">
              <UserIcon size={20} />
              <span className="label" style={{ display: 'inline-grid' }}>
                Account
                <span className="sub">Sign in</span>
              </span>
            </a>
            <a className="icon-btn" href="#trade" style={{ color: 'var(--brand-500)' }}>
              <ShieldCheck size={20} />
              <span className="label" style={{ display: 'inline-grid' }}>
                Trade
                <span className="sub">Bulk pricing</span>
              </span>
            </a>
            <button className="cart-pill" onClick={onOpenCart} aria-label={`Basket. ${count} items.`}>
              <CartIcon size={18} />
              <span style={{ display: 'inline-grid', textAlign: 'left', lineHeight: 1.1 }}>
                Basket
                <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 500 }}>{gbp(totals.sub)}</span>
              </span>
              <span className="count">{count}</span>
            </button>
          </div>
        </div>
      </div>
      <MegaNav />
    </header>
  );
}

// ─── Mega Nav ───────────────────────────────────────────────────
function MegaNav() {
  const [open, setOpen] = useState(null);
  const closeT = useRef(null);
  const openMenu = (k) => { clearTimeout(closeT.current); setOpen(k); };
  const closeMenu = () => { closeT.current = setTimeout(() => setOpen(null), 120); };

  return (
    <nav className="mega-nav relative" onMouseLeave={closeMenu}>
      <div className="container relative">
        <div className="row">
          <a className={"mega-link primary " + (open === 'all' ? 'open' : '')}
             href="#catalogue"
             onMouseEnter={() => openMenu('all')}>
            <MenuIcon size={16} /> All products <span className="caret">▾</span>
          </a>
          {['Sika','Fischer','Soudal','Caravan','EWI','Fire','Waterproofing'].map(label => (
            <a key={label} href={`#${label.toLowerCase()}`} className="mega-link">{label}</a>
          ))}
          <a href="#deals" className="mega-link deals">★ Deals</a>
          <a href="#trade" className="mega-link" style={{ marginLeft: 'auto' }}>Trade Hub →</a>
        </div>

        {open === 'all' && (
          <div className="mega-panel" onMouseEnter={() => openMenu('all')} onMouseLeave={closeMenu}>
            <div className="container">
              <div className="mega-panel-inner">
                <div className="mega-col">
                  <h4>By Category</h4>
                  {window.S4A.V2.categories.slice(0, 4).map(c => (
                    <a key={c.id} href={`#${c.id}`}>{c.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>({c.count})</span></a>
                  ))}
                </div>
                <div className="mega-col">
                  <h4>By Application</h4>
                  {window.S4A.V2.applications.slice(0, 5).map(a => (
                    <a key={a.id} href={`#${a.id}`}>{a.name}</a>
                  ))}
                </div>
                <div className="mega-col">
                  <h4>Top Brands</h4>
                  {window.S4A.BRANDS.slice(0, 6).map(b => (
                    <a key={b.id} href={`#${b.id}`}>{b.name}</a>
                  ))}
                </div>
                <div className="mega-promo">
                  <div className="promo-img" />
                  <div style={{ marginTop: 12, fontWeight: 700, fontSize: 14 }}>S4ALL Pro range — up to 38% under brand</div>
                  <div style={{ fontSize: 12, color: 'var(--body)', marginTop: 4 }}>Our own private label. UK-made.</div>
                  <a className="btn btn-brand btn-sm mt-4" href="#s4all">Shop now →</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Hero carousel ──────────────────────────────────────────────
function HeroV2({ autoplayMs = 6000 }) {
  const slides = window.S4A.V2.heroSlides;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || !autoplayMs) return;
    const id = setInterval(() => setI(v => (v + 1) % slides.length), autoplayMs);
    return () => clearInterval(id);
  }, [paused, autoplayMs, slides.length]);

  const slide = slides[i];

  return (
    <section className="hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
             style={{ background: slide.bg }}>
      <div className="slide-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div className="slide" key={idx}>
            <div className="container">
              <div>
                <div className="eyebrow" style={{ color: s.accent }}>
                  <span style={{ width: 24, height: 1, background: s.accent }} /> {s.eyebrow}
                </div>
                <h1>{s.title}</h1>
                <p>{s.sub}</p>
                <div className="ctas">
                  <a href={s.ctaPrimary.href} className="btn btn-primary btn-lg" style={{ background: s.accent === '#FFB800' ? '#FF6B1A' : s.accent }}>
                    {s.ctaPrimary.label} <span aria-hidden="true">→</span>
                  </a>
                  <a href={s.ctaSecondary.href} className="btn btn-outline-white btn-lg">{s.ctaSecondary.label}</a>
                </div>
                <div className="flex items-center gap-3 mt-6" style={{ flexWrap: 'wrap' }}>
                  <span className="flex items-center gap-2" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                    <Stars value={4.8} size={14} /> 4.8/5 on Trustpilot
                  </span>
                  <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                    2,314 verified reviews
                  </span>
                </div>
              </div>
              <div className="visual">
                <PHv2 ratio="auto"
                      style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, transparent 8px 16px), rgba(255,255,255,0.02)' }}
                      tag={s.tag}
                      cap={s.productCap} />
                <span className="badge" style={{ position: 'absolute', top: 16, right: 16, background: s.accent, color: '#1F1300', fontSize: 12, padding: '6px 12px' }}>
                  ★ FEATURED
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="arrow prev" aria-label="Previous slide" onClick={() => setI(v => (v - 1 + slides.length) % slides.length)}><ChevronL size={20} /></button>
      <button className="arrow next" aria-label="Next slide" onClick={() => setI(v => (v + 1) % slides.length)}><ChevronR size={20} /></button>
      <div className="dots">
        {slides.map((_, idx) => (
          <button key={idx} className={"dot " + (idx === i ? 'active' : '')} aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)} />
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { UtilityBar, HeaderV2, HeroV2 });
