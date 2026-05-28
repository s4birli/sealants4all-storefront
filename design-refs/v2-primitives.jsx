/* global React */
// Sealants4All V2 — primitives, hooks, icons, cart context

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ─── Format helpers ─────────────────────────────────────────────
function plain2(n) { return Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function gbp(n) { return '£' + plain2(n); }
function tierForQty2(tiers, qty) {
  let cur = tiers[0];
  for (const t of tiers) if (qty >= t.min) cur = t;
  return cur;
}

// ─── Cart context (V2 — separate storage key) ───────────────────
const CartCtxV2 = createContext(null);

function CartProviderV2({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('s4a-v2:cart') || '[]'); } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastT = useRef(null);

  useEffect(() => {
    localStorage.setItem('s4a-v2:cart', JSON.stringify(items));
  }, [items]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const add = useCallback((sku, qty = 1) => {
    const product = window.S4A.PRODUCTS.find(p => p.sku === sku);
    if (!product) return;
    setItems(prev => {
      const idx = prev.findIndex(i => i.sku === sku);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { sku, qty }];
    });
    showToast(`Added to basket — ${product.name}`);
  }, [showToast]);

  const update = useCallback((sku, qty) => {
    setItems(prev => prev.map(i => i.sku === sku ? { ...i, qty: Math.max(0, qty) } : i).filter(i => i.qty > 0));
  }, []);
  const remove = useCallback((sku) => setItems(prev => prev.filter(i => i.sku !== sku)), []);
  const clear = useCallback(() => setItems([]), []);

  const totals = useMemo(() => {
    let units = 0, sub = 0, savings = 0;
    for (const it of items) {
      const p = window.S4A.PRODUCTS.find(pp => pp.sku === it.sku);
      if (!p) continue;
      const t = tierForQty2(p.tiers, it.qty);
      sub += t.price * it.qty;
      savings += (p.tiers[0].price - t.price) * it.qty;
      units += it.qty;
    }
    const vat = sub * 0.2;
    return { units, sub, vat, total: sub + vat, savings };
  }, [items]);

  return (
    <CartCtxV2.Provider value={{ items, add, update, remove, clear, open, setOpen, totals, toast }}>
      {children}
    </CartCtxV2.Provider>
  );
}
function useCartV2() { return useContext(CartCtxV2); }

// ─── Toast (renders within CartProviderV2) ──────────────────────
function ToastV2() {
  const { toast } = useCartV2();
  return (
    <div className={"toast" + (toast ? " show" : "")}
         role="status" aria-live="polite">
      <span className="check"><CheckIcon /></span>
      <span>{toast || ''}</span>
    </div>
  );
}

// ─── Stars ──────────────────────────────────────────────────────
function Stars({ value, size = 14 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="stars" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = i < full ? '#FFB800' : (i === full && half ? 'url(#half-star)' : '#E5E7EB');
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="#FFB800" />
                <stop offset="50%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <path fill={fill} d="M12 2.5l2.92 6.34 6.95.66-5.24 4.71 1.5 6.79L12 17.77l-6.13 3.23 1.5-6.79L2.13 9.5l6.95-.66L12 2.5z"/>
          </svg>
        );
      })}
    </span>
  );
}

