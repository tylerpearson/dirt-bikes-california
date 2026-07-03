// Shared helpers for the data-pipeline scripts (fetch-*-area.mjs and
// build-*-routes.mjs). These were previously three (or more) byte-identical
// or near-identical copies pasted across the six pipeline scripts; this
// module is the single source of truth for the pure geometry/formatting
// helpers, the ArcGIS paging skeleton, and the two committed-file writers.
//
// Pure helpers only: no top-level side effects, no network calls at import
// time. `fetchElevations` and `fetchPaged` perform network I/O, but only
// when called, never on import.

import { writeFile } from "node:fs/promises";

/** Shared User-Agent string sent on every request to USFS/BLM ArcGIS and
 * opentopodata.org. */
export const UA = "dirt-bikes/1.0 (route-guide; build script)";

/** Squared planar distance between two [lon, lat] points (no sqrt; used only
 * for nearest-endpoint comparisons where relative order is all that matters). */
export function d2(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/** Great-circle distance in miles between two [lon, lat] points. */
export function haversineMi(a, b) {
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLon = toR(a[0] - b[0]);
  const la1 = toR(a[1]);
  const la2 = toR(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Greedy-stitch line parts by nearest endpoints, but break into SEPARATE paths
// when the nearest remaining piece is farther than GAP away. A route selector
// often pulls several disjoint segments (a singletrack network, a route split
// by a wash); bridging those gaps would draw phantom straight lines and
// inflate the distance. Returns an array of ordered paths (one per contiguous
// part). NOTE: build-area-routes.mjs deliberately keeps its own older
// single-path `stitch()` instead of this gap-aware version — see the comment
// there.
export const GAP = 0.0025; // ~275 m in degrees at this latitude

/** Gap-aware greedy stitcher: joins line parts end-to-end by nearest endpoint,
 * splitting into a new path whenever the nearest remaining piece is farther
 * than GAP away. Sub-2-point parts are dropped; empty input returns []. */
export function stitchParts(parts) {
  parts = parts.filter((p) => p.length > 1).map((p) => p.slice());
  if (!parts.length) return [];
  const order = () => parts.sort((a, b) => b.length - a.length);
  order();
  const paths = [];
  let path = parts.shift();
  while (parts.length) {
    const tail = path[path.length - 1];
    const head = path[0];
    let best = { d: Infinity };
    parts.forEach((seg, i) => {
      const s = seg[0];
      const e = seg[seg.length - 1];
      for (const c of [
        { d: d2(tail, s), i, flip: false, end: "tail" },
        { d: d2(tail, e), i, flip: true, end: "tail" },
        { d: d2(head, e), i, flip: false, end: "head" },
        { d: d2(head, s), i, flip: true, end: "head" },
      ])
        if (c.d < best.d) best = c;
    });
    if (Math.sqrt(best.d) > GAP) {
      // Nearest piece is too far: close this part and start a fresh one.
      paths.push(path);
      order();
      path = parts.shift();
      continue;
    }
    const seg = parts.splice(best.i, 1)[0];
    const o = best.flip ? seg.slice().reverse() : seg;
    path = best.end === "tail" ? path.concat(o) : o.concat(path);
  }
  paths.push(path);
  return paths.filter((p) => p.length > 1);
}

/** Promise-based delay, used to stay polite to opentopodata (1 req/s). */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Meters -> feet, rounded to the nearest 50 ft. */
export const fmtFt = (m) => Math.round((m * 3.28084) / 50) * 50;

/** Escape the three XML-significant characters for a GPX text node. Quotes
 * are intentionally passed through unescaped — GPX `<name>` is a text node,
 * not an attribute value. */
export const escXml = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/** Format an elevation range in feet, e.g. "6,800–7,500 ft". This is the one
 * intentional behavior change in this refactor: the three copies this
 * replaces called the bare, locale-dependent `toLocaleString()` (a regen on a
 * non-US-locale machine would have produced "6.800–7.500 ft"). Pinning
 * "en-US" makes regen output machine-independent; the committed data is
 * already in this format, so this is a no-op on en-US machines. */
export function fmtFtRange(eMinMeters, eMaxMeters) {
  return `${fmtFt(eMinMeters).toLocaleString("en-US")}–${fmtFt(eMaxMeters).toLocaleString("en-US")} ft`;
}

/** camelCase + "Routes" suffix for a generated module's export name, e.g.
 * "el-paso" -> "elPasoRoutes". */
export const varName = (area) =>
  area.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Routes";

// ---- elevation (best-effort) -------------------------------------------------

/** Best-effort SRTM elevation sampling via opentopodata.org for up to 90
 * evenly-spaced points along `coords` (an array of [lon, lat]). Returns an
 * array of `{ i, ele }` (index into `coords`, elevation in meters or null),
 * or `null` on any failure (network error, non-OK response, non-OK status in
 * the response body). */
export async function fetchElevations(coords) {
  const N = Math.min(90, coords.length);
  const idx = Array.from({ length: N }, (_, i) =>
    Math.round((i * (coords.length - 1)) / (N - 1)),
  );
  const locs = idx.map((i) => `${coords[i][1]},${coords[i][0]}`).join("|");
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm90m?locations=${locs}`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK") return null;
    return idx.map((i, k) => ({ i, ele: json.results[k]?.elevation ?? null }));
  } catch {
    return null;
  }
}

/** Turn the sparse `{ i, ele }[]` samples from `fetchElevations` into a
 * lookup: `hasEle` (any non-null sample), `eMin`/`eMax` across the non-null
 * samples, and `eleAt(i)` which returns the elevation of the nearest sampled
 * index to `i` (nearest-neighbor interpolation), or null if there were no
 * usable samples. */
export function elevationLookup(eleSamples) {
  const eleByIdx = new Map((eleSamples ?? []).map((s) => [s.i, s.ele]));
  let eMin = Infinity;
  let eMax = -Infinity;
  let hasEle = false;
  if (eleSamples) {
    for (const s of eleSamples)
      if (s.ele != null) {
        hasEle = true;
        eMin = Math.min(eMin, s.ele);
        eMax = Math.max(eMax, s.ele);
      }
  }
  const sampledIdx = (eleSamples ?? []).filter((s) => s.ele != null).map((s) => s.i);
  const eleAt = (i) => {
    if (!hasEle) return null;
    let best = sampledIdx[0];
    for (const si of sampledIdx) if (Math.abs(si - i) < Math.abs(best - i)) best = si;
    return eleByIdx.get(best);
  };
  return { hasEle, eMin, eMax, eleAt };
}

// ---- coordinate rounding (fetch scripts) -------------------------------------

/** Round to ~11 m precision (4 decimals) — sub-pixel for an area overview
 * map, and it roughly halves the payload vs. full precision. */
export const rnd = (n) => Math.round(n * 1e4) / 1e4;

/** Round every coordinate in a LineString/MultiLineString geometry to 4
 * decimals and drop consecutive duplicate points created by the rounding.
 * Shape is preserved: a LineString stays a LineString; a MultiLineString
 * stays a MultiLineString (even when it has exactly one part, matching the
 * original per-script inline logic). */
export function roundLines(geometry) {
  const lines =
    geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates];
  const rounded = lines.map((line) =>
    line
      .map(([x, y]) => [rnd(x), rnd(y)])
      .filter((pt, i, a) => i === 0 || pt[0] !== a[i - 1][0] || pt[1] !== a[i - 1][1]),
  );
  return rounded.length === 1
    ? { type: "LineString", coordinates: rounded[0] }
    : { type: "MultiLineString", coordinates: rounded };
}

// ---- ArcGIS paged query loop --------------------------------------------------

/**
 * Drive an ArcGIS `resultOffset`/`exceededTransferLimit` paged query to
 * completion. `makeUrl(offset)` builds the request URL for a page; `onBatch
 * (features, json)` is called once per page with that page's `features`
 * array (`json.features ?? []`) and the raw parsed response, and is
 * responsible for processing/accumulating features AND printing that page's
 * progress line (so each caller's console output is unchanged). `errLabel` is
 * prefixed to the thrown error message on a non-OK response, matching each
 * caller's original `` `${label} HTTP ${status}` `` text exactly.
 */
export async function fetchPaged(makeUrl, onBatch, errLabel) {
  let offset = 0;
  for (;;) {
    const url = makeUrl(offset);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${errLabel} HTTP ${res.status}`);
    const json = await res.json();
    const feats = json.features ?? [];
    onBatch(feats, json);
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
  }
}

// ---- committed-file writers ---------------------------------------------------

/**
 * Build the standard area-overview FeatureCollection (metadata: source, area,
 * bbox, fetched date, counts reduced from `properties.access`), write it to
 * `outUrl`, and print the `Wrote N features (X KB) -> ...` line using
 * `printPath` as the printed (relative) path so each script's message text
 * stays identical to before.
 */
export async function writeAreaGeojson({ outUrl, printPath, source, area, bbox, features }) {
  const counts = features.reduce((acc, f) => {
    acc[f.properties.access] = (acc[f.properties.access] ?? 0) + 1;
    return acc;
  }, {});
  const fc = {
    type: "FeatureCollection",
    metadata: {
      source,
      area,
      bbox,
      fetched: new Date().toISOString().slice(0, 10),
      counts,
    },
    features,
  };
  const json = JSON.stringify(fc);
  await writeFile(outUrl, json);
  console.log(
    `Wrote ${features.length} features (${(json.length / 1024).toFixed(0)} KB) -> ${printPath} · counts ${JSON.stringify(counts)}`,
  );
  return { counts };
}

/**
 * Write a generated `lib/routes/<area>.generated.ts` module: `headerLines`
 * (an array of full comment-line strings, including the "AUTO-GENERATED by
 * ..." line, passed verbatim by the caller since it names that script) are
 * joined, followed by the `Route` import and the `export const <exportName>`
 * assignment.
 */
export async function writeRoutesModule({ outUrl, exportName, routes, headerLines }) {
  const ts = `${headerLines.join("\n")}
import type { Route } from "../types";

export const ${exportName}: Route[] = ${JSON.stringify(routes, null, 2)};
`;
  await writeFile(outUrl, ts);
}
