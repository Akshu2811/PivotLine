"use client";

import { useCallback } from "react";
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { useJourney } from "@/lib/store/journey";
import { STATIONS } from "@/lib/stations";

export default function BoardingPassPage() {
  const setStory = useJourney((s) => s.setStory);
  const onCapture = useCallback((text: string) => setStory(text), [setStory]);

  return (
    <PlaceholderScreen
      station={STATIONS[0]}
      onCapture={onCapture}
      intro="Everything starts here. Say your career story out loud — the jobs you've had, what you're actually good at, and the role you're trying to reach. PivotLine turns it into a boarding pass: origin, destination, and the line between them."
      emptyHeading="No boarding pass issued yet."
      capturedLabel="Story on file"
      sayThis={[
        "I've been a support engineer for four years and I want to move into solutions architecture.",
        "I'm strong on Postgres and customer comms, weak on cloud architecture and pre-sales.",
        "I can give this about six hours a week and I'd like to be interview-ready by March.",
      ]}
      notes="Nothing is sent anywhere until you press Send. Your story is stored in this browser only — no account, no server copy."
    />
  );
}
