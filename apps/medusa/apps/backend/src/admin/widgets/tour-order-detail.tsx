import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourOrderDetail = () => (
  <DashboardTour pageId="order-detail" steps={TOURS["order-detail"]} />
);

export const config = defineWidgetConfig({ zone: "order.details.before" });

export default TourOrderDetail;
