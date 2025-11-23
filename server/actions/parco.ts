// server/actions/parco.ts
/**
 * Property Listing Assistant (mock)
 * - Generate ad copy + suggested listing price for a selected property/unit.
 * - Price heuristic uses property NOI + occupancy + a simple location factor.
 * - Returns: { ad: string, priceSuggested: number, meta: {...} }
 */

type CreateListingInput = {
  propertyId?: string;
  propertyName?: string;
  address?: string | null;
  units?: number | null;
  occ?: number | null;        // occupancy %
  noiTtm?: number | null;     // trailing 12m NOI
  beds?: number | null;       // optional unit info (if you have it)
  baths?: number | null;
  sqft?: number | null;
  notes?: string | null;
};

export async function createListingAd(input: CreateListingInput) {
  const {
    propertyId,
    propertyName,
    address,
    units,
    occ,
    noiTtm,
    beds,
    baths,
    sqft,
    notes,
  } = input || {};

  // crude location factor (very mocky, but stable)
  const addr = (address || "").toLowerCase();
  const locFactor =
    addr.includes("new york") || addr.includes("brooklyn") || addr.includes("queens")
      ? 1.25
      : addr.includes("san francisco")
      ? 1.35
      : addr.includes("miami")
      ? 1.15
      : addr.includes("austin")
      ? 1.05
      : 1.0;

  const occPct = typeof occ === "number" && occ > 0 ? occ : 92;
  const noi = typeof noiTtm === "number" && noiTtm > 0 ? noiTtm : 250_000;
  const unitCount = typeof units === "number" && units > 0 ? units : 10;

  // Heuristic monthly rent suggestion (per unit):
  //   NOI/units/12, scaled by occupancy and location
  const base = (noi / Math.max(1, unitCount)) / 12;
  const occScale = 0.9 + Math.min(1.1, Math.max(0.8, occPct / 100)); // 0.8..1.1 range
  const rawSuggested = base * occScale * locFactor;

  // Adjust for bedrooms/baths/sqft if present
  const bedAdj = beds ? 1 + Math.min(0.4, 0.15 * Math.max(0, beds - 1)) : 1;
  const bathAdj = baths ? 1 + Math.min(0.25, 0.1 * Math.max(0, baths - 1)) : 1;
  const sqftAdj = sqft ? Math.min(1.5, Math.max(0.7, sqft / 700)) : 1;

  const priceSuggested = Math.round(rawSuggested * bedAdj * bathAdj * sqftAdj / 25) * 25;

  const headline = `${beds ?? 1}BR${baths ? `/${baths}BA` : ""} in ${propertyName || "Great Building"}`;
  const features = [
    "Sunlit rooms",
    "Modern finishes",
    "On-site laundry",
    "Responsive management",
    "Near transit & shops",
  ];
  const descParts = [
    `Welcome to ${propertyName || "our property"}${address ? ` at ${address}` : ""}.`,
    `This ${beds ?? 1} bedroom${beds && beds > 1 ? "s" : ""}${baths ? ` / ${baths} bath` : ""}${sqft ? ` • ${sqft} sqft` : ""} home features ${features.slice(0,3).join(", ").toLowerCase()}.`,
    `Professionally managed by Parco — quick maintenance, easy payments, and a great resident experience.`,
    notes ? `Notes: ${notes}` : "",
  ].filter(Boolean);

  const ad =
`**${headline}** — $${priceSuggested.toLocaleString()}/mo

${descParts.join("\n\n")}

**Highlights**
- ${features.join("\n- ")}

**Next steps**
- Reply here to schedule a tour
- Apply online with Parco`;

  return {
    ok: true as const,
    result: {
      propertyId: propertyId || null,
      propertyName: propertyName || null,
      address: address || null,
      ad,
      priceSuggested,
      meta: {
        units: unitCount,
        occ: occPct,
        noiTtm: noi,
        beds: beds ?? null,
        baths: baths ?? null,
        sqft: sqft ?? null,
        locFactor,
      },
      createdAt: new Date().toISOString(),
    },
  };
}

type PublishInput = {
  propertyId?: string;
  ad?: string;
  price?: number;
  sites?: string[]; // e.g. ["streeteasy","rent.com","apartments.com"]
};

export async function publishListing(input: PublishInput) {
  const sites = Array.isArray(input?.sites) && input!.sites!.length
    ? input!.sites!
    : ["streeteasy", "rent.com"];

  // In the MVP we don't call external APIs. We "pretend publish" and audit upstream.
  return {
    ok: true as const,
    postedTo: sites.map((s) => ({
      site: s,
      status: "queued",
      ref: `mock-${s}-${Math.random().toString(36).slice(2, 8)}`,
    })),
    at: new Date().toISOString(),
  };
}
