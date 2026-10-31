"use client";

import { LeftRail, StationStrip } from "./LeftRail";
import { StationTransition } from "./StationTransition";
import { TopStrip } from "./TopStrip";
import { VoiceDock } from "./VoiceDock";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-paper">
      <LeftRail />
      <div className="flex min-w-0 flex-1 flex-col">
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
