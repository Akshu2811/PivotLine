import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import type { ApplicationRecord, InsightReport, TagStat } from "@/lib/applications";
import { INSIGHTS_SCHEMA, MIN_APPLICATIONS_FOR_INSIGHTS } from "@/lib/applications";

/**
 * POST /api/departures/insights
 *
 * Body: { applications: ApplicationRecord[], tagStats: TagStat[] }
 *
 * The response-rate numbers are computed in code before this route is ever
 * called — this only writes what they mean: two insights, and one change to
 * the weekly plan they justify. Judgement, so medium effort.
 */

export const maxDuration = 60;

const SYSTEM = `You read the response-rate numbers behind someone's job-search departure board and write what they mean.

You are given, for each tag seen across their applications, how many carried that tag and how many of those got ANY response (a reply, interview, offer, or rejection — anything but silence). These counts are already computed; never recompute or contradict them, and don't cite a number you weren't given.

Return:
- "insights": exactly two short, specific lines about what the numbers show — which kinds of roles are answering and which aren't, addressed to them as "you". Each is one sentence. Ground every claim in the actual counts given; don't speculate beyond them.
- "planChange": one concrete change to their weekly learning plan that these numbers justify.
  - "announcement": one or two sentences, phrased as a station announcement, explaining the change and why the numbers justify it.
  - "taskText": a single short task to add to the plan — a few hours of concrete work, not a vague goal.
  - "hours": how many hours that task should take, between 0.5 and 4.

Make the task follow from the data: if a demanding tag is answering well, suggest leaning into it; if a common tag is going cold, suggest the course correction that would help it land better.`;

type Body = {
  applications?: ApplicationRecord[];
  tagStats?: TagStat[];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const applications = body.applications ?? [];
  const tagStats = body.tagStats ?? [];

  if (applications.length < MIN_APPLICATIONS_FOR_INSIGHTS) {
    return NextResponse.json(
      { ok: false, error: "Log at least five applications before reading the board." },
      { status: 400 },
    );
  }
  if (tagStats.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No tags on the board yet to read a pattern from." },
      { status: 400 },
    );
  }

  const byStatus = new Map<string, number>();
  for (const app of applications) byStatus.set(app.status, (byStatus.get(app.status) ?? 0) + 1);
  const statusLines = [...byStatus.entries()].map(([status, count]) => `  ${status}: ${count}`).join("\n");

  const tagLines = tagStats
    .map((t) => `  ${t.tag}: ${t.responded}/${t.total} responded (${Math.round(t.rate * 100)}%)`)
    .join("\n");

  const prompt = `${applications.length} applications on the board.\n\nBY STATUS:\n${statusLines}\n\nBY TAG (responded / total):\n${tagLines}`;

  try {
    const result = await getStructuredCompletion<InsightReport>({
      system: SYSTEM,
      prompt,
      schema: INSIGHTS_SCHEMA,
      schemaName: "departure_insights",
      reasoningEffort: "medium",
    });
    return NextResponse.json({ ok: true, report: sanitize(result.data) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

function sanitize(report: InsightReport): InsightReport {
  return {
    insights: (report.insights ?? []).slice(0, 2),
    planChange: {
      announcement: report.planChange?.announcement ?? "",
      taskText: report.planChange?.taskText ?? "",
      hours: Math.max(0.5, Math.min(4, report.planChange?.hours ?? 1)),
    },
  };
}
