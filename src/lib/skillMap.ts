/**
 * The skill-gap map: what a batch of real job descriptions demands, measured
 * against the user's profile, arranged as a metro line.
 *
 * Extraction and judgement are split deliberately. The AI names and normalises
 * skills and rules on gap/partial/have; the *counting* — how many postings
 * asked for a skill, and which phrase each one used — is done here in code
 * against the raw extractions. A tag that says "6 of 8 JDs" is therefore
 * arithmetic, not something a model asserted.
 */

export type SkillStatus = "gap" | "partial" | "have";
export type Importance = "required" | "nice-to-have";

/** One skill as a single posting phrased it. */
export type ExtractedSkill = {
  name: string;
  /** Short quote from the posting, shown in the station panel. */
  phrase: string;
};

/** Stage one output: one posting, parsed. */
export type JobExtraction = {
  title: string;
  company: string | null;
  required: ExtractedSkill[];
  niceToHave: ExtractedSkill[];
};

/** A posting that asked for a given skill, and how it asked. */
export type SkillMention = {
  jdIndex: number;
  jdTitle: string;
  company: string | null;
  phrase: string;
  importance: Importance;
};

export type Resource = {
  title: string;
  /** Course, docs, paper, project — kept short, printed as a mono tag. */
  kind: string;
  /** Why this one, in a line. */
  why: string;
};

export type MappedSkill = {
  id: string;
  name: string;
  /** Every variation seen across the postings that normalises to this skill. */
  aliases: string[];
  status: SkillStatus;
  /** Why it was called a gap/partial/have, in one line. */
  reason: string;
  whyItMatters: string;
  /** Ids of skills that should come first on the line. */
  dependsOn: string[];
  resources: Resource[];

  /* Computed here, never by the model. */
  mentions: SkillMention[];
  jdCount: number;
  importance: Importance;
  /** The user's rating from the boarding pass, if they named this skill. */
  userProficiency: number | null;
};

export type MappedJob = {
  index: number;
  title: string;
  company: string | null;
};

export type SkillMap = {
  /** Where the line starts — the user's current role. */
  originRole: string;
  targetRole: string;
  jobs: MappedJob[];
  /** Denominator for every demand tag on the map. */
  jdTotal: number;
  /** Main line first (gap/partial, dependency then demand), branch after. */
  skills: MappedSkill[];
  summary: string;
};

/** Stable id for a skill name, so dependsOn can be resolved across stages. */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const MAX_JDS = 8;
/** Below this the counts aren't worth much — the UI nudges toward 5. */
export const ADVISED_JDS = 5;

/* ── Schemas ──────────────────────────────────────────────────────────── */

/** Stage one: one posting at a time. Extraction, so it runs at low effort. */
export const JD_EXTRACTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    title: { type: "string" },
    company: { type: ["string", "null"] },
    required: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          phrase: { type: "string" },
        },
        required: ["name", "phrase"],
        additionalProperties: false,
      },
    },
    niceToHave: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          phrase: { type: "string" },
        },
        required: ["name", "phrase"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "company", "required", "niceToHave"],
  additionalProperties: false,
};

/** Stage two: normalise across postings and rule on each skill. Judgement. */
export const SKILL_COMPARISON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    skills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          aliases: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["gap", "partial", "have"] },
          reason: { type: "string" },
          whyItMatters: { type: "string" },
          dependsOn: { type: "array", items: { type: "string" } },
          resources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                kind: { type: "string" },
                why: { type: "string" },
              },
              required: ["title", "kind", "why"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "name",
          "aliases",
          "status",
          "reason",
          "whyItMatters",
          "dependsOn",
          "resources",
        ],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["skills", "summary"],
  additionalProperties: false,
};

/* ── Ordering ─────────────────────────────────────────────────────────── */

/**
 * Main-line order: foundations first, then demand. A dependency only outranks
 * demand when it is itself on the line — a prerequisite the user already has
 * shouldn't push anything down the map.
 */
export function orderMainLine(skills: MappedSkill[]): MappedSkill[] {
  const onLine = new Set(skills.map((s) => s.id));
  const byDemand = [...skills].sort(
    (a, b) => b.jdCount - a.jdCount || a.name.localeCompare(b.name),
  );

  const placed: MappedSkill[] = [];
  const done = new Set<string>();
  const remaining = [...byDemand];

  while (remaining.length) {
    const ready = remaining.findIndex((skill) =>
      skill.dependsOn.every((dep) => !onLine.has(dep) || done.has(dep)),
    );
    // A dependency cycle would deadlock the loop; take the most-demanded of
    // what's left and carry on rather than dropping stations off the map.
    const next = remaining.splice(ready === -1 ? 0 : ready, 1)[0];
    placed.push(next);
    done.add(next.id);
  }

  return placed;
}

export function mainLine(map: SkillMap): MappedSkill[] {
  return map.skills.filter((s) => s.status !== "have");
}

export function branchLine(map: SkillMap): MappedSkill[] {
  return map.skills.filter((s) => s.status === "have");
}

