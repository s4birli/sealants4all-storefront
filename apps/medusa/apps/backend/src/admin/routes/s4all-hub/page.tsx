import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { DashboardTour, TOURS, resetAllTours } from "../../components/dashboard-tour";

type Hub = {
  products: number;
  pendingSync: number;
  lastSync: string | null;
};

const QUICK_ACTIONS = [
  { label: "Add a product", href: "/app/products/create", primary: true },
  { label: "View catalogue", href: "/app/products" },
  { label: "Orders", href: "/app/orders" },
  { label: "Channel Sync", href: "/app/channel-sync" },
];

const S4allHubPage = () => {
  const [hub, setHub] = useState<Hub>({ products: 0, pendingSync: 0, lastSync: null });

  useEffect(() => {
    (async () => {
      try {
        const [prodRes, syncRes] = await Promise.all([
          fetch("/admin/products?limit=1", { credentials: "include" }),
          fetch("/admin/channel-sync", { credentials: "include" }),
        ]);
        const prod = await prodRes.json();
        const sync = await syncRes.json();
        setHub({
          products: prod.count ?? 0,
          pendingSync: sync.pending_outbox_events ?? 0,
          lastSync: sync.summary?.generated_at ?? null,
        });
      } catch {
        /* leave defaults */
      }
    })();
  }, []);

  return (
    <Container className="divide-y p-0">
      <DashboardTour pageId="s4all-hub" steps={TOURS["s4all-hub"]} />
      <div className="px-6 py-5" data-tour="hub:welcome">
        <Heading level="h1">Sealants4All Hub</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Everyday tasks in one place. The full Medusa admin is always in the sidebar.
        </Text>
      </div>

      <div className="flex flex-wrap gap-8 px-6 py-5" data-tour="hub:stats">
        <Stat label="Products in catalogue" value={String(hub.products)} />
        <Stat label="Pending channel events" value={String(hub.pendingSync)} />
        <Stat
          label="Last channel export"
          value={hub.lastSync ? new Date(hub.lastSync).toLocaleString() : "—"}
        />
      </div>

      <div className="px-6 py-5">
        <Text size="small" weight="plus" className="mb-3">
          Quick actions
        </Text>
        <div className="flex flex-wrap gap-3" data-tour="hub:quick-actions">
          {QUICK_ACTIONS.map((a) => (
            <a key={a.href} href={a.href}>
              <Button variant={a.primary ? "primary" : "secondary"}>{a.label}</Button>
            </a>
          ))}
          <Button
            variant="transparent"
            size="small"
            onClick={() => {
              resetAllTours();
              window.location.reload();
            }}
          >
            Replay tours
          </Button>
        </div>
      </div>

      <div className="px-6 py-5" data-tour="hub:tips">
        <Text size="small" weight="plus" className="mb-2">
          Tips
        </Text>
        <ul className="text-ui-fg-subtle flex flex-col gap-1 text-sm">
          <li>
            • Open a product to use <Badge size="2xsmall">AI product copy</Badge> for
            descriptions &amp; SEO.
          </li>
          <li>• New/edited products appear on the storefront within ~60 seconds.</li>
          <li>• Use Channel Sync to generate Amazon/eBay/TikTok/Etsy/B2B draft feeds.</li>
        </ul>
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
      <Text size="xlarge" weight="plus">
        {value}
      </Text>
    </div>
  );
}

export const config = defineRouteConfig({
  label: "S4ALL Hub",
});

export default S4allHubPage;
