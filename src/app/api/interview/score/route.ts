import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import {
  CRITERIA,
  type DraftScores,
  type InterviewMode,
  SCORE_SCHEMA,
  sanitizeScores,
} from "@/lib/interview";

/**
 * POST /api/interview/score
 *
 * Body: { mode: InterviewMode, targetRole: string, question: string, answer: string }
 *
 * Scores a spoken answer against the five-criterion rubric. Judgement, so this
 * runs at medium reasoning effort.
 */

export const maxDuration = 60;

const SYSTEM = `You score one spoken answer from a mock interview against five criteria, each 1 to 5:

- technicalAccuracy: is what they said actually correct for the target role?
- structure: does the answer have a shape — situation/approach/result, or a clear line of reasoning — rather than rambling?
- specificity: concrete examples, numbers, tools, named decisions — versus vague generalities.
- relevance: does it actually answer THIS question, for THIS target role?
- depth: do they go past the surface — trade-offs, failure modes, what they'd do differently — or stop at the first layer?

The answer was transcribed by Wispr Flow, which strips filler words and false starts before you see it. Never score or mention fluency, speaking style, or how polished the phrasing is — judge only the content.

For each criterion return:
- "score": 1 to 5.
- "evidence": one sentence QUOTED VERBATIM from the answer that best supports the score. If the answer says nothing relevant to this criterion, quote the closest thing it does say and score it low.
- "fix": the single biggest thing that would raise this score, one line, addressed to them as "you".
- "strongerExample": a stronger answer to the SAME question, roughly the same length as theirs, that would score a 5 on this criterion specifically.

Score only what's actually in the answer. An answer that dodges the question scores low on relevance and depth regardless of how confident it sounds.`;

type Body = {
  mode?: InterviewMode;
  targetRole?: string;
  question?: string;
  answer?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const targetRole = (body.targetRole ?? "").trim();
  const question = (body.question ?? "").trim();
  const answer = (body.answer ?? "").trim();

  if (!question) {
    return NextResponse.json({ ok: false, error: "No question on the record to score against." }, { status: 400 });
  }
  if (!answer) {
    return NextResponse.json({ ok: false, error: "Say your answer into the dock first." }, { status: 400 });
  }

  const prompt = `TARGET ROLE: ${targetRole || "unstated"}

THE QUESTION ASKED:
"${question}"

THE CANDIDATE'S ANSWER, as transcribed:
"""
${answer}
"""`;

  try {
    const result = await getStructuredCompletion<DraftScores>({
      system: SYSTEM,
      prompt,
      schema: SCORE_SCHEMA,
      schemaName: "interview_score",
      reasoningEffort: "medium",
    });

    // Every criterion must be present even if the model drops one — a missing
    // field would otherwise read as a silent 0 rather than a clamped minimum.
    const complete = CRITERIA.every((c) => result.data[c.key]);
    if (!complete) {
      throw new Error("Score was missing a criterion.");
    }

    return NextResponse.json({ ok: true, scores: sanitizeScores(result.data) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
