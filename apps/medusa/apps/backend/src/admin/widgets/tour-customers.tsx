import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DashboardTour, TOURS } from "../components/dashboard-tour";

const TourCustomers = () => <DashboardTour pageId="customers" steps={TOURS["customers"]} />;

export const config = defineWidgetConfig({ zone: "customer.list.before" });

export default TourCustomers;
