"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The user's route: where they board from and where they're headed. Shown in the
 * top strip. Persisted to browser storage — PivotLine has no login and no
 * database, so this is the source of truth.
 *
 * Defaults are demo values so every screen is explorable before the user has
 * said a word.
 */

type JourneyState = {
  fromRole: string;
  toRole: string;
  /** Captured career story transcript, if the user has dictated one. */
  story: string;
  /** Has the user replaced the demo route with their own? */
  boarded: boolean;

  setRoute: (fromRole: string, toRole: string) => void;
  setStory: (story: string) => void;
  reset: () => void;
};

const DEMO = {
  fromRole: "Support Engineer",
  toRole: "Solutions Architect",
  story: "",
  boarded: false,
};

export const useJourney = create<JourneyState>()(
  persist(
    (set) => ({
      ...DEMO,
      setRoute: (fromRole, toRole) => set({ fromRole, toRole, boarded: true }),
      setStory: (story) => set({ story, boarded: true }),
      reset: () => set(DEMO),
    }),
    { name: "pivotline:journey" },
  ),
);
