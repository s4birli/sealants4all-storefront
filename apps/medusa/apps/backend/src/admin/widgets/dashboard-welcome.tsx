import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Text } from "@medusajs/ui";

/**
 * A small persistent banner on the default landing pages (Orders + Products)
 * pointing to the S4ALL Hub. It also carries the `dash:welcome` anchor that the
 * Orders page tour spotlights in its first step.
 */
const DashboardWelcomeWidget = () => {
  return (
    <Container
      className="mb-4 flex items-center justify-between gap-4 px-6 py-4"
      data-tour="dash:welcome"
    >
      <div>
        <Heading level="h2">Sealants4All dashboard</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Your custom tools — S4ALL Hub, Channel Sync, Finance, Competitor Insights — are
          in the left sidebar. Each page has a guided tour.
        </Text>
      </div>
      <a href="/app/s4all-hub">
        <Button variant="primary">Open S4ALL Hub</Button>
      </a>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: ["order.list.before", "product.list.before"],
});

export default DashboardWelcomeWidget;
