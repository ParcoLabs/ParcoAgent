// server/actions/sourceQuotes.ts
/**
 * Source 3 Quotes (mock action)
 *
 * Given a request, choose up to 3 vendors that best match the request category.
 * Return the chosen vendorIds and short outreach notes. The caller (routes.ts)
 * is responsible for creating jobs, drafts, or sending comms.
 */

export type SourceQuotesInput = {
  requestId: string;
  request: {
    summary: string;
    category?: string;
    priority?: string;
    property?: string;
  };
  vendors: Array<{ id: string; name: string; trade?: string; category?: string }>;
};

export type SourceQuotesResult = {
  requestId: string;
  picks: Array<{ vendorId: string; note: string }>;
  rationale: string;
};

export async function sourceQuotes(input: SourceQuotesInput): Promise<SourceQuotesResult> {
  const { requestId, request, vendors } = input;

  const cat = (request.category || "").toLowerCase();

  // Score vendors by simple category match
  const scored = vendors
    .map((v) => {
      const t = `${v.trade ?? ""} ${v.category ?? ""}`.toLowerCase();
      const score =
        !cat ? 0 :
        t.includes(cat) ? 10 :
        (cat.startsWith("hvac") && /hvac|air|cool|heat/.test(t)) ? 7 :
        0;
      return { v, score };
    })
    .sort((a, b) => b.score - a.score);

  // Deduplicate and take top 3; if not enough, pad with remaining
  const unique = new Map<string, { id: string; name: string; trade?: string; category?: string }>();
  for (const row of scored) unique.set(row.v.id, row.v);
  const top3 = Array.from(unique.values()).slice(0, 3);

  const note = (vendorName: string) =>
    `Hi ${vendorName}, we have a new job: “${request.summary}” at ${request.property ?? "a property"}${
      request.priority ? ` (Priority: ${request.priority})` : ""
    }. Can you provide a quote and earliest availability?`;

  return {
    requestId,
    picks: top3.map((v) => ({ vendorId: v.id, note: note(v.name) })),
    rationale:
      top3.length > 0
        ? `Selected ${top3.length} vendor(s) based on category match “${request.category ?? "n/a"}”.`
        : `Selected default vendors (no category match).`,
  };
}
