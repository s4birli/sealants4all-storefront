// Renders one or more JSON-LD structured-data blocks. Google reads these
// <script type="application/ld+json"> tags to build rich results (product
// snippets, breadcrumbs, article cards). Safe to render in Server Components.

export function JsonLd({ schema }: { schema: object | object[] }) {
  const blocks = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Schema objects are built server-side from trusted data; stringify
          // and escape the closing-script sequence to avoid breaking out.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
