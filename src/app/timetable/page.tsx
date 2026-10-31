"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function TimetablePage() {
  return (
    <PlaceholderScreen
      station={STATIONS[2]}
      intro="A week-by-week service pattern for closing the gaps. Each week is a departure with a small number of stops — enough to move, not enough to quit. Tell it how much time you really have and it re-plans around you instead of guilting you."
      emptyHeading="No service scheduled on this line."
      capturedLabel="Timetable notes"
      sayThis={[
        "I've got about five hours a week, mostly on weekday evenings.",
        "I finished the networking module this week, move me on.",
        "Next two weeks are a write-off, I'm travelling — re-plan around it.",
      ]}
    />
  );
}
