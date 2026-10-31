"use client";

import { LeftRail, StationStrip } from "./LeftRail";
import { StationTransition } from "./StationTransition";
import { TopStrip } from "./TopStrip";
import { VoiceDock } from "./VoiceDock";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper-grain flex h-dvh overflow-hidden">
      <LeftRail />
      {/* The dock is fixed over the bottom of this column, so the column
          reserves exactly its height. That makes the scroll viewport end at the
          top of the dock: no element can sit behind the dock at any scroll
          position, and every button stays clickable without scroll tricks.
          The rail is a sibling, and the dock clears it on laptop, so the
          reservation belongs here rather than on the whole shell. */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{ paddingBottom: "var(--dock-h)" }}
      >
        <StationStrip />
        <TopStrip />
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <StationTransition>{children}</StationTransition>
        </main>
      </div>
      <VoiceDock />
    </div>
  );
}
