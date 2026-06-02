import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourCollections = () => <DashboardTour pageId="collections" steps={TOURS["collections"]} />;

export const config = defineWidgetConfig({ zone: "product_collection.list.before" });

export default TourCollections;
