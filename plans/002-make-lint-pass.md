# Plan 002: Make `npm run lint` exit clean (fix 6 errors, 2 warnings)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c7261bf..HEAD -- components/AreaNav.tsx components/AreaMap.tsx`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (two fixes change component behavior slightly; both have exact target patterns below)
- **Depends on**: none (plan 003, CI, depends on this)
- **Category**: dx
- **Planned at**: commit `c7261bf`, 2026-07-01

## Why this matters

`npm run lint` is one of only two check commands this repo has (the other is `tsc --noEmit`), and it currently exits 1 with 6 errors. A permanently red check is worse than no check: new lint errors are invisible, and CI (plan 003) can't gate on it. All 6 errors and both warnings are in two client components, `components/AreaNav.tsx` and `components/AreaMap.tsx`.

## Current state

This is a Next.js 16 App Router app (React 19, TypeScript, eslint 9 with `eslint-config-next` 16.2.9, flat config in `eslint.config.mjs`). `@types/leaflet` is already a devDependency, so Leaflet `any` casts can be replaced with real types. Note the repo warning in `AGENTS.md`: this Next.js version may differ from your training data; read `node_modules/next/dist/docs/` if you need framework specifics (you shouldn't for this plan).

Exact current lint output (`npx eslint .`):

```
components/AreaMap.tsx
   79:5   error    Calling setState synchronously within an effect ... (react-hooks/set-state-in-effect)
  127:44  error    Unexpected any (@typescript-eslint/no-explicit-any)
  140:9   warning  Unused eslint-disable directive
  147:34  error    Unexpected any (@typescript-eslint/no-explicit-any)
  150:36  error    Unexpected any (@typescript-eslint/no-explicit-any)
  168:6   warning  React Hook useEffect has missing dependencies: 'attribution', 'labels.green', and 'labels.plate' (react-hooks/exhaustive-deps)

components/AreaNav.tsx
  119:19  error  Calling setState synchronously within an effect (react-hooks/set-state-in-effect)
  125:19  error  Calling setState synchronously within an effect (react-hooks/set-state-in-effect)
```

### AreaMap.tsx relevant excerpts

Line 74–79 (the `setStatus` error — it's called synchronously in the effect body, before the async IIFE):

```tsx
  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    setStatus("loading");
```

The repo already has the lint-clean version of this exact pattern in `components/OverviewMap.tsx:65-79`, where `setStatus("loading")` is the first statement INSIDE the `(async () => { ... })()` IIFE. Match that.

Lines 120–152 (the `any` casts; `L` here is the dynamically imported Leaflet module):

```tsx
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plateLayer = L.geoJSON(plate as any, { style: style as any, interactive: false }).addTo(map);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const greenLayer = L.geoJSON(green as any, { style: style as any, interactive: false }).addTo(map);

        // Invisible fat overlay: ...
        const onEach = (f: Feature, layer: any) => {
          ...
          layer.on("mouseover", () => layer.setStyle({ opacity: 0.25 }));
          layer.on("mouseout", () => layer.setStyle({ opacity: 0 }));
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hitStyle = (f?: Feature) => ({
          color: COLOR[f!.properties.access],
          weight: 16,
          opacity: 0,
          lineCap: "round" as const,
        });
        L.geoJSON(fc.features as any, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: hitStyle as any,
          onEachFeature: onEach as any,
          bubblingMouseEvents: false,
        }).addTo(map);
```

Line 168 closes the effect: `}, [inView, src]);` — missing `attribution`, `labels.green`, `labels.plate`.

The component's props (lines 37–47) give `labels` a default object literal:

```tsx
export function AreaMap({
  src,
  labels = { green: "Green-sticker OHV allowed", plate: "Street-legal plate only" },
  attribution = "&copy; OpenStreetMap contributors · Forest Service travel maps",
}: { ... })
```

IMPORTANT: because `labels` defaults to a fresh object literal every render, you must add the primitive members `labels.green` and `labels.plate` to the dependency array, NOT the `labels` object itself (the object identity changes every render and would tear down and rebuild the Leaflet map in a loop).

### AreaNav.tsx relevant excerpts

Lines 113–125:

```tsx
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // usePathname() resolves to null on the first client render of a statically
  // exported page, so deriving the button label from it directly mismatches the
  // prerendered HTML. Gate the dynamic label until after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = AREAS.find((a) => pathname === `/${a.id}`);
  const triggerLabel = mounted && current ? current.name : "Riding areas";

  // Close the menu on navigation.
  useEffect(() => setOpen(false), [pathname]);
```

`open` is read in three more places in this file: the Escape/scroll-lock effect at lines 128–137 (`if (!open) return;` — keep it, it's lint-clean), the trigger button (`onClick={() => setOpen((v) => !v)}`, `aria-expanded={open}`, and the className ternaries around lines 156–163), and the `{open && (...)}` panel at line 184 whose scrim button calls `setOpen(false)` at line 189.

## Commands you will need

| Purpose   | Command            | Expected on success        |
|-----------|--------------------|----------------------------|
| Install   | `npm install`      | exit 0                     |
| Lint      | `npm run lint`     | exit 0, no errors/warnings |
| Typecheck | `npx tsc --noEmit` | exit 0                     |
| Build     | `npm run build`    | exit 0, writes `./out`     |

## Scope

**In scope** (the only files you should modify):
- `components/AreaNav.tsx`
- `components/AreaMap.tsx`

**Out of scope** (do NOT touch, even though they look similar):
- `components/OverviewMap.tsx` and `components/RouteMap.tsx` — they lint clean today; they also use `any` for the map variable but behind eslint-disable comments that are currently accepted. Leave them.
- `eslint.config.mjs` — do NOT silence rules to make this pass.
- Any visual/styling change.

## Git workflow

- Branch: `lint-clean` (short kebab-case, merged via PR)
- Commit message style: imperative sentence, e.g. `Fix the six eslint errors in AreaNav and AreaMap`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: AreaMap — move `setStatus("loading")` into the async IIFE

In `components/AreaMap.tsx`, delete the `setStatus("loading");` statement from the effect body (line 79) and make it the first statement inside the `(async () => {` block that follows (before the `try {`... actually the `try` is the first thing in the IIFE — put `setStatus("loading");` inside the `try`, as its first statement, or immediately before the `try`; either is fine and matches `OverviewMap.tsx:71-73`).

**Verify**: `npx eslint components/AreaMap.tsx` → the `79:5 set-state-in-effect` error is gone.

### Step 2: AreaMap — replace the `any` casts with real Leaflet/GeoJSON types

At the top of `components/AreaMap.tsx` add type-only imports (type-only imports are erased at compile time, so this does NOT defeat the lazy `import("leaflet")`):

```tsx
import type { GeoJSON as LeafletGeoJSON, Layer, Map as LeafletMap, Path, PathOptions } from "leaflet";
import type { Feature as GeoJsonFeature, FeatureCollection } from "geojson";
```

(`geojson` types ship with `@types/leaflet`. If the `geojson` import fails to resolve, use `GeoJSON.Feature` / `GeoJSON.FeatureCollection` from the ambient `GeoJSON` namespace that `@types/leaflet` brings in, and note it in your report.)

Then:

1. `let map: any` (line 78) → `let map: LeafletMap | undefined;` and delete the eslint-disable above it. Keep the cleanup `if (map) map.remove();` as is.
2. The style functions: Leaflet's `style` option has signature `(feature?: GeoJSON.Feature) => PathOptions`. The local `Feature` type is structurally a GeoJSON feature, so change `style` and `hitStyle` to accept the Leaflet-expected type and cast the feature back to the local `Feature` internally:

```tsx
        const style = (f?: GeoJsonFeature): PathOptions => {
          const p = (f as unknown as Feature).properties;
          return { ... unchanged body ... };
        };
```

   Same shape for `hitStyle`. Then `style: style` and `style: hitStyle` need no cast.
3. `L.geoJSON(plate as any, ...)` → `L.geoJSON(plate as unknown as FeatureCollection["features"], ...)` will not typecheck directly (geoJSON accepts `GeoJsonObject`); the cleanest accepted form is `L.geoJSON(plate as unknown as GeoJsonFeature[], ...)`. Use that for `plate`, `green`, and `fc.features`.
4. `onEach = (f: Feature, layer: any)` → `(f: GeoJsonFeature, layer: Layer)`, read properties via `const p = (f as unknown as Feature).properties;`, and for the two `setStyle` calls cast once: `const path = layer as Path;` then `path.setStyle(...)`. Leaflet's `onEachFeature` expects `(feature: GeoJSON.Feature, layer: Layer)`, so `onEachFeature: onEach` then needs no cast.
5. Remove all now-unused `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments in this file, including the stale one at line 140.

The exact intermediate casts may need minor adjustment against the installed `@types/leaflet`; the hard requirements are: no `any` anywhere in the file, no eslint-disable comments for `no-explicit-any`, no change to runtime behavior, and `tsc --noEmit` clean. `as unknown as X` double-casts are acceptable; `any` is not.

**Verify**: `npx eslint components/AreaMap.tsx` → no `no-explicit-any` errors, no unused-directive warnings. `npx tsc --noEmit` → exit 0.

### Step 3: AreaMap — complete the effect dependency array

Change line 168 from `}, [inView, src]);` to:

```tsx
  }, [inView, src, attribution, labels.green, labels.plate]);
