import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Text, Input, Table } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { DashboardTour, TOURS } from "../../components/dashboard-tour";

type Order = {
  id: string;
  display_id: number;
  email: string;
  total: number;
  currency_code: string;
  created_at: string;
};

function money(n: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(n || 0);
}

const FinancePage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    fetch("/admin/orders?limit=15&fields=id,display_id,email,total,currency_code,created_at", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]));
  }, []);

  const exportUrl = `/admin/finance/accounting-export${
    from || to ? `?${[from && `from=${from}`, to && `to=${to}`].filter(Boolean).join("&")}` : ""
  }`;

  return (
    <Container className="divide-y p-0">
      <DashboardTour pageId="finance" steps={TOURS["finance"]} />
      <div className="px-6 py-5" data-tour="fin:intro">
        <Heading level="h1">Finance</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Invoices and accounting export — our own alternative to A2X. Export orders as a
          CSV to import into Xero or QuickBooks.
        </Text>
      </div>

      <div className="flex flex-wrap items-end gap-3 px-6 py-5" data-tour="fin:range">
        <div>
          <Text size="xsmall" className="text-ui-fg-subtle mb-1">
            From
          </Text>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Text size="xsmall" className="text-ui-fg-subtle mb-1">
            To
          </Text>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <a href={exportUrl} data-tour="fin:csv">
          <Button variant="primary">Download accounting CSV</Button>
        </a>
      </div>

      <div className="px-6 py-5">
        <Text size="small" weight="plus" className="mb-3">
          Recent orders
        </Text>
        {orders.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No orders yet.
          </Text>
        ) : (
          <Table data-tour="fin:invoice">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Invoice</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Invoice PDF</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map((o) => (
                <Table.Row key={o.id}>
                  <Table.Cell>#{o.display_id}</Table.Cell>
                  <Table.Cell>{new Date(o.created_at).toLocaleDateString("en-GB")}</Table.Cell>
                  <Table.Cell>{o.email}</Table.Cell>
                  <Table.Cell>{money(o.total, o.currency_code)}</Table.Cell>
                  <Table.Cell>
                    <a href={`/admin/orders/${o.id}/invoice`} target="_blank" rel="noreferrer">
                      <Button size="small" variant="secondary">
                        Open
                      </Button>
                    </a>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Finance",
});

export default FinancePage;
