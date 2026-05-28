// Sealants4All — data layer
// Brands, categories, products, bulk tiers, field notes

window.S4A = window.S4A || {};

window.S4A.BRANDS = [
  { id: 'sika',      name: 'SIKA',      blurb: 'SWISS ENGINEERING. JOINT SEALING.' },
  { id: 'fischer',   name: 'FISCHER',   blurb: 'GERMAN FIXING SYSTEMS. STRUCTURAL.' },
  { id: 'soudal',    name: 'SOUDAL',    blurb: 'BELGIAN ADHESIVES. PROFESSIONAL.' },
  { id: 'teroson',   name: 'TEROSON',   blurb: 'AUTOMOTIVE-GRADE. HENKEL GROUP.' },
  { id: 'terraco',   name: 'TERRACO',   blurb: 'EWI RENDERS. EXTERNAL INSULATION.' },
  { id: 'everbuild', name: 'EVERBUILD', blurb: 'UK-MADE BUILDING CHEMICALS.' },
  { id: 's4all',     name: 'S4ALL PRO', blurb: 'OUR OWN LINE. UNCOMPROMISED.' },
];

window.S4A.DISCIPLINES = [
  { id: 'caravan',  num: '01', title: 'CARAVAN & MARINE',         meta: '18 PRODUCTS · 5 BRANDS · BULK PRICING', tone: 'wide', cap: 'POLYURETHANE / 300ML' },
  { id: 'joint',    num: '02', title: 'JOINT SEALING',            meta: '34 PRODUCTS · 6 BRANDS · BULK PRICING', tone: 'tall', cap: 'HYBRID MS / 600ML SAUSAGE' },
  { id: 'fire',     num: '03', title: 'PASSIVE FIRE PROTECTION',  meta: '12 PRODUCTS · 3 BRANDS · CERTIFIED',    tone: 'square', cap: 'INTUMESCENT / EN1366' },
  { id: 'ewi',      num: '04', title: 'EWI SYSTEMS',              meta: '27 PRODUCTS · 4 BRANDS · PALLET RATE',  tone: 'wide', cap: 'BASECOAT / 25KG SACK' },
  { id: 'fixing',   num: '05', title: 'FIXING & ANCHORING',       meta: '46 PRODUCTS · 2 BRANDS · STRUCTURAL',   tone: 'tall', cap: 'CHEMICAL ANCHOR / 410ML' },
  { id: 'water',    num: '06', title: 'WATERPROOFING',            meta: '21 PRODUCTS · 5 BRANDS · CERTIFIED',    tone: 'square', cap: 'LIQUID MEMBRANE / 5L' },
];

