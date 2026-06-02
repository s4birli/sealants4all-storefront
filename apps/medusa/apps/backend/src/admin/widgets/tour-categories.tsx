import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourCategories = () => <DashboardTour pageId="categories" steps={TOURS["categories"]} />;

export const config = defineWidgetConfig({ zone: "product_category.list.before" });

export default TourCategories;
