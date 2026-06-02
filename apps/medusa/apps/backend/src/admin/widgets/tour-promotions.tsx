import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourPromotions = () => <DashboardTour pageId="promotions" steps={TOURS["promotions"]} />;

export const config = defineWidgetConfig({ zone: "promotion.list.before" });

export default TourPromotions;
