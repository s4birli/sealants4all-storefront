import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";

/**
 * GET /store/product-categories/:id
 *
 * Overrides Medusa's default store handler, which checks `if (!category)` on a
 * value that is ALWAYS an array — so a non-existent id slipped through and
 * returned `200 { product_category: undefined }` (serialised to `{}`).
 *
 * Here we destructure the array (mirroring the core `store/regions/[id]`
 * handler) and throw NOT_FOUND when it's empty, so a missing category correctly
 * returns HTTP 404. The publishable-key requirement is preserved by the route's
 * `/store` prefix middleware.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph(
    {
      entity: "product_category",
      filters: { id: req.params.id, ...req.filterableFields },
      fields: req.queryConfig.fields,
    },
    {
      locale: req.locale,
    },
  );

  const [product_category] = categories;

  if (!product_category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id: ${req.params.id} was not found`,
    );
  }

  res.json({ product_category });
}
