import { NextResponse } from "next/server";
import { getStructuredCompletion } from "@/lib/ai/structuredCompletion";
import { type CareerProfile, PROFILE_SCHEMA } from "@/lib/profile";

/**
 * POST /api/profile
 *
 * Turns dictated career story (messy, full of filler and self-correction) and/or
 * pasted résumé text into a structured CareerProfile.
 *
 * Body: { transcript?: string, resumeText?: string, existingProfile?: CareerProfile }
 *
 * When `existingProfile` is present this is a *merge*, not a replacement: the new
 * speech adds detail and applies corrections to the pass the user already holds.
 *
 * Extraction task, so the helper's default reasoning effort ("low") is correct.
 */

const SYSTEM = `You extract a structured career profile from spoken career stories and résumé text for PivotLine, a career-pivot coach.

The transcript is raw dictation. Expect filler words ("um", "like", "you know"), false starts, repetition, sentences that trail off, topics jumped between and returned to, and the speaker correcting themselves mid-thought ("I've been there three years — no, four"). Read the whole thing before deciding anything, and always honour the speaker's LAST statement about a fact over an earlier one.

Rules:
- Never invent. Every field must be supported by something the speaker or the résumé actually said. If a fact was not stated, use null (or an empty array).
- "skills": the skills relevant to this pivot, MOST RELEVANT TO THE TARGET ROLE FIRST. The first five are printed on the ticket stub, so order matters. Include both strengths and admitted weaknesses — a weak skill the user named is important signal. Do not split one skill into two entries at different levels (e.g. "Python scripting" and "Python services"): one entry per skill, rated at what they can actually do.
- Each skill "name" is a NOUN PHRASE OF AT MOST THREE WORDS, 24 characters maximum, printed on a ticket — "SQL", "Python", "RAG pipelines", "Production debugging". No slashes, no parentheses, no qualifiers like "familiarity with", "basic" or "advanced" (that is what proficiency is for).
- "proficiency" is 1-5: 1 = aware of it only, 2 = has dabbled / scripting level, 3 = works independently on normal tasks, 4 = strong, does this professionally, 5 = others come to them for it. Base it on what they claim, discounting for hedges like "a bit" or "only scripting".
- "evidence" is a short phrase from the speaker in their own words — quote the telling fragment where you can. One sentence maximum. Never write "inferred" or "not stated"; if there is no evidence, the skill does not belong in the list.
- "yearsExperience" is total professional experience, a number.
- "seniority" is one of Junior, Mid, Senior, Staff, Lead, Principal — or a title-based equivalent if they stated one. Infer from years and scope of what they described.
- "notableProjects": things they actually built or ran, with the outcome if they gave one. "demonstrates" holds short skill tags (one to three words each, matching the skill names above where they overlap) — never sentences or metrics.
- "constraints": workMode (e.g. "Remote only"), hoursPerWeek they can give to learning as a number, timeline (e.g. "interview-ready by March"), and anything else binding in "other".
- TARGET ROLE: if the speaker never says what role they are aiming for, DO NOT GUESS and DO NOT infer one from their skills. Set "targetRole" to null and put one short, specific, friendly question in "followUpQuestion" (e.g. "Which role are you aiming for — AI engineer, ML engineer, or something else?").
- Set "followUpQuestion" to null when the target role is known and nothing essential is missing. Never ask about something they already told you.`;

const MERGE_NOTE = `This speaker already has a profile, shown below as EXISTING PROFILE. Produce the UPDATED COMPLETE profile.

- Start from the existing profile and fold the new input into it. Never drop a fact that is still true just because the new input didn't repeat it.
- New input that ADDS detail: add it. Append new skills and projects, and append to "other" constraints.
- New input that CORRECTS something ("actually it's four years", "I do know Docker"): the correction wins — overwrite the old value, and update that skill's proficiency and evidence.
- A skill already present must not be duplicated. Update the existing entry instead, keeping whichever evidence is more concrete.
- Re-order "skills" so the ones most relevant to the target role are still first.
- If the existing profile already has a target role, keep it unless the speaker explicitly changes it, and return followUpQuestion: null.`;

type Body = {
  transcript?: string;
  resumeText?: string;
  existingProfile?: CareerProfile | null;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 });
  }

  const transcript = (body.transcript ?? "").trim();
  const resumeText = (body.resumeText ?? "").trim();
  const existing = body.existingProfile ?? null;

  if (!transcript && !resumeText) {
    return NextResponse.json(
      { ok: false, error: "Say something or paste résumé text first." },
      { status: 400 },
    );
  }

  const parts: string[] = [];
  if (existing) {
    parts.push(`EXISTING PROFILE (JSON):\n${JSON.stringify(existing, null, 2)}`);
  }
  if (transcript) {
    parts.push(`NEW SPOKEN TRANSCRIPT (raw dictation):\n"""\n${transcript}\n"""`);
  }
  if (resumeText) {
    parts.push(`PASTED RÉSUMÉ TEXT:\n"""\n${resumeText}\n"""`);
  }

  try {
    const result = await getStructuredCompletion<CareerProfile>({
      system: existing ? `${SYSTEM}\n\n${MERGE_NOTE}` : SYSTEM,
      prompt: parts.join("\n\n"),
      schema: PROFILE_SCHEMA,
      schemaName: "career_profile",
    });

    const profile = sanitize(result.data, existing);
    return NextResponse.json({ ok: true, profile, retried: result.retried });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/**
 * Guard rails the schema can't express. Mostly this protects a merge: a model
 * that returns a thin profile must not silently wipe facts the user already
 * confirmed and edited by hand.
 */
function sanitize(profile: CareerProfile, existing: CareerProfile | null): CareerProfile {
  const skills = (profile.skills ?? []).map((s) => ({
    ...s,
    proficiency: Math.min(5, Math.max(1, Math.round(s.proficiency))),
  }));

  const merged: CareerProfile = {
    ...profile,
    skills,
    notableProjects: profile.notableProjects ?? [],
    constraints: {
      workMode: profile.constraints?.workMode ?? null,
      hoursPerWeek: profile.constraints?.hoursPerWeek ?? null,
      timeline: profile.constraints?.timeline ?? null,
      other: profile.constraints?.other ?? [],
    },
  };

  if (!existing) return merged;

  // Nothing new may erase something known. Scalars fall back to the old value;
  // lists fall back only when the model returned an empty one.
  return {
    ...merged,
    name: merged.name ?? existing.name,
    currentRole: merged.currentRole ?? existing.currentRole,
    targetRole: merged.targetRole ?? existing.targetRole,
    yearsExperience: merged.yearsExperience ?? existing.yearsExperience,
    seniority: merged.seniority ?? existing.seniority,
    skills: merged.skills.length ? merged.skills : existing.skills,
    notableProjects: merged.notableProjects.length
      ? merged.notableProjects
      : existing.notableProjects,
    constraints: {
      workMode: merged.constraints.workMode ?? existing.constraints.workMode,
      hoursPerWeek: merged.constraints.hoursPerWeek ?? existing.constraints.hoursPerWeek,
      timeline: merged.constraints.timeline ?? existing.constraints.timeline,
      other: merged.constraints.other.length
        ? merged.constraints.other
        : existing.constraints.other,
    },
    // A known destination can't be un-known by a later utterance about something else.
    followUpQuestion: merged.targetRole ? null : merged.followUpQuestion,
  };
}
