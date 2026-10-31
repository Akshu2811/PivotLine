"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function InterviewBoothPage() {
  return (
    <PlaceholderScreen
      station={STATIONS[4]}
      intro="A soundproof booth on the platform. Questions come from the role you're actually targeting, you answer out loud, and the booth scores the answer against a rubric — structure, evidence, and whether you ever said what you *personally* did."
      emptyHeading="The booth is empty."
      capturedLabel="Answers on the record"
      sayThis={[
        "Ask me how I'd debug a RAG system that retrieves the wrong chunks.",
        "Quiz me on how I'd design an eval set for an agent before shipping it.",
        "That answer felt weak. Score it honestly and tell me what was missing.",
      ]}
    />
  );
}
