import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import { DEPARTURE_OPS_SCHEMA, type DepartureOp, isApplicationStatus } from "@/lib/applications";

/**
 * POST /api/departures
 *
 * Body: { transcript: string }
 *
 * Reads a dictated update about job applications and returns one "op" per
 * company it mentions — a new application, a status change, or both at once
 * for different companies in the same breath. Pure extraction, so low effort.
 * Merging ops into the board itself happens in the client store, not here.
 */

export const maxDuration = 60;

const SYSTEM = `You read a dictated update about job applications for someone tracking a career pivot on a departure board.

They speak loosely and often cover several companies in one breath — a new application, a reply, an interview, an offer, a rejection, sometimes more than one of these for different companies in the same sentence.

Return one "op" per company mentioned, in the order first mentioned:
- "company": the employer's name, cleaned up (capitalisation, no trailing punctuation).
- "role": the job title if said, else null. Only set this when a NEW application is being described or the title is actually spoken — don't invent one for a bare status update like "Acme replied".
- "status": one of "Applied", "Replied", "Interview", "Offer", "Rejected" if the dictation says what happened, else null. A first mention of applying is "Applied" even if not said explicitly. A status update to a company already on the board ("they called me back", "I got an interview", "they passed on me") maps to the matching status.
- "tags": short lowercase tags describing the role, inferred from what's said — the kind of work (e.g. "rag", "mlops", "agents"), work arrangement ("remote", "onsite", "hybrid"), company size or stage ("startup", "enterprise"), and any years of experience the role calls for ("3+ years"). Only include tags you can actually support from the dictation; an empty array is fine.

If the same company is mentioned twice in one dictation, still return one op per mention — merging is handled elsewhere.`;

type Body = { transcript?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const transcript = (body.transcript ?? "").trim();
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Say which company, and what happened." },
      { status: 400 },
    );
  }

  try {
    const result = await getStructuredCompletion<{ ops: DepartureOp[] }>({
      system: SYSTEM,
      prompt: `DICTATED UPDATE:\n"""\n${transcript}\n"""`,
      schema: DEPARTURE_OPS_SCHEMA,
      schemaName: "departure_ops",
    });
    return NextResponse.json({ ok: true, ops: sanitize(result.data.ops) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/** Drops anything that doesn't name a company, and any status the model invented. */
function sanitize(ops: DepartureOp[]): DepartureOp[] {
  return (ops ?? [])
    .map((op) => ({
      company: (op.company ?? "").trim().slice(0, 80),
      role: op.role ? op.role.trim().slice(0, 100) : null,
      status: op.status && isApplicationStatus(op.status) ? op.status : null,
      tags: (op.tags ?? [])
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6),
    }))
    .filter((op) => op.company.length > 0);
}
