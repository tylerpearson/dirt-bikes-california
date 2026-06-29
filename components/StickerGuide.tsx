// The full California registration explainer, rendered inline on the home page
// under "Where to ride" rather than on a separate page. Plain language for new
// riders, every fact sourced from a government page (links at the bottom).

// The four ways a dirt bike can be registered in California, in the order a
// rider meets them. Colors mirror the access language used across the guide.
const STICKERS: {
  key: string;
  name: string;
  swatch: string;
  who: string;
  ride: string;
}[] = [
  {
    key: "green",
    name: "Green sticker",
    swatch: "var(--color-ok-fill)",
    who: "Dirt bikes that meet California emissions standards, plus every electric dirt bike.",
    ride: "Any public OHV area, all year.",
  },
  {
    key: "red",
    name: "Red sticker",
    swatch: "var(--color-diff-hard)",
    who: "Model year 2003–2021 bikes that do not meet emissions standards (a 3 or C in the 8th VIN digit).",
    ride: "Same public OHV areas as green, now all year too.",
  },
  {
    key: "tan",
    name: "Tan sticker",
    swatch: "var(--color-edge-strong)",
    who: "Model year 2022 and newer non-compliant competition bikes.",
    ride: "Closed-course events or private land only. Not public trails.",
  },
  {
    key: "plate",
    name: "Street-legal plate",
    swatch: "var(--color-plate-fill)",
    who: "Dual-sport bikes registered for the road, with a license plate.",
    ride: "Everything: pavement, connectors, and OHV routes alike.",
  },
];

// Plain-language source list. Every link is a primary government page: the DMV,
// State Parks' Off-Highway Motor Vehicle Recreation division (OHMVR), the Air
// Resources Board (CARB), the legislature's bill text, or the Forest Service.
const SOURCES: { label: string; href: string }[] = [
  {
    label: "California DMV — Register an Off-Highway Vehicle (OHV)",
    href: "https://www.dmv.ca.gov/portal/vehicle-registration/new-registration/register-an-off-highway-vehicle-ohv/",
  },
  {
    label: "California DMV — Registration of Noncomplying OHV (the tan sticker)",
    href: "https://www.dmv.ca.gov/portal/handbook/vehicle-industry-registration-procedures-manual-2/off-highway-vehicles/registration-of-noncomplying-ohv/",
  },
  {
    label: "California State Parks OHMVR — OHV Registration",
    href: "https://ohv.parks.ca.gov/?page_id=26886",
  },
  {
    label: "California State Parks OHMVR — Registration FAQ",
    href: "https://ohv.parks.ca.gov/?page_id=26294",
  },
  {
    label: "California Air Resources Board — OHRV Red Sticker Program",
    href: "https://ww2.arb.ca.gov/our-work/programs/highway-recreational-vehicles/ohrv-red-sticker-program",
  },
  {
    label: "California State Parks OHMVR — Bulletin 25-1, SB 586 electric motorcycles",
    href: "https://ohv.parks.ca.gov/pages/1234/files/OHV%20Information%20Bulletin%2025-1%20SB-586%20Electric%20Motorcycles%20ADA%20Final.pdf",
  },
  {
    label: "California Legislature — SB 586, off-highway electric motorcycles",
    href: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB586",
  },
  {
    label: "California State Parks OHMVR — Spark Arrester Law",
    href: "https://ohv.parks.ca.gov/?page_id=23039",
  },
  {
    label: "US Forest Service (Pacific Southwest Region) — Adventure Pass",
    href: "https://www.fs.usda.gov/r05/passes/adventure-pass",
  },
];

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-bistre/20"
      style={{ backgroundColor: color }}
    />
  );
}

// Sub-section heading inside the guide: uppercase display type under a hairline
// rule. An h3 because the guide's own title is the section h2.
function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b border-edge-strong/50 pb-3 font-display text-xl font-bold uppercase tracking-tight text-bistre">
      {children}
    </h3>
  );
}

