"use client";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";
import { STATIONS } from "@/lib/stations";

export default function ProjectDepotPage() {
  return (
    <PlaceholderScreen
      station={STATIONS[3]}
      intro="Where rolling stock gets built. Courses don't prove anything — *artefacts* do. The depot proposes small, finishable projects whose only job is to be concrete evidence of a station you haven't cleared yet."
      emptyHeading="Nothing in the depot."
      capturedLabel="Build notes"
      sayThis={[
        "Give me a project that would prove I can build a RAG pipeline and measure it with evals.",
        "I'd like to build an agent on real support ticket data, not another chat-with-your-PDF demo.",
        "I shipped the LangGraph triage agent — log it against the orchestration station.",
      ]}
    />
  );
}