// ─── Icons ──────────────────────────────────────────────────────
function Icon({ d, size = 18, fill = 'none', stroke = 'currentColor', strokeWidth = 1.8, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {typeof d === 'string' ? <path d={d} /> : d}
    </svg>
  );
}
const SearchIcon = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />;
const CartIcon   = (p) => <Icon {...p} d={<><path d="M3 4h2l2.4 12.5a2 2 0 0 0 2 1.5h8.7a2 2 0 0 0 1.96-1.6L22 8H6"/><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/></>} />;
const UserIcon   = (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>} />;
const HeartIcon  = (p) => <Icon {...p} d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />;
const ChevronDown= (p) => <Icon {...p} d="m6 9 6 6 6-6" />;
const ChevronL   = (p) => <Icon {...p} d="m15 18-6-6 6-6" />;
const ChevronR   = (p) => <Icon {...p} d="m9 6 6 6-6 6" />;
const CheckIcon  = (p) => <Icon {...p} d="M5 12.5 10 17 19 7.5" />;
const TruckIcon  = (p) => <Icon {...p} d={<><path d="M2 7h11v10H2z"/><path d="M13 10h5l3 3v4h-8"/><circle cx="6.5" cy="18" r="1.5"/><circle cx="17.5" cy="18" r="1.5"/></>} />;
const TrophyIcon = (p) => <Icon {...p} d={<><path d="M8 4h8v4a4 4 0 0 1-8 0V4z"/><path d="M16 6h3a2 2 0 0 1-2 4M8 6H5a2 2 0 0 0 2 4M12 12v3M9 19h6"/></>} />;
const CardIcon   = (p) => <Icon {...p} d={<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11h18"/></>} />;
const StarIcon   = (p) => <Icon {...p} d="M12 2.5l2.92 6.34 6.95.66-5.24 4.71 1.5 6.79L12 17.77l-6.13 3.23 1.5-6.79L2.13 9.5l6.95-.66L12 2.5z" />;
const PhoneIcon  = (p) => <Icon {...p} d="M5 4a2 2 0 0 1 2-2h2l1.5 4-2 1.5a13 13 0 0 0 6 6L16 11.5l4 1.5v2a2 2 0 0 1-2 2c-8.3 0-15-6.7-15-15z" />;
const HeadsetIcon= (p) => <Icon {...p} d={<><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14a2 2 0 0 0 2 2h1v-4H6a2 2 0 0 0-2 2zM20 14a2 2 0 0 1-2 2h-1v-4h1a2 2 0 0 1 2 2z"/><path d="M16 19a4 4 0 0 1-4 1"/></>} />;
const ShieldCheck= (p) => <Icon {...p} d={<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/></>} />;
const TagIcon    = (p) => <Icon {...p} d={<><path d="M3 12 12 3h8v8l-9 9-8-8z"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/></>} />;
const ClockIcon  = (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />;
const MailIcon   = (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>} />;
const MenuIcon   = (p) => <Icon {...p} d="M3 6h18M3 12h18M3 18h18" />;

// Category icons (kept simple line drawings)
const CatIcon = {
  caravan: <Icon size={48} d={<><rect x="2" y="9" width="16" height="8" rx="2"/><circle cx="7" cy="18" r="1.6"/><circle cx="14" cy="18" r="1.6"/><path d="M18 13h4l-2-4h-2"/></>} />,
  joint:   <Icon size={48} d={<><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/><path d="M9 4v4M15 10v4M9 16v4"/></>} />,
  flame:   <Icon size={48} d={<><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c0-3 2-6 2-8z"/></>} />,
  wall:    <Icon size={48} d={<><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M8 4v5M14 9v5M10 14v6M16 14v6"/></>} />,
  anchor:  <Icon size={48} d={<><circle cx="12" cy="5" r="2"/><path d="M12 7v15M5 13a7 7 0 0 0 14 0M5 13l-2 2M19 13l2 2"/></>} />,
  drop:    <Icon size={48} d={<><path d="M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z"/></>} />,
  beaker:  <Icon size={48} d={<><path d="M8 3h8M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/></>} />,
  tool:    <Icon size={48} d={<><path d="M14.7 2.3a5 5 0 1 1-5 5l-7 7 3 3 7-7a5 5 0 0 0 5-5z"/></>} />,
};

// ─── Placeholder visual ─────────────────────────────────────────
function PHv2({ cap, tag, ratio = '1 / 1', style, children, className }) {
  return (
    <div className={"ph-grid " + (className || '')} style={{ aspectRatio: ratio, borderRadius: 'var(--radius)', overflow: 'hidden', ...style }}>
      {tag && <div className="ph-tag">{tag}</div>}
      {cap && <div className="ph-cap">{cap}</div>}
      {children}
    </div>
  );
}

Object.assign(window, {
  plain2, gbp, tierForQty2,
  CartProviderV2, useCartV2, ToastV2,
  Stars, PHv2, CatIcon,
  SearchIcon, CartIcon, UserIcon, HeartIcon, ChevronDown, ChevronL, ChevronR, CheckIcon,
  TruckIcon, TrophyIcon, CardIcon, StarIcon, PhoneIcon, HeadsetIcon, ShieldCheck, TagIcon, ClockIcon, MailIcon, MenuIcon,
});
