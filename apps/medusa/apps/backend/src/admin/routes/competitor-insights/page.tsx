import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Text, Badge, Table, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { DashboardTour, TOURS } from "../../components/dashboard-tour";

type Match = { competitor: string; title: string; url: string; price_inc_vat: number | null; confidence: string };
type Insight = {
  sku: string;
  title: string;
  brand: string;
  our_price_inc_vat: number;
  market_min: number | null;
  market_median: number | null;
  market_max: number | null;
  price_position: string;
  matches: Match[];
  keyword_gaps: string[];
  positioning_note: string;
};
type Summary = {
  generated_at?: string;
  configured: boolean;
  products_analysed: number;
  notes: string[];
  insights: Insight[];
};

const POS_COLOR: Record<string, "green" | "orange" | "red" | "grey"> = {
  cheapest: "green",
  below_median: "green",
  above_median: "orange",
  dearest: "red",
  unknown: "grey",
};

function gbp(n: number | null) {
  return n == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

const CompetitorInsightsPage = () => {
  const [data, setData] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/admin/competitor-insights", { credentials: "include" });
    setData(await res.json());
  };
  useEffect(() => {
    load();
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/admin/competitor-insights", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Run failed");
      toast.success(`Analysed ${json.summary.products_analysed} products`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <DashboardTour pageId="competitor-insights" steps={TOURS["competitor-insights"]} />
      <div className="flex items-center justify-between px-6 py-4">
        <div data-tour="ci:intro">
          <Heading level="h1">Competitor Insights</Heading>
          <Text size="small" className="text-ui-fg-subtle" data-tour="ci:warning">
            Advisory price &amp; keyword intelligence. Review manually — never auto-reprice
            to match competitors (UK competition law).
          </Text>
        </div>
        <Button variant="primary" onClick={run} isLoading={busy} data-tour="ci:run">
          Run analysis now
        </Button>
      </div>

      {data && !data.configured && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error">
            {data.notes?.[0] || "Set SERPER_API_KEY and ANTHROPIC_API_KEY to enable competitor data."}
          </Text>
        </div>
      )}

      <div className="px-6 py-4">
        {!data || data.insights.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No insights yet. Click “Run analysis now”.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Our price (inc VAT)</Table.HeaderCell>
                <Table.HeaderCell>Market min / med / max</Table.HeaderCell>
                <Table.HeaderCell data-tour="ci:position">Position</Table.HeaderCell>
                <Table.HeaderCell data-tour="ci:gaps">Keyword gaps</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {data.insights.map((it) => (
                <Table.Row key={it.sku}>
                  <Table.Cell>
                    <div className="font-medium">{it.title}</div>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {it.brand} · {it.sku}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{gbp(it.our_price_inc_vat)}</Table.Cell>
                  <Table.Cell>
                    {gbp(it.market_min)} / {gbp(it.market_median)} / {gbp(it.market_max)}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="small" color={POS_COLOR[it.price_position] || "grey"}>
                      {it.price_position.replace(/_/g, " ")}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {it.keyword_gaps.length ? it.keyword_gaps.slice(0, 4).join(", ") : "—"}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
        {data?.generated_at && (
          <Text size="xsmall" className="text-ui-fg-subtle mt-3">
            Last run: {new Date(data.generated_at).toLocaleString()} · {data.products_analysed} products
          </Text>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Competitor Insights",
});

export default CompetitorInsightsPage;
