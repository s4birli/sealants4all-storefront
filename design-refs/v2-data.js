// Sealants4All V2 — additional data (hero slides, applications, reviews, deals)
// Reuses window.S4A.PRODUCTS / BRANDS from data.js

window.S4A.V2 = {
  heroSlides: [
    {
      eyebrow: 'Bulk Buy Savings',
      title: 'Up to 30% off when you buy by the box.',
      sub: 'Trade-grade sealants and adhesives, priced by volume. No phone calls. No haggling.',
      ctaPrimary: { label: 'Shop bulk deals', href: '#deals' },
      ctaSecondary: { label: 'Open trade account', href: '#trade' },
      bg: '#0B2954',
      accent: '#FF6B1A',
      productCap: 'SIKAFLEX 522 / 12-PACK',
      tag: 'OFFER',
    },
    {
      eyebrow: 'Official Sika Distributor',
      title: 'Swiss-engineered sealants, dispatched from London.',
      sub: 'The full Sikaflex range in stock — caravan, marine, construction.',
      ctaPrimary: { label: 'Browse Sika range', href: '#brands' },
      ctaSecondary: { label: 'Technical datasheets', href: '#help' },
      bg: '#163F87',
      accent: '#FF6B1A',
      productCap: 'SIKA · OFFICIAL UK DISTRIBUTOR',
      tag: 'BRAND',
    },
    {
      eyebrow: 'Free Next-Day Delivery',
      title: 'Order before 3pm. On your van by 9am.',
      sub: 'Free UK courier delivery on orders over £150. Dispatched from our London warehouse.',
      ctaPrimary: { label: 'Start shopping', href: '#categories' },
      ctaSecondary: { label: 'Delivery info', href: '#help' },
      bg: '#1E5BBE',
      accent: '#FFB800',
      productCap: 'NEXT-DAY · UK COURIER',
      tag: 'DELIVERY',
    },
  ],
  categories: [
    { id: 'caravan',  name: 'Caravan & Marine',       count: 18, icon: 'caravan' },
    { id: 'joint',    name: 'Joint Sealing',          count: 34, icon: 'joint' },
    { id: 'fire',     name: 'Fire Protection',        count: 12, icon: 'flame' },
    { id: 'ewi',      name: 'EWI Systems',            count: 27, icon: 'wall' },
    { id: 'fixing',   name: 'Fixing & Anchoring',     count: 46, icon: 'anchor' },
    { id: 'water',    name: 'Waterproofing',          count: 21, icon: 'drop' },
    { id: 'primers',  name: 'Primers & Cleaners',     count: 14, icon: 'beaker' },
    { id: 'tools',    name: 'Tools & Applicators',    count: 9,  icon: 'tool' },
  ],
  applications: [
    { id: 'caravan',  name: 'Caravan & Motorhome Repair',     cap: 'CARAVAN ROOF SEAM / ON-SITE' },
    { id: 'windows',  name: 'Window & Door Installation',      cap: 'PVC FRAME / EXTERIOR JOINT' },
    { id: 'fire',     name: 'Fire-Rated Joints',               cap: 'EN1366 / INTUMESCENT MASTIC' },
    { id: 'ewi',      name: 'External Wall Insulation',        cap: 'BASECOAT / 25KG SACK ON SITE' },
    { id: 'wet',      name: 'Wet Room Waterproofing',          cap: 'TANKING MEMBRANE / BATHROOM' },
    { id: 'floor',    name: 'Floor & Tile Installation',       cap: 'ADHESIVE / NOTCHED TROWEL' },
  ],
  reviews: [
    { name: 'Mark, Caravan Repair (Devon)',   stars: 5, date: '2 days ago',  text: 'Ordered 24 cartridges of Sikaflex 522 at 11am — on site by 9 the next morning. Pricing was £1.50 a cartridge under my old supplier. Hard to argue with that.' },
    { name: 'Priya, Fire Protection Ltd',     stars: 5, date: '4 days ago',  text: 'Certified intumescent mastic, full EN1366 paperwork in the box. The competition makes you ring for it; these guys email it before dispatch.' },
    { name: 'Jonas, EWI Installer (Glasgow)', stars: 5, date: '1 week ago',  text: 'Pallet of Terraco basecoat delivered to a site, not a depot. Driver helped unload. Will use again.' },
    { name: 'Steve, Multi-trade (Slough)',    stars: 4, date: '2 weeks ago', text: 'Bulk calculator on the trade page saved me a phone call. App is a bit slick for the trade — but the price is right.' },
    { name: 'Anna, Architect',                stars: 5, date: '3 weeks ago', text: 'Specced Sika in a project and these were £80 cheaper than the main distributor on a 60-cartridge order. Datasheets all there.' },
  ],
  // Mark some products as Deals/New for V2 — keep simple by SKU
  dealsSku: ['SK-522-W', 'SD-FIX-AL', 'EB-FCS-01', 'TC-BC-25', 'SK-PUR-100', 'TR-PU92'],
  newSku:   ['S4-HYB-01', 'S4-PRIMER', 'S4-CLEAN', 'FS-FIS-V'],
  bestSku:  ['SK-522-W', 'SK-221-G', 'S4-HYB-01', 'SD-FIX-AL', 'FS-FIS-V', 'EB-FCS-01', 'TC-BC-25', 'SK-PUR-100'],
};

// Synthetic review stats per product
window.S4A.V2.productMeta = Object.fromEntries(window.S4A.PRODUCTS.map((p, i) => [p.sku, {
  rating: 4.3 + ((i * 13) % 7) / 10,         // 4.3..4.9
  reviews: 18 + ((i * 47) % 220),
  stock: 80 + ((i * 31) % 600),              // visible stock count
  saving: window.S4A.V2.dealsSku.includes(p.sku) ? Math.round(8 + (i * 7) % 25) : 0,  // % off
}]));
