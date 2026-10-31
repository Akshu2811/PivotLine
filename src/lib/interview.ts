/**
 * The interview booth: spoken mock interviews scored against a five-criterion
 * rubric. A question targets the target role and the stations still ahead on
 * the line; the difficulty is the model's call, informed by how the last few
 * answers scored. Scoring itself is judgement, so it runs at medium effort —
 * everything else here (the overall figure, which stations a weak run
 * flags) is arithmetic over what the model returned, done here in code.
 */

export type InterviewMode = "technical" | "deep-dive" | "behavioral";

export const INTERVIEW_MODES: { key: InterviewMode; label: string; blurb: string }[] = [
  {
    key: "technical",
    label: "Technical",
    blurb: "Questions aimed straight at the gap stations on your line.",
  },
  {
    key: "deep-dive",
    label: "Project Deep Dive",
    blurb: "Defend a project you've actually built, in detail.",
  },
  {
    key: "behavioral",
    label: "Behavior",
    blurb: "How you've worked, under the lens of the target role.",
  },
];

export const CRITERIA = [
  { key: "technicalAccuracy", label: "Technical accuracy" },
  { key: "structure", label: "Structure" },
  { key: "specificity", label: "Specificity" },
  { key: "relevance", label: "Relevance" },
  { key: "depth", label: "Depth" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export type CriterionResult = {
  score: number;
  /** A quoted sentence from the answer backing the score. */
  evidence: string;
  /** The single biggest thing to fix, in one line. */
  fix: string;
  /** A stronger answer of similar length, for comparison. */
  strongerExample: string;
};

export type InterviewScores = Record<CriterionKey, CriterionResult>;

export type InterviewAnswer = {
  id: number;
  at: string;
  mode: InterviewMode;
  questionText: string;
  difficulty: number;
  targetStationIds: string[];
  targetStationNames: string[];
  answerText: string;
  scores: InterviewScores;
  /** Mean of the five criteria, to one decimal — computed here, never by the model. */
  overall: number;
};

/* ── Schemas ──────────────────────────────────────────────────────────── */

export const QUESTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    question: { type: "string" },
    difficulty: { type: "integer" },
    targetStationNames: { type: "array", items: { type: "string" } },
  },
  required: ["question", "difficulty", "targetStationNames"],
  additionalProperties: false,
};

export type DraftQuestion = {
  question: string;
  difficulty: number;
  targetStationNames: string[];
};

function criterionSchema() {
  return {
    type: "object",
    properties: {
      score: { type: "integer" },
      evidence: { type: "string" },
      fix: { type: "string" },
      strongerExample: { type: "string" },
    },
    required: ["score", "evidence", "fix", "strongerExample"],
    additionalProperties: false,
  };
}

export const SCORE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: Object.fromEntries(CRITERIA.map((c) => [c.key, criterionSchema()])),
  required: CRITERIA.map((c) => c.key),
  additionalProperties: false,
};

export type DraftScores = Record<CriterionKey, CriterionResult>;

/* ── Arithmetic ───────────────────────────────────────────────────────── */

export function clampScore(score: number): number {
  return Math.min(5, Math.max(1, Math.round(score)));
}

export function overallOf(scores: InterviewScores): number {
  const total = CRITERIA.reduce((sum, c) => sum + scores[c.key].score, 0);
  return Math.round((total / CRITERIA.length) * 10) / 10;
}

export function sanitizeScores(draft: DraftScores): InterviewScores {
  const out = {} as InterviewScores;
  for (const c of CRITERIA) {
    const d = draft[c.key];
    out[c.key] = {
      score: clampScore(d?.score ?? 1),
      evidence: d?.evidence ?? "",
      fix: d?.fix ?? "",
      strongerExample: d?.strongerExample ?? "",
    };
  }
  return out;
}

/**
 * A station flags once it has shown up on two or more answers that scored 2
 * or lower overall — the mustard ring on the line is this, read back.
 */
export function lowScoreStationIds(answers: InterviewAnswer[]): string[] {
  const counts = new Map<string, number>();
  for (const answer of answers) {
    if (answer.overall > 2) continue;
    for (const id of answer.targetStationIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => id);
}

/* ── Demo answer ──────────────────────────────────────────────────────── */

function criterion(score: number, evidence: string, fix: string, strongerExample: string): CriterionResult {
  return { score, evidence, fix, strongerExample };
}

/** Seeded so the booth's scoring UI is explorable with no key and no answers yet. */
export const DEMO_ANSWER: InterviewAnswer = {
  id: 0,
  at: "09:14",
  mode: "technical",
  questionText: "Walk me through how you'd debug a RAG pipeline that keeps retrieving the wrong chunks.",
  difficulty: 2,
  targetStationIds: ["rag-pipelines"],
  targetStationNames: ["RAG pipelines"],
  answerText:
    "I'd check the chunking first, then look at the embeddings, and probably try a different similarity threshold if that didn't work.",
  scores: {
    technicalAccuracy: criterion(
      3,
      "I'd check the chunking first, then look at the embeddings",
      "Name what you'd actually look for in the chunks — size, overlap, whether a boundary split a key sentence — not just that you'd check them.",
      "I'd pull the actual chunks the retriever returned for a few failing queries and check two things: whether the relevant sentence got split across a chunk boundary, and whether the chunk size is burying it in unrelated text.",
    ),
    structure: criterion(
      2,
      "then look at the embeddings, and probably try a different similarity threshold",
      "Give the answer a shape — a short list of what you'd check, in the order you'd check it — instead of one run-on sentence.",
      "I'd work top-down: first the chunks themselves, then the embedding model, then the similarity threshold and top-k — checking each layer before moving to the next.",
    ),
    specificity: criterion(
      2,
      "try a different similarity threshold if that didn't work",
      "Name a real number or tool — a chunk size, a top-k value, a re-ranker — instead of \"a different threshold\".",
      "I'd log the top-5 retrieved chunks with their cosine scores for ten failing queries, and check whether the right chunk is in there at all but ranked low, or missing entirely.",
    ),
    relevance: criterion(
      4,
      "how you'd debug a RAG pipeline that keeps retrieving the wrong chunks",
      "Stay on debugging retrieval specifically — the answer drifts toward generic troubleshooting by the end.",
      "Since the question is specifically about wrong chunks, I'd isolate retrieval from generation entirely first, so I know the problem is really in the retrieval step and not the prompt.",
    ),
    depth: criterion(
      2,
      "probably try a different similarity threshold if that didn't work",
      "Say what you'd expect to see in each case, and what you'd do next if the first fix doesn't work — the answer stops at the first idea.",
      "If chunking looks fine, I'd suspect the embedding model doesn't capture domain vocabulary well, so I'd test a domain-tuned or larger embedding model before touching the threshold at all.",
    ),
  },
  overall: 2.6,
};
