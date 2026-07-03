import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { AREAS } from "@/lib/areas";

const EM_DASH = "—"; // U+2014; en dash – (U+2013) in ranges is allowed
/** Jammed compounds banned by AGENTS.md; extend as new ones are spotted. */
const BANNED_COMPOUNDS: { re: RegExp; hint: string }[] = [
  { re: /highway-legal/i, hint: 'write "street-legal"' },
  { re: /open-to-all/i, hint: 'write "open to all vehicles"' },
  { re: /street-legal-only/i, hint: 'write "street-legal vehicles only"' },
];

const NON_PROSE_KEYS = new Set(["mvumGeojson", "url", "closuresUrl", "href"]);

/** Recursively collect every string value in an object, with its dotted/indexed path. */
function collectStrings(
  value: unknown,
  keyPath: string,
  out: { path: string; value: string }[],
  key?: string,
): void {
  if (key !== undefined && NON_PROSE_KEYS.has(key)) return;
  if (typeof value === "string") {
    out.push({ path: keyPath, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${keyPath}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, keyPath ? `${keyPath}.${k}` : k, out, k);
    }
  }
}

function checkProse(strings: { path: string; value: string }[]): void {
  for (const { path: p, value } of strings) {
    const excerpt = value.length > 80 ? `${value.slice(0, 80)}...` : value;
    expect(
      value.includes(EM_DASH),
      `${p}: em dash found ("${excerpt}") — use commas, periods, colons, or parentheses instead`,
    ).toBe(false);
    for (const { re, hint } of BANNED_COMPOUNDS) {
      expect(
        re.test(value),
        `${p}: banned compound /${re.source}/ found ("${excerpt}") — ${hint}`,
      ).toBe(false);
    }
  }
}

/** Recursively find files under dir matching a filter, no new deps. */
function findFiles(dir: string, filter: (name: string) => boolean): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...findFiles(full, filter));
    } else if (filter(entry)) {
      results.push(full);
    }
  }
  return results;
}

/** Strip block comments (incl. JSX {/* … *\/} bodies) and line comments, keeping URLs intact. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

describe("prose style: no em dashes, no jammed compounds", () => {
  it("registry prose (lib/areas.ts via AREAS) has no em dashes or banned compounds", () => {
    const strings: { path: string; value: string }[] = [];
    for (const area of AREAS as unknown[]) {
      const areaId =
        typeof area === "object" && area && "id" in area
          ? String((area as { id: unknown }).id)
          : "unknown";
      collectStrings(area, areaId, strings);
    }
    checkProse(strings);
  });

  it("hand-written component/page copy has no em dashes or banned compounds", () => {
    const root = process.cwd();
    const files = [
      ...findFiles(path.join(root, "components"), (n) => n.endsWith(".tsx")),
      ...findFiles(path.join(root, "app"), (n) => n.endsWith(".tsx")),
    ];
    expect(files.length, "expected to find .tsx files to scan").toBeGreaterThan(0);

    for (const file of files) {
      const raw = readFileSync(file, "utf8");
      const stripped = stripComments(raw);
      const rel = path.relative(root, file);

      const emDashIdx = stripped.indexOf(EM_DASH);
      if (emDashIdx !== -1) {
        const idxInRaw = raw.indexOf(EM_DASH, 0);
        const line = raw.slice(0, idxInRaw === -1 ? emDashIdx : idxInRaw).split("\n").length;
        expect(
          false,
          `${rel}:${line}: em dash found — use commas, periods, colons, or parentheses instead`,
        ).toBe(true);
      }

      for (const { re, hint } of BANNED_COMPOUNDS) {
        const m = re.exec(stripped);
        if (m) {
          const idxInRaw = raw.search(re);
          const line = raw.slice(0, idxInRaw === -1 ? m.index : idxInRaw).split("\n").length;
          expect(
            false,
            `${rel}:${line}: banned compound /${re.source}/ found — ${hint}`,
          ).toBe(true);
        }
      }
    }
  });

  it("script prose templates have no banned compounds", () => {
    const scripts = [
      "scripts/build-area-routes.mjs",
      "scripts/build-blm-routes.mjs",
      "scripts/build-angeles-routes.mjs",
    ];
    for (const rel of scripts) {
      const full = path.join(process.cwd(), rel);
      let src: string;
      try {
        src = readFileSync(full, "utf8");
      } catch {
        continue; // script may not exist in every checkout variant
      }
      for (const { re, hint } of BANNED_COMPOUNDS) {
        const m = re.exec(src);
        expect(
          m,
          m ? `${rel}: banned compound /${re.source}/ found near "${src.slice(Math.max(0, m.index - 20), m.index + 40)}" — ${hint}` : "",
        ).toBeNull();
      }
    }
  });
});
