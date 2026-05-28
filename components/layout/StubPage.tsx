import Link from "next/link";
import { UtilityBar } from "@/components/layout/UtilityBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

type StubPageProps = {
  title: string;
  description: string;
};

export function StubPage({ title, description }: StubPageProps) {
  return (
    <>
      <UtilityBar />
      <Header />
      <main id="top">
        <section className="section">
          <div
            className="container"
            style={{ maxWidth: 720, textAlign: "center" }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--cta-500)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Coming soon
            </div>
            <h1
              style={{
                fontFamily:
                  "var(--font-manrope), Manrope, system-ui, sans-serif",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                color: "var(--body)",
                fontSize: 16,
                marginBottom: 24,
              }}
            >
              {description}
            </p>
            <Link href="/" className="btn btn-primary btn-lg">
              ← Back to homepage
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
