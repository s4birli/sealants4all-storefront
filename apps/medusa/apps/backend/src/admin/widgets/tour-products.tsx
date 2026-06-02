import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourProducts = () => <DashboardTour pageId="products" steps={TOURS["products"]} />;

export const config = defineWidgetConfig({ zone: "product.list.before" });

export default TourProducts;
