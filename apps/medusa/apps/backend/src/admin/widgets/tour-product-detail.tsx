import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourProductDetail = () => (
  <DashboardTour pageId="product-detail" steps={TOURS["product-detail"]} />
);

export const config = defineWidgetConfig({ zone: "product.details.before" });

export default TourProductDetail;
