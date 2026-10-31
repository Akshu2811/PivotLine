"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function LinePage() {
  return (
    <PlaceholderScreen
      station={STATIONS[1]}
      intro="The gap between where you are and where you're going, drawn as a line. Each station is a skill or milestone the target role expects; your train sits at the last one you've *genuinely* cleared. Paste a real job description and the line redraws around it."
      emptyHeading="The line hasn't been surveyed yet."
      capturedLabel="Fed into the survey"
      sayThis={[
        "Here's the AI engineer job description I'm aiming at — paste or dictate the whole posting.",
        "I write Python properly now, not just scripts — mark that station as cleared.",
        "Every posting wants RAG and evals — add both to the line as stations.",
      ]}
    />
  );
}
