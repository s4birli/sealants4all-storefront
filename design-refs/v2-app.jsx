/* global React, ReactDOM, CartProviderV2, useCartV2, ToastV2, UtilityBar, HeaderV2, HeroV2, TrustStrip, Categories, Brands, BestSellers, TradeBanner, Deals, NewArrivals, Applications, Reviews, WhyUs, Newsletter, FooterV2, CartDrawerV2, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakColor, TweakToggle, TweakSlider */

// Sealants4All V2 — main composition

const TWEAK_DEFAULTS_V2 = /*EDITMODE-BEGIN*/{
  "accentPreset": "screwfix-orange",
  "ctaColor": "#FF6B1A",
  "brandColor": "#1E5BBE",
  "heroSpeed": 6,
  "showUtility": true,
  "showCountdown": true,
  "showTrustStrip": true,
  "showApplications": true,
  "showNewsletter": true,
  "showReviews": true,
  "showWhy": true,
  "density": "comfortable"
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  'screwfix-orange':  { brand: '#1E5BBE', cta: '#FF6B1A', brand900: '#0B2954' },
  'tradesman-blue':   { brand: '#0F4C81', cta: '#FF8000', brand900: '#08263F' },
  'toolstation-yellow': { brand: '#0046A8', cta: '#FFC400', brand900: '#001E5C' },
  'sika-red':         { brand: '#1F2937', cta: '#E30613', brand900: '#0B0F19' },
  'eco-green':        { brand: '#16604D', cta: '#FF8A3D', brand900: '#0C3A2E' },
};

function App() {
  const [t, setT] = useTweaks(TWEAK_DEFAULTS_V2);
  const preset = ACCENT_PRESETS[t.accentPreset] || ACCENT_PRESETS['screwfix-orange'];

  useEffect(() => {
    const body = document.body;
    body.style.setProperty('--brand-500', preset.brand);
    body.style.setProperty('--cta-500', preset.cta);
    body.style.setProperty('--brand-900', preset.brand900);
    // derive complementary shades
    body.style.setProperty('--brand-600', shade(preset.brand, -10));
    body.style.setProperty('--brand-700', shade(preset.brand, -20));
    body.style.setProperty('--cta-600',   shade(preset.cta, -10));
    body.style.setProperty('--cta-400',   shade(preset.cta, 12));
    body.dataset.density = t.density;
  }, [preset, t.density]);

  return (
    <CartProviderV2>
      <AppInner t={t} setT={setT} />
    </CartProviderV2>
  );
}

function AppInner({ t, setT }) {
  const { setOpen } = useCartV2();

  return (
    <>
      {t.showUtility && <UtilityBar />}
      <HeaderV2 onOpenCart={() => setOpen(true)} />

      <main id="top">
        <HeroV2 autoplayMs={t.heroSpeed * 1000} />
        {t.showTrustStrip && <TrustStrip />}
        <Categories />
        <Brands />
        <BestSellers />
        <TradeBanner />
        {t.showCountdown && <Deals />}
        <NewArrivals />
        {t.showApplications && <Applications />}
        {t.showReviews && <Reviews />}
        {t.showWhy && <WhyUs />}
        {t.showNewsletter && <Newsletter />}
      </main>
      <FooterV2 />

      <CartDrawerV2 />
      <ToastV2 />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Visual presets">
          <TweakSelect
            label="Accent preset"
            value={t.accentPreset}
            options={[
              { value: 'screwfix-orange',    label: 'Screwfix-style (blue + orange)' },
              { value: 'tradesman-blue',     label: 'Tradesman (deep blue + orange)' },
              { value: 'toolstation-yellow', label: 'Toolstation-style (blue + yellow)' },
              { value: 'sika-red',           label: 'Sika-led (charcoal + red)' },
              { value: 'eco-green',          label: 'Eco (forest green + amber)' },
            ]}
            onChange={(v) => setT('accentPreset', v)}
          />
          <TweakRadio
            label="Density"
            value={t.density}
            options={[
              { value: 'comfortable', label: 'Roomy' },
              { value: 'compact',     label: 'Compact' },
            ]}
            onChange={(v) => setT('density', v)}
          />
        </TweakSection>

        <TweakSection label="Hero">
          <TweakSlider
            label="Autoplay"
            value={t.heroSpeed}
            min={0} max={12} step={1} unit={t.heroSpeed === 0 ? ' (off)' : 's'}
            onChange={(v) => setT('heroSpeed', v)}
          />
        </TweakSection>

        <TweakSection label="Sections">
          <TweakToggle label="Top utility bar"    value={t.showUtility}     onChange={(v) => setT('showUtility', v)} />
          <TweakToggle label="Trust strip"        value={t.showTrustStrip}  onChange={(v) => setT('showTrustStrip', v)} />
          <TweakToggle label="Deals countdown"    value={t.showCountdown}   onChange={(v) => setT('showCountdown', v)} />
          <TweakToggle label="Applications grid"  value={t.showApplications} onChange={(v) => setT('showApplications', v)} />
          <TweakToggle label="Trustpilot reviews" value={t.showReviews}     onChange={(v) => setT('showReviews', v)} />
          <TweakToggle label="Why choose us"      value={t.showWhy}         onChange={(v) => setT('showWhy', v)} />
          <TweakToggle label="Newsletter"         value={t.showNewsletter}  onChange={(v) => setT('showNewsletter', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ── tiny color shade helper (clamped hex → adjusted hex) ─────
function shade(hex, percent) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * 255)));
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return '#' + toHex(adj(r)) + toHex(adj(g)) + toHex(adj(b));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
