export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--brand-900)",
        color: "white",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          style={{
            fontFamily: "var(--font-manrope), Manrope, system-ui, sans-serif",
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          Sealants<span style={{ color: "var(--cta-500)" }}>4</span>All
        </div>
        <h1
          style={{
            fontSize: 24,
            color: "white",
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          You&apos;re offline.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 15 }}>
          Cart saved. Reconnect to checkout. We&apos;ll pick up exactly where
          you left off.
        </p>
      </div>
    </main>
  );
}
