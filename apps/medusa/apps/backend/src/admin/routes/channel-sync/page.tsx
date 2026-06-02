import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Text, Badge, Table, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { DashboardTour, TOURS } from "../../components/dashboard-tour";

type Summary = {
  generated_at: string;
  source: string;
  product_count: number;
  priced_product_count: number;
  channels: Record<string, string>;
  warnings: string[];
};

type Status = { summary: Summary | null; pending_outbox_events: number };

const MODE_LABEL: Record<string, string> = {
  native: "Native (Medusa)",
  api_draft: "API draft",
  manual_review: "Manual review",
};

const ChannelSyncPage = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/admin/channel-sync", { credentials: "include" });
    setStatus(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/admin/channel-sync", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Export failed");
      toast.success(
        `Generated feeds for ${json.summary.priced_product_count}/${json.summary.product_count} products`,
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const s = status?.summary;

  return (
    <Container className="divide-y p-0">
      <DashboardTour pageId="channel-sync" steps={TOURS["channel-sync"]} />
      <div className="flex items-center justify-between px-6 py-4">
        <div data-tour="cs:intro">
          <Heading level="h1">Channel Sync</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Medusa is the source of truth. Generates marketplace-ready draft feeds — it
            does not publish live (that needs each platform&apos;s API credentials).
          </Text>
        </div>
        <Button variant="primary" onClick={generate} isLoading={busy} data-tour="cs:generate">
          Generate feeds now
        </Button>
      </div>

      <div className="px-6 py-4">
        {s ? (
          <div className="mb-4 flex gap-6" data-tour="cs:stats">
            <Stat label="Products" value={String(s.product_count)} />
            <Stat label="Exportable (priced)" value={String(s.priced_product_count)} />
            <Stat label="Pending events" value={String(status?.pending_outbox_events ?? 0)} />
            <Stat label="Last generated" value={new Date(s.generated_at).toLocaleString()} />
          </div>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            No feeds generated yet. Click “Generate feeds now”.
          </Text>
        )}

        {s && (
          <Table data-tour="cs:table">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Channel</Table.HeaderCell>
                <Table.HeaderCell>Mode</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.entries(s.channels).map(([id, mode]) => (
                <Table.Row key={id}>
                  <Table.Cell className="capitalize">{id.replace(/_/g, " ")}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="small"
                      color={mode === "native" ? "green" : mode === "api_draft" ? "blue" : "grey"}
                    >
                      {MODE_LABEL[mode] || mode}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}

        {s?.warnings?.length ? (
          <Text size="small" className="text-ui-fg-subtle mt-4">
            {s.warnings.join(" · ")}
          </Text>
        ) : null}
      </div>
    </Container>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="large" weight="plus">
        {value}
      </Text>
    </div>
  );
}

export const config = defineRouteConfig({
  label: "Channel Sync",
});

export default ChannelSyncPage;
