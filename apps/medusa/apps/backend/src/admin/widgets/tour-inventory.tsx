import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourInventory = () => <DashboardTour pageId="inventory" steps={TOURS["inventory"]} />;

export const config = defineWidgetConfig({ zone: "inventory_item.list.before" });

export default TourInventory;
