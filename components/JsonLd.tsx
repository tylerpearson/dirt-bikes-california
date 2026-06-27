/**
 * Renders a JSON-LD structured-data block. Server component — the script is
 * baked into the static HTML at build time.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Build-time data from our own registry; escape `<` so a stray
      // "</script>" in any string can't break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
