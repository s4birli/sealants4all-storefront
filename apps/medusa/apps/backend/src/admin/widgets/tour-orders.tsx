import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourOrders = () => <DashboardTour pageId="orders" steps={TOURS["orders"]} />;

export const config = defineWidgetConfig({ zone: "order.list.before" });

export default TourOrders;