```

(Primitives only — see the IMPORTANT note in Current state for why not `labels`.)

**Verify**: `npx eslint components/AreaMap.tsx` → zero problems.

### Step 4: AreaNav — replace the mounted-gate effect with `useSyncExternalStore`

In `components/AreaNav.tsx`, replace:

```tsx
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
```

with the React-blessed hydration signal (no effect, no setState):

```tsx
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
```

Add `useSyncExternalStore` to the existing `react` import and remove `useEffect` from it ONLY if no other effect remains (the Escape/scroll-lock effect still uses it, so keep `useEffect` imported). Keep the explanatory comment about `usePathname()` returning null on first client render; it documents why the gate exists.

**Verify**: `npx eslint components/AreaNav.tsx` → the `119:19` error is gone.

### Step 5: AreaNav — derive "menu closed on navigation" instead of the setState effect

Replace the boolean `open` state with "the pathname the menu was opened on", and derive `open` during render. Delete the effect at line 125. Concretely:

```tsx
  // The pathname the menu was opened on; deriving `open` from it means
  // navigation (pathname change) closes the menu without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(open) : v;
    setOpenedAt(next ? pathname : null);
  };
```

Keep the name `setOpen` so the six existing call sites (trigger `onClick`, Escape handler, scrim button) and every `open` read (aria-expanded, classNames, `{open && ...}`, the scroll-lock effect's `[open]` dep) work unchanged. Then delete:

```tsx
  // Close the menu on navigation.
  useEffect(() => setOpen(false), [pathname]);
