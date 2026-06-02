import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Text } from "@medusajs/ui";

type OrderData = { id?: string };

const OrderInvoiceWidget = ({ data }: { data: OrderData }) => {
  return (
    <Container className="flex items-center justify-between px-6 py-4">
      <div>
        <Heading level="h2">Invoice</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Open a printable invoice (save as PDF).
        </Text>
      </div>
      <a href={`/admin/orders/${data?.id}/invoice`} target="_blank" rel="noreferrer">
        <Button size="small" variant="secondary" disabled={!data?.id}>
          Open invoice
        </Button>
      </a>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.details.after",
});

export default OrderInvoiceWidget;