window.S4A.PRODUCTS = [
  { sku: 'SK-522-W',  num: '001', name: 'SIKAFLEX 522',         brand: 'SIKA',      use: 'CARAVAN SEALANT',     from: 8.34,  tiers: [
    { min: 1,   price: 8.34 }, { min: 12, price: 7.89 }, { min: 24, price: 7.42 }, { min: 100, price: 6.85 }, { min: 500, price: 6.20 },
  ], cap: 'SIKAFLEX 522 / 300ML' },
  { sku: 'SK-221-G',  num: '002', name: 'SIKAFLEX 221',         brand: 'SIKA',      use: 'MULTI-PURPOSE',       from: 7.89, tiers: [
    { min: 1, price: 7.89 }, { min: 12, price: 7.40 }, { min: 24, price: 6.95 }, { min: 100, price: 6.30 }, { min: 500, price: 5.70 },
  ], cap: 'SIKAFLEX 221 / 300ML' },
  { sku: 'S4-HYB-01', num: '003', name: 'S4ALL PRO HYBRID',     brand: 'S4ALL PRO', use: 'ALL-IN-ONE',          from: 2.50, tiers: [
    { min: 1, price: 2.50 }, { min: 12, price: 2.22 }, { min: 24, price: 2.05 }, { min: 100, price: 1.80 }, { min: 500, price: 1.55 },
  ], cap: 'S4ALL PRO / HYBRID 290ML' },
  { sku: 'SD-FIX-AL', num: '004', name: 'SOUDAL FIX ALL HIGH TACK', brand: 'SOUDAL', use: 'HYBRID ADHESIVE',  from: 6.20, tiers: [
    { min: 1, price: 6.20 }, { min: 12, price: 5.80 }, { min: 24, price: 5.42 }, { min: 100, price: 4.95 }, { min: 500, price: 4.40 },
  ], cap: 'SOUDAL FIX ALL / 290ML' },
  { sku: 'FS-FIS-V',  num: '005', name: 'FISCHER FIS V 360 S',  brand: 'FISCHER',   use: 'CHEMICAL ANCHOR',     from: 18.40, tiers: [
    { min: 1, price: 18.40 }, { min: 12, price: 17.10 }, { min: 24, price: 16.00 }, { min: 100, price: 14.40 }, { min: 500, price: 12.80 },
  ], cap: 'FISCHER FIS V / 360ML' },
  { sku: 'EB-FCS-01', num: '006', name: 'EVERBUILD FIRECRYL FR', brand: 'EVERBUILD', use: 'INTUMESCENT MASTIC', from: 4.95, tiers: [
    { min: 1, price: 4.95 }, { min: 12, price: 4.60 }, { min: 24, price: 4.30 }, { min: 100, price: 3.90 }, { min: 500, price: 3.45 },
  ], cap: 'FIRECRYL FR / 310ML' },
  { sku: 'TC-BC-25',  num: '007', name: 'TERRACO BASECOAT',     brand: 'TERRACO',   use: 'EWI BASECOAT',        from: 22.10, tiers: [
    { min: 1, price: 22.10 }, { min: 4, price: 20.60 }, { min: 24, price: 19.00 }, { min: 60, price: 17.40 }, { min: 200, price: 15.80 },
  ], cap: 'TERRACO BASECOAT / 25KG' },
  { sku: 'TR-PU92',   num: '008', name: 'TEROSON PU 92',        brand: 'TEROSON',   use: 'WINDSCREEN ADHESIVE', from: 14.20, tiers: [
    { min: 1, price: 14.20 }, { min: 12, price: 13.10 }, { min: 24, price: 12.30 }, { min: 100, price: 11.10 }, { min: 500, price: 9.85 },
  ], cap: 'TEROSON PU 92 / 310ML' },
  { sku: 'S4-PRIMER', num: '009', name: 'S4ALL PRO PRIMER 209', brand: 'S4ALL PRO', use: 'ADHESION PROMOTER',   from: 9.40, tiers: [
    { min: 1, price: 9.40 }, { min: 6, price: 8.60 }, { min: 24, price: 7.90 }, { min: 100, price: 7.10 }, { min: 500, price: 6.20 },
  ], cap: 'S4ALL PRIMER 209 / 250ML' },
  { sku: 'SK-PUR-100',num: '010', name: 'SIKA PUR 100',          brand: 'SIKA',      use: 'EXPANDING FOAM',     from: 6.75, tiers: [
    { min: 1, price: 6.75 }, { min: 12, price: 6.30 }, { min: 24, price: 5.92 }, { min: 100, price: 5.40 }, { min: 500, price: 4.80 },
  ], cap: 'SIKA PUR 100 / 750ML' },
  { sku: 'SD-MAGNUM', num: '011', name: 'SOUDAL CALIBRE MAGNUM', brand: 'SOUDAL',   use: 'SAUSAGE GUN',          from: 38.00, tiers: [
    { min: 1, price: 38.00 }, { min: 4, price: 35.50 }, { min: 12, price: 33.00 }, { min: 30, price: 30.50 }, { min: 100, price: 27.40 },
  ], cap: 'SOUDAL CALIBRE / 600ML' },
  { sku: 'S4-CLEAN',  num: '012', name: 'S4ALL PRO CLEAN A',     brand: 'S4ALL PRO', use: 'SOLVENT CLEANER',     from: 5.10, tiers: [
    { min: 1, price: 5.10 }, { min: 6, price: 4.70 }, { min: 24, price: 4.30 }, { min: 100, price: 3.85 }, { min: 500, price: 3.30 },
  ], cap: 'S4ALL CLEAN A / 1L' },
];

window.S4A.FIELD_NOTES = [
  {
    num: 'N-014',
    date: '2026-05-12',
    minutes: 7,
    kicker: 'CARAVAN REPAIR',
    title: 'WHY SIKAFLEX 522 OUTLASTS YOUR CARAVAN ROOF',
    deck: 'Polyurethane chemistry, UV exposure, and the lap-joint failure mode nobody photographs.'
  },
  {
    num: 'N-015',
    date: '2026-05-19',
    minutes: 11,
    kicker: 'FIRE PROTECTION',
    title: 'INTUMESCENT MASTICS, CERTIFIED. WHAT EN1366 ACTUALLY MEASURES.',
    deck: 'A field guide to the test, the cert, and the small print quietly disqualifying half the market.'
  },
  {
    num: 'N-016',
    date: '2026-05-23',
    minutes: 6,
    kicker: 'EWI SYSTEMS',
    title: 'BASECOAT, MESH, RENDER — THE THREE LAYERS NOBODY EXPLAINS PROPERLY',
    deck: 'A working drawing of how an external wall insulation system survives a British winter.'
  },
];

window.S4A.INDEX_ROWS = window.S4A.PRODUCTS.slice(0, 10);

// Hero manifestos — variants
window.S4A.MANIFESTOS = [
  { id: 'bonds',   lines: ['BONDS','BUILT','TO OUTLAST','THE','BUILDING.'] },
  { id: 'silent',  lines: ['SEALED.','FIXED.','RENDERED.','SHIPPED','BY MONDAY.'] },
  { id: 'tools',   lines: ['MATERIALS','THAT HOLD.','BRANDS','THAT DON\u2019T','BLUFF.'] },
  { id: 'phone',   lines: ['STOP','PHONING','FOR PRICES.','THE GRID','SCALES.'] },
];
