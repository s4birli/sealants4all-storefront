import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourPriceLists = () => <DashboardTour pageId="price-lists" steps={TOURS["price-lists"]} />;

export const config = defineWidgetConfig({ zone: "price_list.list.before" });

export default TourPriceLists;
