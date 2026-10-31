"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function LinePage() {
  return (
    <PlaceholderScreen
      station={STATIONS[1]}
      intro="The gap between where you are and where you're going, drawn as a line. Each station is a skill or milestone the target role expects; your train sits at the last one you've genuinely cleared. Paste a real job description and the line redraws around it."
      emptyHeading="The line hasn't been surveyed yet."
      capturedLabel="Fed into the survey"
      sayThis={[
        "Here's the job description I'm aiming at — paste or dictate the whole posting.",
        "I already know Terraform properly, mark that station as cleared.",
        "They keep asking for Kubernetes — add it to the line as a station.",
      ]}
    />
  );
}
