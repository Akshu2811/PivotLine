# PivotLine

PivotLine is a voice-first career pivot coach, built as an 8-hour hackathon project.

## Product

The user speaks their career story out loud and pastes real job descriptions for
roles they're considering. From that, PivotLine:

- Maps the gap between the user's current skills and the target role as a **metro
  (subway) line**, where stations are skills/milestones and the user's progress is
  a train moving along the line.
- Builds a **weekly learning plan** to close the gaps.
- Suggests **portfolio projects** that demonstrate the missing skills.
- Runs **spoken mock interviews** (voice in, voice or text out) tailored to the
  target role.
- **Scores** mock interview answers against a rubric and gives structured feedback.
- Tracks job applications on a **departure board** (styled like an airport/train
  departure board) and learns over time which kinds of roles/applications get
  responses.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion for animation (metro line transitions, departure board flips, etc.)
- Zustand with the `persist` middleware for all client-side state (career story,
  skill map, learning plan, application tracker) — persisted to browser storage so
  the app works fully with no login and no backend database.
- OpenAI SDK (official `openai` npm package), called only from the server.
- Playwright + Chromium (dev dependency) for screenshot-based visual QA.

## Rules

1. **All AI calls go through server API routes.** Client components never import
   the OpenAI SDK or call OpenAI directly. Every AI call is a `fetch` to a route
   under `src/app/api/*`, which calls the shared helper in
   `src/lib/ai/structuredCompletion.ts`.
2. **The OpenAI API key is never exposed to the browser.** It lives only in
   `.env.local` as `OPENAI_API_KEY` (and `OPENAI_MODEL` for the default model) and
   is read only in server-side code (API routes, server components, the
   structured-completion helper). Never prefix it with `NEXT_PUBLIC_`, never log
   it, never echo it back in a response body.
3. **Every AI response is structured JSON**, validated against an explicit JSON
   schema via `getStructuredCompletion`, and the app must work entirely with
   **demo data and no login** — every screen should be fully explorable (with
   seeded/demo content) even if the user never sets an API key or signs in.
4. **Once at the end of each build phase**, start the dev server, use Playwright
   to take screenshots of every screen built in that phase at both laptop width
   (e.g. 1440x900) and phone width (e.g. 390x844), actually look at the
   screenshots, and fix anything that looks generic, cramped, misaligned, or
   broken — before telling the user the phase is done.
5. **Reasoning effort**: `getStructuredCompletion` takes a `reasoningEffort`
   param (`"minimal" | "low" | "medium" | "high"`), defaulting to `"low"`.
   - Use `"low"` (the default — fine to omit) for **extraction** tasks: parsing
     the user's career story into a profile, extracting skills from a pasted job
     description, parsing application records.
   - Pass `reasoningEffort: "medium"` explicitly for **planning and judgment**
     tasks: building/re-planning the weekly learning plan, generating insights
     (e.g. which roles get responses), and scoring mock interview answers
     against the rubric.
