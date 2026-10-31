"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type CareerProfile,
  type Constraints,
  type Skill,
} from "@/lib/profile";

/**
 * The boarding pass, persisted to browser storage. PivotLine has no login and no
 * database, so this store is the source of truth for the user's profile.
 *
 * `profile` stays null until the user actually dictates something — the screen
 * shows a labelled demo pass in the meantime, so nothing here pretends the
 * seeded example is the user's own data.
 */

export type Transcript = {
  id: number;
  /** Raw, unedited input — this is what judges open to see messy speech. */
  text: string;
  kind: "voice" | "resume";
  /** HH:MM, stamped on capture (never during render — it would mismatch on hydration). */
  at: string;
};

type ProfileState = {
  profile: CareerProfile | null;
  transcripts: Transcript[];
  /** Follow-up the AI asked because the target role was missing. */
  followUp: string | null;
  /** True once at least one extraction has landed. */
  issued: boolean;

  /** Replace the whole pass (first issue, or an explicit start-fresh). */
  setProfile: (profile: CareerProfile) => void;
  /** Field-level edit from clicking a printed field on the ticket. */
  patchProfile: (patch: Partial<CareerProfile>) => void;
  patchConstraints: (patch: Partial<Constraints>) => void;
  patchSkill: (index: number, patch: Partial<Skill>) => void;
  addTranscript: (text: string, kind: Transcript["kind"]) => void;
  clearFollowUp: () => void;
  reset: () => void;
};

function stamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const INITIAL = {
  profile: null as CareerProfile | null,
  transcripts: [] as Transcript[],
  followUp: null as string | null,
  issued: false,
};

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...INITIAL,

      setProfile: (profile) =>
        set({ profile, followUp: profile.followUpQuestion ?? null, issued: true }),

      patchProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : s)),

      patchConstraints: (patch) =>
        set((s) =>
          s.profile
            ? { profile: { ...s.profile, constraints: { ...s.profile.constraints, ...patch } } }
            : s,
        ),

      patchSkill: (index, patch) =>
        set((s) =>
          s.profile
            ? {
                profile: {
                  ...s.profile,
                  skills: s.profile.skills.map((skill, i) =>
                    i === index ? { ...skill, ...patch } : skill,
                  ),
                },
              }
            : s,
        ),

      addTranscript: (text, kind) =>
        set((s) => ({
          transcripts: [{ id: Date.now(), text, kind, at: stamp() }, ...s.transcripts],
        })),

      clearFollowUp: () => set({ followUp: null }),

      reset: () => set(INITIAL),
    }),
    { name: "pivotline:profile" },
  ),
);
