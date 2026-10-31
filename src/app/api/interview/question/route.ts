import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import { type DraftQuestion, type InterviewMode, QUESTION_SCHEMA } from "@/lib/interview";

/**
 * POST /api/interview/question
 *
 * Body: { mode: InterviewMode, targetRole: string, stationNames: string[],
 *         history: { question: string, overall: number }[] }
 *
 * One mock-interview question, aimed at the target role and the stations
 * still ahead on the line. Generation, so the helper's default ("low")
 * reasoning effort is correct — the judgement is in scoring the answer.
 */

const MODE_BRIEF: Record<InterviewMode, string> = {
  technical: "A technical question that tests whether they can actually do the work a gap station names — not trivia, a question that only someone who'd done it could answer well.",
  "deep-dive": "A project deep-dive question. Ask them to defend a specific decision, trade-off, or failure in something they'd have actually built — assume they've done a related project and press on the details.",
  behavioral: "A behavioral question, read through the lens of the target role — how they've handled conflict, ambiguity, a mistake, or a cross-team situation that this role would actually put them in.",
};

const SYSTEM = `You run one round of a spoken mock interview for someone pivoting careers.

Ask exactly ONE question, short enough to say out loud in one breath.

- Ground it in the target role and in the gap stations you're given — name the real skill the question is probing, don't ask something generic that could apply to any job.
- "targetStationNames" lists which of the given station names this question actually probes — usually one, sometimes two. Copy the names EXACTLY as given. Never invent a station name.
- "difficulty" is 1 to 5. Start around 2-3 for a first question. If the history shows recent answers scoring well (overall 4+), raise it; if recent answers scored low (2 or under), hold or lower it rather than piling on. Never jump more than one level at a time.
- Never repeat a question already asked, and don't ask about a station the history shows was already answered well twice.`;

type Body = {
  mode?: InterviewMode;
  targetRole?: string;
  stationNames?: string[];
  history?: { question: string; overall: number }[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const mode = body.mode;
  const targetRole = (body.targetRole ?? "").trim();
  const stationNames = (body.stationNames ?? []).filter(Boolean);
  const history = body.history ?? [];

  if (!mode || !MODE_BRIEF[mode]) {
    return NextResponse.json({ ok: false, error: "Unknown interview mode." }, { status: 400 });
  }
  if (!targetRole) {
    return NextResponse.json(
      { ok: false, error: "No target role on file — set one on the Boarding Pass first." },
      { status: 400 },
    );
  }

  const stationsBlock =
    stationNames.length > 0
      ? stationNames.map((n) => `- ${n}`).join("\n")
      : "No gap stations on file — ask something a candidate for this role should still be able to answer.";

  const historyBlock =
    history.length > 0
      ? history
          .slice(-5)
          .map((h) => `- "${h.question}" — scored ${h.overall}/5`)
          .join("\n")
      : "No questions asked yet this session.";

  const prompt = `MODE: ${MODE_BRIEF[mode]}

TARGET ROLE: ${targetRole}

GAP STATIONS ON THE LINE:
${stationsBlock}

QUESTIONS ASKED SO FAR THIS SESSION:
${historyBlock}`;

  try {
    const result = await getStructuredCompletion<DraftQuestion>({
      system: SYSTEM,
      prompt,
      schema: QUESTION_SCHEMA,
      schemaName: "interview_question",
    });

    const known = new Set(stationNames);
    const data: DraftQuestion = {
      question: result.data.question,
      difficulty: Math.min(5, Math.max(1, Math.round(result.data.difficulty))),
      targetStationNames: (result.data.targetStationNames ?? []).filter((n) => known.has(n)),
    };

    return NextResponse.json({ ok: true, draft: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