```

Behavior note: this preserves both current behaviors — clicking a menu link navigates (pathname changes, `open` derives to false) and back/forward navigation while the menu is open also closes it.

**Verify**: `npx eslint components/AreaNav.tsx` → zero problems.

### Step 6: Full gate

**Verify**, in order:
1. `npm run lint` → exit 0, zero errors, zero warnings.
2. `npx tsc --noEmit` → exit 0.
3. `npm run build` → exit 0 (static export to `./out`).

### Step 7: Manual smoke check (behavior parity)

Run `npm run dev`, open http://localhost:3000, and confirm:
- The nav trigger reads "Riding areas" on the homepage; open the menu, click an area (e.g. Big Bear); the menu closes, the page navigates, and the trigger now reads "Big Bear".
- On an area page (e.g. `/big-bear`), scroll to "Where can I ride?" — the Leaflet overview map loads, colored lines render, hovering a line shows a tooltip, and the legend card shows green/plate/seasonal rows.
- Escape closes the menu; the page behind the open menu does not scroll.

If you cannot run a browser, state that explicitly in your report instead of claiming this step passed.

## Test plan

No unit tests in this plan (the repo has no test infra until plan 004). The verification gates are lint, typecheck, build, and the manual smoke check in step 7.

## Done criteria

- [ ] `npm run lint` exits 0 with zero errors and zero warnings
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -n "any" components/AreaMap.tsx` shows no `: any` or `as any` (word `any` inside comments/strings is fine)
- [ ] `git status` shows only `components/AreaNav.tsx` and `components/AreaMap.tsx` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The lint output at HEAD differs from the 8 problems listed in Current state (rules may have changed via a dependency bump; re-plan rather than chase).
- Step 2's typed rewrite fights `@types/leaflet` for more than two iterations — report the exact type errors instead of reintroducing `any` or adding eslint-disables.
- Step 5 requires touching any file other than `AreaNav.tsx` (e.g. you're tempted to change how `usePathname` behaves) — that's out of scope.
- The step 7 smoke check shows a behavior regression (menu not closing, map not loading).

## Maintenance notes

- `OverviewMap.tsx` and `RouteMap.tsx` still use `let map: any` behind eslint-disable comments. Once this plan's typed pattern is proven in `AreaMap.tsx`, the same treatment there is a mechanical follow-up (deferred: they currently lint clean, so there's no gate forcing it).
- The `set-state-in-effect` rule comes from `eslint-config-next` 16 / react-hooks v6; any new client component with a mounted-gate should copy the `useSyncExternalStore` pattern from `AreaNav.tsx`.
- Reviewer check: the AreaNav diff is behavior-sensitive — scrutinize the `openedAt` derivation, especially the functional-updater branch of `setOpen`.