/* ── Demo map ─────────────────────────────────────────────────────────── */

const demoJobs: MappedJob[] = [
  { index: 0, title: "AI Engineer", company: "Northwind Labs" },
  { index: 1, title: "AI Engineer (Platform)", company: "Mesa Health" },
  { index: 2, title: "Machine Learning Engineer, Applications", company: "Corvid" },
  { index: 3, title: "AI Engineer", company: "Tessellate" },
  { index: 4, title: "LLM Engineer", company: "Bright Ferry" },
  { index: 5, title: "AI Engineer, Product", company: "Halden & Co" },
];

function mention(
  jdIndex: number,
  phrase: string,
  importance: Importance = "required",
): SkillMention {
  const job = demoJobs[jdIndex];
  return { jdIndex, jdTitle: job.title, company: job.company, phrase, importance };
}

/**
 * Seeded analysis so the station is fully explorable with no API key and no
 * postings pasted — the screen labels it as a sample survey.
 */
export const DEMO_SKILL_MAP: SkillMap = {
  originRole: "L2 Application Support",
  targetRole: "AI Engineer",
  jobs: demoJobs,
  jdTotal: 6,
  summary:
    "Six postings agree on the same spine: production Python, then retrieval, then evaluation. Your debugging and SQL already clear two of their asks outright — the line below is what's left.",
  skills: [
    {
      id: "production-python",
      name: "Production Python",
      aliases: ["Python", "Python 3", "strong Python"],
      status: "partial",
      reason: "You script confidently but have never shipped a Python service.",
      whyItMatters:
        "Every one of these teams ships Python services. Scripting gets you reading their code; packaging, typing and tests get you committing to it.",
      dependsOn: [],
      resources: [
        { title: "Real Python — testing & packaging track", kind: "Course", why: "Closes the gap between a script and a service." },
        { title: "FastAPI docs, first-party tutorial", kind: "Docs", why: "The framework four of these six postings name." },
        { title: "Port your alert bot to a typed FastAPI service", kind: "Project", why: "Turns work you've already done into the evidence they ask for." },
      ],
      mentions: [
        mention(0, "Strong Python; you will own services in production"),
        mention(1, "3+ years writing production Python"),
        mention(2, "Python, with tests — we review for it"),
        mention(3, "Fluent in Python and its async story"),
        mention(4, "Python (required)"),
        mention(5, "Production Python, FastAPI preferred"),
      ],
      jdCount: 6,
      importance: "required",
      userProficiency: 2,
    },
    {
      id: "rag-pipelines",
      name: "RAG pipelines",
      aliases: ["RAG", "retrieval augmented generation", "retrieval pipelines"],
      status: "gap",
      reason: "Never built one — you know what retrieval means and no more.",
      whyItMatters:
        "This is the job for most of these teams. Chunking, embedding, retrieval and the glue around them is what an AI engineer is hired to get right.",
      dependsOn: ["production-python"],
      resources: [
        { title: "Build a RAG app over your own runbooks", kind: "Project", why: "Your support background gives you a corpus nobody else has." },
        { title: "LlamaIndex starter tutorial", kind: "Docs", why: "Shortest path to a working pipeline end to end." },
        { title: "Pinecone — chunking strategies", kind: "Guide", why: "Chunking is where most first pipelines quietly fail." },
      ],
      mentions: [
        mention(0, "Design and ship RAG pipelines over internal corpora"),
        mention(1, "Retrieval-augmented generation against clinical documents"),
        mention(2, "Experience with retrieval systems"),
        mention(3, "RAG, including chunking and re-ranking"),
        mention(5, "You've built retrieval over messy real documents"),
      ],
      jdCount: 5,
      importance: "required",
      userProficiency: 1,
    },
    {
      id: "llm-apis",
      name: "LLM APIs",
      aliases: ["OpenAI API", "Anthropic API", "LLM providers"],
      status: "partial",
      reason: "A weekend project with the OpenAI API — real, but thin.",
      whyItMatters:
        "Knowing the API is table stakes; knowing its failure modes — rate limits, truncation, structured output, cost — is what they're checking for.",
      dependsOn: ["production-python"],
      resources: [
        { title: "OpenAI structured outputs guide", kind: "Docs", why: "Structured output is named in three of these postings." },
        { title: "Anthropic prompt engineering docs", kind: "Docs", why: "Two postings run on Claude." },
        { title: "Add retries, timeouts and cost logging to your weekend project", kind: "Project", why: "Converts a toy into something you can defend in an interview." },
      ],
      mentions: [
        mention(0, "Comfortable with OpenAI and Anthropic APIs"),
        mention(2, "LLM provider APIs and their limits"),
        mention(3, "Structured outputs, function calling"),
        mention(4, "Daily work against LLM APIs"),
        mention(5, "Knows what an LLM API costs at volume", "nice-to-have"),
      ],
      jdCount: 5,
      importance: "required",
      userProficiency: 2,
    },
    {
      id: "evaluation-testing",
      name: "Evaluation & testing",
      aliases: ["evals", "LLM evaluation", "offline evaluation"],
      status: "gap",
      reason: "Nothing in your story touches measuring model output quality.",
      whyItMatters:
        "It's the line between a demo and a product, and it's the question most of these interviews open with. Your incident discipline transfers here better than you'd think.",
      dependsOn: ["llm-apis"],
      resources: [
        { title: "Hamel Husain — Evaluating LLM applications", kind: "Guide", why: "The reference practitioners actually cite." },
        { title: "Write an eval set for your RAG app", kind: "Project", why: "Twenty labelled questions is enough to talk about convincingly." },
        { title: "Ragas documentation", kind: "Docs", why: "Gives you the vocabulary: faithfulness, recall, relevance." },
      ],
      mentions: [
        mention(0, "You measure quality — evals, not vibes"),
        mention(1, "Offline evaluation of model outputs"),
        mention(3, "Build evaluation harnesses"),
        mention(4, "Eval-driven development"),
      ],
      jdCount: 4,
      importance: "required",
      userProficiency: null,
    },
    {
      id: "vector-databases",
      name: "Vector databases",
      aliases: ["pgvector", "Pinecone", "vector store"],
      status: "gap",
      reason: "Not mentioned anywhere in your story.",
      whyItMatters:
        "A smaller ask than it looks: your SQL is strong, and pgvector is a Postgres extension. This is the cheapest station on the line for you.",
      dependsOn: ["rag-pipelines"],
      resources: [
        { title: "pgvector README", kind: "Docs", why: "Leans directly on the SQL you already have." },
        { title: "Swap your RAG app's store for pgvector", kind: "Project", why: "One afternoon, and it clears the station." },
        { title: "Pinecone vs pgvector, honestly", kind: "Guide", why: "Enough to answer the trade-off question." },
      ],
      mentions: [
        mention(0, "pgvector or similar"),
        mention(1, "Vector stores in production"),
        mention(3, "Pinecone, Weaviate or pgvector"),
        mention(5, "Vector search", "nice-to-have"),
      ],
      jdCount: 4,
      importance: "required",
      userProficiency: null,
    },
    {
      id: "docker-deployment",
      name: "Docker & deployment",
      aliases: ["containers", "Docker", "deployment"],
      status: "gap",
      reason: "You run deployed systems but haven't shipped one yourself.",
      whyItMatters:
        "You already debug containers other people built at 2am. Building one is a short step, and it's the step between your service and someone else running it.",
      dependsOn: ["production-python"],
      resources: [
        { title: "Docker's own Python guide", kind: "Docs", why: "Shortest route from script to image." },
        { title: "Deploy your RAG app to Fly.io", kind: "Project", why: "A URL you can put in an application." },
        { title: "Twelve-factor app", kind: "Guide", why: "Explains the conventions these teams assume you know." },
      ],
      mentions: [
        mention(1, "Containerised services"),
        mention(2, "Docker; Kubernetes a plus", "nice-to-have"),
        mention(4, "You can deploy what you build"),
      ],
      jdCount: 3,
      importance: "required",
      userProficiency: null,
    },
    {
      id: "production-debugging",
      name: "Production debugging",
      aliases: ["on-call", "incident response", "troubleshooting"],
      status: "have",
      reason: "Four years on L2 — this is the strongest thing on your pass.",
      whyItMatters:
        "Three postings ask for it outright, and most candidates pivoting in don't have it. Lead with this.",
      dependsOn: [],
      resources: [],
      mentions: [
        mention(1, "Comfortable debugging production incidents"),
        mention(2, "On-call rotation participation"),
        mention(4, "You've been paged and you liked it", "nice-to-have"),
      ],
      jdCount: 3,
      importance: "required",
      userProficiency: 5,
    },
    {
      id: "sql",
      name: "SQL",
      aliases: ["SQL", "Postgres", "relational databases"],
      status: "have",
      reason: "You write the complex joins on your team already.",
      whyItMatters:
        "Clears this station outright, and it's the reason pgvector is a short hop rather than a new subject.",
      dependsOn: [],
      resources: [],
      mentions: [
        mention(0, "SQL and a relational database"),
        mention(2, "Strong SQL"),
        mention(5, "Postgres", "nice-to-have"),
      ],
      jdCount: 3,
      importance: "required",
      userProficiency: 4,
    },
    {
      id: "stakeholder-communication",
      name: "Stakeholder communication",
      aliases: ["communication", "working with product"],
      status: "have",
      reason: "You run the comms bridge during a sev-1.",
      whyItMatters:
        "Named in two postings, and running an incident bridge is a harder version of what they're asking for.",
      dependsOn: [],
      resources: [],
      mentions: [
        mention(3, "Explain model behaviour to non-technical stakeholders"),
        mention(5, "Work directly with product", "nice-to-have"),
      ],
      jdCount: 2,
      importance: "nice-to-have",
      userProficiency: 4,
    },
  ],
};
