"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function ProjectDepotPage() {
  return (
    <PlaceholderScreen
      station={STATIONS[3]}
      intro="Where rolling stock gets built. Courses don't prove anything — artefacts do. The depot proposes small, finishable projects whose only job is to be concrete evidence of a station you haven't cleared yet."
      emptyHeading="Nothing in the depot."
      capturedLabel="Build notes"
      sayThis={[
        "Give me a project that would prove I can design a multi-region deployment.",
        "I'd like to build something with real customer data, not a to-do app.",
        "I shipped the migration tool — log it against the Kubernetes station.",
      ]}
    />
  );
}