export function StickerGuide() {
  return (
    <section
      id="stickers"
      className="scroll-mt-16 border-t-2 border-bistre/70 bg-paper-2"
    >
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="flex items-baseline justify-between gap-4 border-b border-edge-strong/50 pb-3">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bistre">
            Which sticker do you need?
          </h2>
          <span className="text-sm text-olive">California · 2026</span>
        </div>
        <p className="mt-4 text-base leading-relaxed text-pretty text-ink/90">
          One thing decides where you can legally ride: how your bike is
          registered. OHV means off-highway vehicle, and a public OHV area is
          public land, usually national forest or BLM desert, with routes marked
          open to off-road bikes. Your registration is a green sticker, red
          sticker, tan sticker, or a street-legal plate. Here is what each one
          actually means in 2026, including the new rule for electric bikes,
          written for people who are new to this and pulled straight from
          California&apos;s own pages.
        </p>

        {/* The whole thing in one glance. */}
        <div className="mt-8 overflow-hidden rounded-sm border border-edge-strong/50">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-manila text-bistre">
                <th className="px-3 py-2.5 font-semibold">Registration</th>
                <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                  Who it is for
                </th>
                <th className="px-3 py-2.5 font-semibold">Where you can ride</th>
              </tr>
            </thead>
            <tbody>
              {STICKERS.map((s, i) => (
                <tr
                  key={s.key}
                  className={`align-top ${i ? "border-t border-edge" : ""} ${
                    i % 2 ? "bg-paper/40" : "bg-paper/70"
                  }`}
                >
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2 font-semibold text-bistre">
                      <Swatch color={s.swatch} />
                      {s.name}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-olive sm:hidden">
                      {s.who}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-ink/90 sm:table-cell">
                    {s.who}
                  </td>
                  <td className="px-3 py-3 text-ink/90">{s.ride}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* The #1 beginner question: which one does MY bike need? Answered right
            under the table, before the per-sticker detail. */}
        <div className="mt-8 rounded-sm border border-edge bg-paper/70 p-5">
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-rust-ink">
            How do I tell which sticker a bike needs?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/90">
            Two things decide it: the bike&apos;s model year, and whether its
            engine meets California&apos;s emissions standards.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/90">
            <li>
              <span className="font-semibold text-bistre">
                Buying used? Check the sticker it already wears.
              </span>{" "}
              A green or red sticker means it is good for public trails. A tan
              sticker means closed-course only. That is the fastest check, no VIN
              decoding needed.
            </li>
            <li>
              <span className="font-semibold text-bistre">The VIN</span> is the
              17-character vehicle identification number stamped on the frame
              (usually at the steering head) and printed on the title. On an
              off-road bike, a 3 or a C in the 8th character means the engine does
              not meet California&apos;s emissions standards.
            </li>
            <li>
              <span className="font-semibold text-bistre">
                New or unregistered?
              </span>{" "}
              Emissions-compliant gets a green sticker. Non-compliant from 2003 to
              2021 gets red (no longer issued). Non-compliant from 2022 on gets
              tan, which is closed-course only.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-bistre">
            <span className="font-semibold text-rust-ink">Rule of thumb:</span>{" "}
            if you want to ride public trails in California, buy a bike that can
            get a green sticker or a street-legal plate.
          </p>
        </div>

        {/* Green */}
        <div className="mt-10">
          <SubHead>
            <span className="inline-flex items-center gap-2.5">
              <Swatch color="var(--color-ok-fill)" />
              Green sticker
            </span>
          </SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            The green sticker is the normal off-road registration. It is for
            dirt bikes that are{" "}
            <span className="font-semibold text-bistre">not street-legal</span>{" "}
            but do meet California&apos;s emissions standards. It is officially an
            OHV identification plate, not a license plate, and it lets you ride{" "}
            <span className="font-semibold text-bistre">
              any public land that is open to off-highway vehicles, all year long
            </span>
            .
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
            <li>
              <span className="font-semibold text-bistre">Cost:</span> $54 for
              two years (includes $2 to the Highway Patrol).
            </li>
            <li>
              <span className="font-semibold text-bistre">Expires:</span> June 30
              of the second year, then you renew and get a fresh sticker.
            </li>
            <li>
              <span className="font-semibold text-bistre">Electric bikes:</span>{" "}
              a Sur-Ron, Talaria, or similar e-moto gets a green sticker too. See
              the electric section below.
            </li>
          </ul>
        </div>

        {/* Red */}
        <div className="mt-10">
          <SubHead>
            <span className="inline-flex items-center gap-2.5">
              <Swatch color="var(--color-diff-hard)" />
              Red sticker
            </span>
          </SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            The red sticker covers older bikes that do not meet emissions
            standards: model years{" "}
            <span className="font-semibold text-bistre">2003 through 2021</span>{" "}
            with a 3 or a C in the eighth character of the VIN. For years these
            bikes were limited to a seasonal riding calendar that changed by
            location.
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/90">
            <span className="font-semibold text-rust-ink">
              That season limit is gone.
            </span>{" "}
            As of January 1, 2025, the state treats red and green stickers as
            equally valid year-round in every public OHV area. So in practice, a
            red-sticker bike now rides the same places and times a green-sticker
            bike does. The DMV stopped issuing new red stickers after model year
            2021, so this is a fixed pool of bikes that only shrinks over time.
          </p>
        </div>

        {/* Tan */}
        <div className="mt-10">
          <SubHead>
            <span className="inline-flex items-center gap-2.5">
              <Swatch color="var(--color-edge-strong)" />
              Tan sticker (competition only)
            </span>
          </SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            This is the one that trips up new buyers. Starting with model year{" "}
            <span className="font-semibold text-bistre">2022</span>, a dirt bike
            that does not meet emissions standards can no longer get a green or a
            red sticker. The DMV registers it with a{" "}
            <span className="font-semibold text-bistre">tan sticker</span> and
            labels it a competition vehicle.
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/90">
            A tan-sticker bike{" "}
            <span className="font-semibold text-rust-ink">
              cannot be ridden on public recreational trails
            </span>
            . On public land it is limited to sanctioned closed-course
            competition. Otherwise it is a private-property bike. This is why a
            brand-new closed-course race bike can be illegal on the same trail an
            older bike rides legally. If you are shopping for a newer bike and you
            want to ride public OHV land, you need either a model that earns a
            green sticker or a street-legal dual-sport.
          </p>
        </div>

        {/* Plate / dual-sport */}
        <div className="mt-10">
          <SubHead>
            <span className="inline-flex items-center gap-2.5">
              <Swatch color="var(--color-plate-fill)" />
              Street-legal plate (dual-sport)
            </span>
          </SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            A <span className="font-semibold text-bistre">dual-sport</span> or{" "}
            <span className="font-semibold text-bistre">plated</span> bike is
            registered for the road, the same as a car or a street motorcycle,
            and wears a real license plate. It has the equipment the road
            requires: lights, turn signals, mirror, horn, a DOT tire, and a
            street-legal exhaust.
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/90">
            A plated bike does not need an OHV sticker. It is the most flexible
            registration there is:{" "}
            <span className="font-semibold text-bistre">
              it can ride everything
            </span>
            , paved roads, the connectors between trails, and the dirt routes
            themselves. That is why every route in this guide is open to plated
            bikes, while green-sticker access is the part that varies road by
            road. One catch: the plate has to stay on and visible even off-road.
          </p>
        </div>

        {/* Electric */}
        <div className="mt-10">
          <SubHead>Electric bikes (the 2026 rule)</SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            Before 2026, electric off-road bikes sat in a legal grey area. Now
            they have to be registered like any other dirt bike. A 2025 law
            settled it: an off-highway electric motorcycle is an{" "}
            <span className="font-semibold text-bistre">OHV</span>, full stop.
            (SB 586, signed October 10, 2025, in effect January 1, 2026.)
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
            <li>
              It registers with a{" "}
              <span className="font-semibold text-bistre">green sticker</span>{" "}
              through the DMV. With no exhaust, an electric bike automatically
              meets the emissions side of the rules. After that it follows the
              same green-sticker rules as a gas dirt bike: a helmet, a visible
              sticker, and riding only in OHV-designated areas.
            </li>
            <li>
              The law is specific about what counts: an off-road electric
              motorcycle with handlebars, a straddle seat, two wheels, and{" "}
              <span className="font-semibold text-bistre">no pedals</span> from
              the factory. That is a Sur-Ron or Talaria style bike, not a pedal
              e-bike.
            </li>
            <li>
              You{" "}
              <span className="font-semibold text-rust-ink">
                cannot convert one to street-legal
              </span>
              . It stays an off-road bike for good, so it can only be ridden in
              OHV areas, never on a public street, sidewalk, or bike path. A
              plated dual-sport is the only way to ride pavement legally.
            </li>
          </ul>
        </div>

        {/* Spark arrester */}
        <div className="mt-10">
          <SubHead>Spark arrester (required on every gas bike)</SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            <span className="font-semibold text-rust-ink">Riding electric?</span>{" "}
            You can skip this section. An electric bike has no exhaust, so the
            spark arrester rule does not apply to it. For every gas bike, read on.
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/90">
            A <span className="font-semibold text-bistre">spark arrester</span> is
            a small screen built into the exhaust that catches the hot carbon
            specks an engine throws out, so your bike cannot spit a spark into dry
            brush and start a fire. It is a separate requirement from your
            sticker, and it applies to every gas bike, no matter how it is
            registered.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
            <li>
              <span className="font-semibold text-bistre">The rule:</span>{" "}
              California Vehicle Code section 38366 requires a working spark
              arrester on any forest, brush, or grass covered land. It has to be a
              model qualified and rated by the US Forest Service, and kept in
              working order.
            </li>
            <li>
              <span className="font-semibold text-bistre">All year:</span> there
              is no season for it. It is required every day, not just during fire
              season.
            </li>
            <li>
              <span className="font-semibold text-bistre">At the gate:</span>{" "}
              rangers check for it, and no spark arrester is a common reason to be
              turned away or cited.
            </li>
            <li>
              <span className="font-semibold text-bistre">Watch the exhaust:</span>{" "}
              most dirt bikes come with one from the factory, but a loud
              aftermarket pipe often deletes it. If you swapped exhausts, confirm
              yours still has an approved arrester.
            </li>
            <li>
              <span className="font-semibold text-bistre">Exception:</span>{" "}
              sanctioned closed-course races run under a fire permit are exempt,
              the same competition carve-out you see with the tan sticker.
            </li>
          </ul>
        </div>

        {/* Adventure Pass */}
        <div className="mt-10">
          <SubHead>Adventure Pass (parking, not riding)</SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            The <span className="font-semibold text-bistre">Adventure Pass</span>{" "}
            is a Forest Service parking fee, and people mix it up with their
            registration all the time even though the two have nothing to do with
            each other. It does not decide where you can ride. It just covers
            parking and day use at the four Southern California national forests:{" "}
            <span className="font-semibold text-bistre">
              Angeles, San Bernardino, Cleveland, and Los Padres
            </span>
            .
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink/90">
            <li>
              <span className="font-semibold text-bistre">Cost:</span> $5 per day
              or $30 for the year, with a second vehicle pass for $5 a year.
            </li>
            <li>
              <span className="font-semibold text-bistre">Where:</span> only those
              four forests, and only where it is posted at developed sites. A
              national interagency pass (America the Beautiful) works in its place.
            </li>
            <li>
              <span className="font-semibold text-bistre">Not the desert:</span>{" "}
              BLM land like Jawbone Canyon does not use the Adventure Pass. Check
              the specific area before you go.
            </li>
          </ul>
        </div>

        {/* Penalties */}
        <div className="mt-10">
          <SubHead>What happens if you get it wrong</SubHead>
          <p className="text-base leading-relaxed text-ink/90">
            Enforcement is real. Rangers and patrols check stickers at OHV areas,
            and getting it wrong means a citation, not a warning.
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink/90">
            <li>
              <span className="font-semibold text-bistre">
                No sticker, or an expired one.
              </span>{" "}
              Every off-road bike on public land has to display a current OHV
              identification (Vehicle Code section 38020). Riding without it is an
              infraction, and the citation plus court fees typically runs well
              past the cost of just registering the bike.
            </li>
            <li>
              <span className="font-semibold text-bistre">
                A tan, competition bike on a recreation trail.
              </span>{" "}
              That bike is not legal there at all. Expect to be cited and turned
              around at the gate, because the registration itself says
              competition-only.
            </li>
            <li>
              <span className="font-semibold text-bistre">No spark arrester.</span>{" "}
              California requires an approved spark arrester on the exhaust
              year-round. No spark arrester is a common reason to be denied entry
              at the gate and cited, on top of the fire risk it exists to prevent.
            </li>
            <li>
              <span className="font-semibold text-bistre">
                A plated bike with the plate removed off-road.
              </span>{" "}
              The plate has to stay displayed even in the dirt. Taking it off to
              save it is its own violation.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-olive">
            Exact fine amounts vary by county and by how many penalty assessments
            get tacked on, so take any single dollar figure you see online with a
            grain of salt. The takeaway that holds: registering correctly is far
            cheaper than a citation, and a tan, competition bike on the wrong land
            is not a problem you can pay your way out of and keep riding.
          </p>
        </div>

        {/* Sources */}
        <div className="mt-10">
          <SubHead>Sources</SubHead>
          <p className="mb-4 text-sm leading-relaxed text-ink/90">
            Everything here comes from California government pages, not other
            explainers. Rules change, so confirm the current version with the
            DMV or State Parks before you ride.
          </p>
          <ul className="space-y-2 text-sm">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-bistre underline decoration-rust/40 underline-offset-2 hover:decoration-rust hover:text-rust-ink"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
