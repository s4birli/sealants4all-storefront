import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createInventoryItemsWorkflow,
  createInventoryLevelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

const DEFAULT_STOCK = 1000;

/**
 * Enables real per-SKU inventory tracking at the London Warehouse for all
 * variants. Idempotent and ORDER-CRITICAL: flipping manage_inventory=true
 * without creating an inventory item breaks add-to-cart AND checkout, and
 * updateProductVariantsWorkflow does NOT create items — so we always create
 * the item + level + link in the same run. Generous starting quantity (1000)
 * so nothing reads "out" / blocks checkout right after enablement.
 *
 *   ./node_modules/.bin/medusa exec ./src/scripts/setup-inventory.ts
 */
export default async function setupInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  // ── 0. Prerequisites ──────────────────────────────────────────────────
  const { data: locs } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "sales_channels.name"],
    filters: { name: "London Warehouse" },
  });
  const location = (locs as { id: string; sales_channels?: { name: string }[] }[])[0];
  if (!location) throw new Error("London Warehouse stock location not found — run setup-uk-fulfillment first");

  const hasChannel = (location.sales_channels || []).some((s) => s.name === "S4ALL Storefront");
  if (!hasChannel) {
    const { data: scs } = await query.graph({
      entity: "sales_channel",
      fields: ["id", "name"],
      filters: { name: "S4ALL Storefront" },
    });
    const sc = (scs as { id: string }[])[0];
    if (sc) {
      await linkSalesChannelsToStockLocationWorkflow(container)
        .run({ input: { id: location.id, add: [sc.id] } })
        .catch(() => {});
    }
  }

  // ── 1. Enumerate variants + current state ─────────────────────────────
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "manage_inventory", "inventory_items.inventory_item_id"],
    pagination: { take: 1000, skip: 0 },
  });
  const all = variants as {
    id: string;
    sku: string | null;
    manage_inventory: boolean;
    inventory_items?: { inventory_item_id: string }[];
  }[];

  const needsFlag = all.filter((v) => !v.manage_inventory);
  const needsItem = all.filter((v) => (v.inventory_items?.length ?? 0) === 0);
  logger.info(`📦  ${all.length} variants — ${needsFlag.length} need flag, ${needsItem.length} need inventory item`);

  // ── 2. Create missing inventory items WITH London level, then link ─────
  // (Do items BEFORE flipping the flag so no window exists where a managed
  //  variant has no item.)
  if (needsItem.length) {
    const BATCH = 50;
    let created = 0;
    for (let i = 0; i < needsItem.length; i += BATCH) {
      const slice = needsItem.slice(i, i + BATCH);
      const { result } = await createInventoryItemsWorkflow(container).run({
        input: {
          items: slice.map((v) => ({
            sku: v.sku || undefined,
            requires_shipping: true,
            location_levels: [{ location_id: location.id, stocked_quantity: DEFAULT_STOCK }],
          })),
        },
      });
      const items = result as { id: string }[];
      for (let j = 0; j < slice.length; j++) {
        await link
          .create({
            [Modules.PRODUCT]: { variant_id: slice[j].id },
            [Modules.INVENTORY]: { inventory_item_id: items[j].id },
            data: { required_quantity: 1 },
          })
          .catch(() => {});
      }
      created += slice.length;
      logger.info(`   inventory items: ${created}/${needsItem.length}`);
    }
  }

  // ── 3. Reconcile: variants that already had an item but no London level ─
  const { data: variants2 } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.location_levels.location_id",
    ],
    pagination: { take: 1000, skip: 0 },
  });
  const levelsToCreate: { inventory_item_id: string; location_id: string; stocked_quantity: number }[] = [];
  for (const v of variants2 as {
    inventory_items?: {
      inventory_item_id: string;
      inventory?: { location_levels?: { location_id: string }[] };
    }[];
  }[]) {
    for (const ii of v.inventory_items || []) {
      const hasLevel = (ii.inventory?.location_levels || []).some((l) => l.location_id === location.id);
      if (!hasLevel) {
        levelsToCreate.push({
          inventory_item_id: ii.inventory_item_id,
          location_id: location.id,
          stocked_quantity: DEFAULT_STOCK,
        });
      }
    }
  }
  if (levelsToCreate.length) {
    await createInventoryLevelsWorkflow(container).run({ input: { inventory_levels: levelsToCreate } });
    logger.info(`   created ${levelsToCreate.length} missing London levels`);
  }

  // ── 4. Flip manage_inventory=true (items/levels now guaranteed) ────────
  if (needsFlag.length) {
    const BATCH = 100;
    let flipped = 0;
    for (let i = 0; i < needsFlag.length; i += BATCH) {
      const slice = needsFlag.slice(i, i + BATCH);
      await updateProductVariantsWorkflow(container).run({
        input: {
          product_variants: slice.map((v) => ({
            id: v.id,
            manage_inventory: true,
            allow_backorder: false,
          })),
        },
      });
      flipped += slice.length;
      logger.info(`   manage_inventory=true: ${flipped}/${needsFlag.length}`);
    }
  }

  logger.info(`✅  Inventory enabled — ${all.length} variants tracked at London Warehouse (start qty ${DEFAULT_STOCK})`);
}
