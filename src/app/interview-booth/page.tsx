"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function InterviewBoothPage() {
  return (
    <PlaceholderScreen
      station={STATIONS[4]}
      intro="A soundproof booth on the platform. Questions come from the role you're actually targeting, you answer out loud, and the booth scores the answer against a rubric — structure, evidence, and whether you ever said what you personally did."
      emptyHeading="The booth is empty."
      capturedLabel="Answers on the record"
      sayThis={[
        "Ask me a systems design question for a solutions architect role.",
        "Tell me about a time I handled a production incident — I'll answer now.",
        "That answer felt weak. Score it honestly and tell me what was missing.",
      ]}
    />
  );
}
