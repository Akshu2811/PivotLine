"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApplicationRecord, DepartureOp, InsightReport } from "@/lib/applications";

/**
 * The departure board's own state: applications, the dictation log they came
 * from, and the last insight report read off them. Persisted, since the board
 * is the thing that's supposed to accumulate across sessions.
 */

export type DictationLogEntry = {
  id: number;
  text: string;
  at: string;
  companies: string[];
};

type DepartureState = {
  applications: ApplicationRecord[];
  log: DictationLogEntry[];
  insights: InsightReport | null;
  planChangeApplied: boolean;

  upsertFromOps: (ops: DepartureOp[], text: string) => { created: string[]; updated: string[] };
  setInsights: (insights: InsightReport) => void;
  markPlanChangeApplied: () => void;
  reset: () => void;
};

const INITIAL = {
  applications: [] as ApplicationRecord[],
  log: [] as DictationLogEntry[],
  insights: null as InsightReport | null,
  planChangeApplied: false,
};

function sameCompany(a: ApplicationRecord, company: string): boolean {
  return a.company.trim().toLowerCase() === company.trim().toLowerCase();
}

export const useDepartures = create<DepartureState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      /**
       * Applies every op in order against the board as it stands so far,
       * which is what lets two mentions of the same company in one dictation
       * — a new application, then a reply for it — land as one record.
       */
      upsertFromOps: (ops, text) => {
        const created: string[] = [];
        const updated: string[] = [];
        const applications = [...get().applications];
        let nextId = applications.reduce((max, a) => Math.max(max, a.id), 0) + 1;

        for (const op of ops) {
          const company = op.company.trim();
          if (!company) continue;
          const index = applications.findIndex((a) => sameCompany(a, company));

          if (index === -1) {
            applications.push({
              id: nextId++,
              company,
              role: op.role?.trim() || "Unspecified role",
              appliedAt: new Date().toISOString().slice(0, 10),
              status: op.status ?? "Applied",
              tags: op.tags,
            });
            created.push(company);
          } else {
            const existing = applications[index];
            const seen = new Set(existing.tags.map((t) => t.toLowerCase()));
            const tags = [...existing.tags];
            for (const tag of op.tags) {
              if (!seen.has(tag.toLowerCase())) {
                tags.push(tag);
                seen.add(tag.toLowerCase());
              }
            }
            applications[index] = {
              ...existing,
              role: op.role?.trim() || existing.role,
              status: op.status ?? existing.status,
              tags,
            };
            if (!created.includes(company)) updated.push(company);
          }
        }

        set({
          applications,
          log: [
            { id: Date.now(), text, at: new Date().toISOString(), companies: [...created, ...updated] },
            ...get().log,
          ],
        });

        return { created, updated };
      },

      setInsights: (insights) => set({ insights, planChangeApplied: false }),
      markPlanChangeApplied: () => set({ planChangeApplied: true }),
      reset: () => set(INITIAL),
    }),
    { name: "pivotline:departures" },
  ),
);
