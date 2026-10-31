"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SkillMap, SkillStatus } from "@/lib/skillMap";

/**
 * The postings the user pasted and the analysis drawn from them. Persisted, so
 * the survey survives a reload — re-running it costs several AI calls.
 */

export type StoredJd = {
  id: number;
  /** Full pasted text, kept so the survey can be re-run after an edit. */
  text: string;
  /** Filled in from the analysis once it lands; a label until then. */
  title: string;
  at: string;
  /** Loaded from the built-in demo set rather than pasted by the user. */
  sample: boolean;
};

type SkillMapState = {
  jds: StoredJd[];
  map: SkillMap | null;
  /** Station whose panel is open, by skill id. */
  selectedId: string | null;
  surveyed: boolean;
  /** True when the analysis on screen was built from the built-in samples. */
  mapFromSamples: boolean;

  addJd: (text: string, sample?: boolean) => void;
  removeJd: (id: number) => void;
  setMap: (map: SkillMap) => void;
  select: (id: string | null) => void;
  /** "I've picked that up now" — promotes a station without a re-survey. */
  promote: (id: string) => void;
  /** Set a station outright, used when a check-in proposal is accepted. */
  setSkillStatus: (id: string, status: SkillStatus, reason?: string) => void;
  reset: () => void;
};

function stamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** First line that looks like a title, else the opening words. */
function labelFor(text: string): string {
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 3);
  const label = firstLine ?? text.trim();
  return label.length > 54 ? `${label.slice(0, 54)}…` : label;
}

const NEXT_STATUS: Record<SkillStatus, SkillStatus> = {
  gap: "partial",
  partial: "have",
  have: "have",
};

const INITIAL = {
  jds: [] as StoredJd[],
  map: null as SkillMap | null,
  selectedId: null as string | null,
  surveyed: false,
  mapFromSamples: false,
};

export const useSkillMap = create<SkillMapState>()(
  persist(
    (set) => ({
      ...INITIAL,

      addJd: (text, sample = false) =>
        set((s) => ({
          jds: [
            ...s.jds,
            {
              id: Date.now() + s.jds.length,
              text,
              title: labelFor(text),
              at: stamp(),
              sample,
            },
          ],
        })),

      removeJd: (id) => set((s) => ({ jds: s.jds.filter((jd) => jd.id !== id) })),

      // Whether this analysis came from the samples is recorded with it, so the
      // map can say so even after the user navigates away and back.
      setMap: (map) =>
        set((s) => ({
          map,
          surveyed: true,
          selectedId: null,
          mapFromSamples: s.jds.some((jd) => jd.sample),
        })),

      select: (selectedId) => set({ selectedId }),

      /**
       * A skill moves one step along — gap to partial, partial to cleared. The
       * map keeps its order, so a cleared station visibly leaves the main line
       * for the branch rather than the whole survey rearranging itself.
       */
      promote: (id) =>
        set((s) =>
          s.map
            ? {
                map: {
                  ...s.map,
                  skills: s.map.skills.map((skill) =>
                    skill.id === id
                      ? {
                          ...skill,
                          status: NEXT_STATUS[skill.status],
                          reason:
                            NEXT_STATUS[skill.status] === "have"
                              ? "You marked this station cleared."
                              : "You marked progress on this station.",
                        }
                      : skill,
                  ),
                },
              }
            : s,
        ),

      setSkillStatus: (id, status, reason) =>
        set((s) =>
          s.map
            ? {
                map: {
                  ...s.map,
                  skills: s.map.skills.map((skill) =>
                    skill.id === id
                      ? { ...skill, status, reason: reason ?? skill.reason }
                      : skill,
                  ),
                },
              }
            : s,
        ),

      reset: () => set(INITIAL),
    }),
    { name: "pivotline:skillmap" },
  ),
);
