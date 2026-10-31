"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function DeparturesPage() {
  return (
    <PlaceholderScreen
      station={STATIONS[5]}
      intro="Every application you've sent, on the board: company, role, platform, and status. Over time the board stops being a list and starts being *evidence* — which kinds of roles answer you, and which ones never board at all."
      emptyHeading="No departures on the board."
      capturedLabel="Board entries"
      sayThis={[
        "I applied to Monzo for an AI engineer role on Tuesday.",
        "The Stripe one came back — technical screen on LangGraph booked for Thursday.",
        "Which kinds of applications are actually getting replies?",
      ]}
    />
  );
}
