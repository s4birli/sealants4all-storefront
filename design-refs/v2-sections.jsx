/* global React, Carousel, ProductCard, useCartV2, Stars, CatIcon, PHv2, TruckIcon, ShieldCheck, TrophyIcon, CardIcon, HeadsetIcon, TagIcon, ClockIcon, MailIcon, CheckIcon, PhoneIcon, plain2 */
// Sealants4All V2 — body sections

// ─── Trust Strip ────────────────────────────────────────────────
function TrustStrip() {
  const items = [
    { icon: <TruckIcon size={20} />,   t: 'Free UK delivery',  s: 'On orders over £150' },
    { icon: <Stars value={5} size={14} />, t: '4.8 / 5 on Trustpilot', s: '2,314 verified reviews' },
    { icon: <ShieldCheck size={20} />, t: 'Official distributor', s: '6 brands · Direct sourcing' },
    { icon: <CardIcon size={20} />,    t: 'Net-30 trade terms', s: 'On approved accounts' },
  ];
  return (
    <section className="trust-strip">
      <div className="container">
        <div className="row">
          {items.map((it, i) => (
            <div key={i} className="trust-item">
              <span className="icon">{it.icon}</span>
              <span>
                {it.t}
                <span className="sub">{it.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Category grid ──────────────────────────────────────────────
function Categories() {
  return (
    <section className="section" id="categories">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by category</h2>
            <div className="h-section-sub">158 SKUs across 8 product categories — all in stock, dispatched from London.</div>
          </div>
          <a className="link" href="#catalogue">View all categories →</a>
        </div>
        <div className="cat-grid">
          {window.S4A.V2.categories.map(c => (
            <a key={c.id} href={`#${c.id}`} className="card cat-card">
              <div className="thumb">{CatIcon[c.icon]}</div>
              <div className="name">{c.name}</div>
              <div className="count">{c.count} products</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Brand grid ─────────────────────────────────────────────────
function Brands() {
  return (
    <section className="section" style={{ background: 'var(--surface)' }} id="brands">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by brand</h2>
            <div className="h-section-sub">Official UK distributor of six leading brands — and our own private-label S4ALL Pro range.</div>
          </div>
          <a className="link" href="#brands">All brands →</a>
        </div>
        <div className="brand-grid">
          {window.S4A.BRANDS.map(b => (
            <a key={b.id} href={`#${b.id}`} className="card brand-card">
              <div className="logo">{b.name}</div>
              <div className="official">
                <CheckIcon size={12} />
                {b.id === 's4all' ? 'OUR OWN LABEL' : 'OFFICIAL DISTRIBUTOR'}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Best Sellers ───────────────────────────────────────────────
function BestSellers() {
  const skus = window.S4A.V2.bestSku;
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Most ordered"
          title="Best sellers"
          link={{ label: 'See all best sellers', href: '#bestsellers' }}>
          {skus.map(sku => <ProductCard key={sku} sku={sku} />)}
        </Carousel>
      </div>
    </section>
  );
}

// ─── Trade CTA banner ───────────────────────────────────────────
function TradeBanner() {
  return (
    <section className="section" id="trade">
      <div className="container">
        <div className="trade-banner">
          <div className="grid">
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255,107,26,0.18)', color: 'var(--cta-400)', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                ★ For Trade Customers
              </div>
              <h2>Open a trade account — save up to 30% on bulk orders.</h2>
              <p>Volume pricing, net-30 terms, a named account manager, and priority dispatch. Application takes 3 minutes. Decision within 1 business day.</p>
              <div className="perks">
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Bulk tier pricing</span>
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Net-30 terms</span>
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Named account rep</span>
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Priority dispatch</span>
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Saved order lists</span>
                <span className="perk"><span className="tick"><CheckIcon size={16} /></span> Multi-user team accounts</span>
              </div>
              <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                <a href="#apply" className="btn btn-primary btn-lg">Apply now →</a>
                <a href="#learn" className="btn btn-outline-white btn-lg">Learn more</a>
              </div>
            </div>
            <div className="visual">
              <div style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Last 30 days</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--white)', letterSpacing: '-0.02em', margin: '8px 0' }}>2,847</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>orders dispatched to trade accounts</div>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24 }}>
                  {[
                    { v: '£487', l: 'AVG ORDER' },
                    { v: '24h',  l: 'DISPATCH' },
                    { v: '4.9',  l: 'TRADE NPS' },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--white)' }} className="tabular">{s.v}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', fontWeight: 700 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Deals + Countdown ──────────────────────────────────────────
function Deals() {
  // Synthetic countdown to ~3 days
  const target = useMemo(() => {
    const t = new Date();
    t.setHours(t.getHours() + 62);
    return t.getTime();
  }, []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  let left = Math.max(0, target - now);
  const days = Math.floor(left / 86400000); left -= days * 86400000;
  const hrs  = Math.floor(left / 3600000);  left -= hrs  * 3600000;
  const min  = Math.floor(left / 60000);    left -= min  * 60000;
  const sec  = Math.floor(left / 1000);

  return (
    <section className="section" id="deals" style={{ background: '#FFF7E6' }}>
      <div className="container">
        <div className="section-head">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cta-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TagIcon size={14} /> Limited time
            </div>
            <h2 className="h-section">Deals of the week</h2>
            <div className="h-section-sub">Six trade-favourite SKUs at clearance pricing. Offer ends in:</div>
          </div>
          <div className="flex items-center gap-3" style={{ alignSelf: 'end' }}>
            <ClockIcon size={20} />
            <div className="countdown" aria-label="Time left">
              <div className="unit"><div className="v tabular">{String(days).padStart(2,'0')}</div><div className="l">Days</div></div>
              <div className="unit"><div className="v tabular">{String(hrs).padStart(2,'0')}</div><div className="l">Hrs</div></div>
              <div className="unit"><div className="v tabular">{String(min).padStart(2,'0')}</div><div className="l">Min</div></div>
              <div className="unit"><div className="v tabular">{String(sec).padStart(2,'0')}</div><div className="l">Sec</div></div>
            </div>
          </div>
        </div>
        <Carousel>
          {window.S4A.V2.dealsSku.map(sku => <ProductCard key={sku} sku={sku} />)}
        </Carousel>
      </div>
    </section>
  );
}

// ─── New Arrivals ───────────────────────────────────────────────
function NewArrivals() {
  return (
    <section className="section">
      <div className="container">
        <Carousel
          kicker="Just landed"
          title="New arrivals"
          link={{ label: 'See all new products', href: '#new' }}>
          {window.S4A.V2.newSku.concat(window.S4A.V2.bestSku.slice(0, 4)).map((sku, i) => (
            <ProductCard key={sku + i} sku={sku} isNew={i < 4} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}

// ─── By Application ─────────────────────────────────────────────
function Applications() {
  return (
    <section className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="h-section">Shop by application</h2>
            <div className="h-section-sub">The right product for the job. Filtered by the work you're actually doing.</div>
          </div>
        </div>
        <div className="app-grid">
          {window.S4A.V2.applications.map(a => (
            <a key={a.id} href={`#${a.id}`} className="app-card">
              <PHv2 ratio="auto" cap={a.cap} className="app-img" style={{ position: 'absolute', inset: 0 }} />
              <div className="app-grad" />
              <div className="app-meta">
                <div className="l">APPLICATION</div>
                <div className="t">{a.name}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trustpilot reviews ─────────────────────────────────────────
function Reviews() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
              <Stars value={5} size={20} />
              <span className="fw-700">4.8 / 5</span>
              <span style={{ color: 'var(--body)' }}>· 2,314 reviews on Trustpilot</span>
            </div>
            <h2 className="h-section">What our customers say</h2>
          </div>
          <a className="link" href="#trustpilot">Read all reviews →</a>
        </div>
        <Carousel>
          {window.S4A.V2.reviews.map((r, i) => (
            <div key={i} className="card review-card">
              <Stars value={r.stars} />
              <div className="text">"{r.text}"</div>
              <div className="who">{r.name}</div>
              <div className="date">Verified order · {r.date}</div>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

// ─── Why us ─────────────────────────────────────────────────────
function WhyUs() {
  const items = [
    { icon: <ShieldCheck size={24} />, t: 'Official Distributor', d: 'Six brands — Sika, Fischer, Soudal, Teroson, Terraco, Everbuild — sourced direct from the manufacturer.' },
    { icon: <TagIcon size={24} />,     t: 'Bulk Trade Pricing',   d: 'Tier pricing visible on every product page. No phone-only quotes. No hidden discounts.' },
    { icon: <HeadsetIcon size={24} />, t: 'Real Technical Support', d: 'Phone, email, live chat — answered by people who\u2019ve actually used the products on site.' },
    { icon: <TruckIcon size={24} />,   t: 'Fast UK Dispatch',     d: 'Orders before 3pm ship same day from our London warehouse. Next-day UK courier as standard.' },
  ];
  return (
    <section className="section" style={{ background: 'var(--surface)' }}>
      <div className="container">
        <div className="section-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div>
            <h2 className="h-section">Why choose Sealants4All</h2>
            <div className="h-section-sub">Five years supplying UK trade. 50,000+ orders shipped. Zero phone-only pricing.</div>
          </div>
        </div>
        <div className="why-row">
          {items.map((it, i) => (
            <div key={i} className="why-item">
              <span className="icon">{it.icon}</span>
              <div className="t">{it.t}</div>
              <div className="d">{it.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Newsletter ─────────────────────────────────────────────────
function Newsletter() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setDone(true);
    setTimeout(() => { setDone(false); setEmail(''); }, 3200);
  };
  return (
    <section className="section">
      <div className="container">
        <div className="newsletter">
          <div>
            <h3>Trade tips, new products, exclusive deals.</h3>
            <p>Monthly. We respect the inbox. Unsubscribe in one click.</p>
          </div>
          <form onSubmit={submit}>
            <input type="email" required className="input" placeholder="you@trade-email.co.uk" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
            <button className="btn btn-brand btn-lg" type="submit">{done ? <><CheckIcon size={16} /> Subscribed</> : <><MailIcon size={16} /> Subscribe</>}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────
function FooterV2() {
  return (
    <footer className="footer">
      <div className="container top">
        <div className="cols">
          <div>
            <a href="#top" className="brand-logo">Sealants<span className="four">4</span>All</a>
            <div className="blurb">
              Official UK distributor of Sika, Fischer, Soudal, Teroson, Terraco and Everbuild.
              Trade-grade sealants, adhesives, fixings, and EWI systems — dispatched in 24 hours.
            </div>
            <div className="contact">
              <div className="ph"><PhoneIcon size={16} /> 020 8050 3959</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 }}>9:00 – 18:00, Monday to Friday</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>sales@sealants4all.co.uk</div>
            </div>
          </div>
          <div>
            <h4>Shop</h4>
            {window.S4A.V2.categories.slice(0, 8).map(c => <a key={c.id} href={`#${c.id}`}>{c.name}</a>)}
            <a href="#deals">Deals & Clearance</a>
          </div>
          <div>
            <h4>Brands</h4>
            {window.S4A.BRANDS.map(b => <a key={b.id} href={`#${b.id}`}>{b.name}</a>)}
          </div>
          <div>
            <h4>Help & Account</h4>
            {['Shipping','Returns','Datasheets','FAQ','Contact Us','Trade Account','My Account','Track Order','Modern Slavery'].map(l => <a key={l} href="#">{l}</a>)}
          </div>
        </div>
      </div>
      <div className="container bottom">
        <div className="row">
          <div>
            © 2026 All 4 Construction Limited · Co. No. 12 487 553 · VAT GB 348 9921 04 · London SW18 4GQ
          </div>
          <div className="payments">
            {['VISA','MASTERCARD','AMEX','PAYPAL','APPLE PAY','KLARNA'].map(p => (
              <span key={p} className="chip">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  TrustStrip, Categories, Brands, BestSellers, TradeBanner, Deals,
  NewArrivals, Applications, Reviews, WhyUs, Newsletter, FooterV2
});
