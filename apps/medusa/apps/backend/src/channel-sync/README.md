# Channel Sync

Medusa remains the source of truth. This package exports marketplace-ready data
without publishing anything live.

Generated files:

- `exports/channel-sync/own-store-master-snapshot.json` - canonical Medusa/own
  storefront snapshot for audit and diffing.
- `exports/channel-sync/amazon-listings-draft.json` - Amazon SP-API Listings
  Items / feeds shaped draft data.
- `exports/channel-sync/ebay-inventory-draft.json` - eBay Inventory API-shaped
  draft data.
- `exports/channel-sync/tiktok-products-draft.json` - TikTok Shop Product API
  shaped draft data.
- `exports/channel-sync/etsy-listings-draft.json` - Etsy Open API shaped draft
  data, pending manual eligibility/taxonomy review.
- `exports/channel-sync/vinted-manual-review.csv` - manual review queue only;
  Vinted is not treated as an automated channel for construction materials.
- `exports/channel-sync/b2b-price-list.csv` - trade price tiers for direct B2B
  selling.
- `exports/channel-sync/channel-listings-template.jsonl` - SKU mapping template
  for future live channel sync.
- `exports/channel-sync/outbox.jsonl` - local development queue written by the
  product create/update subscriber.
- `exports/channel-sync/summary.json` - counts, file paths, and warnings.

Run from the repo root:

```bash
pnpm channel:export
```

Live publishing should only be added after credentials, seller policies, category
mapping, rate-limit handling, and retry/idempotency storage are in place.
