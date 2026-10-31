"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useJourney } from "@/lib/store/journey";
import { LINE_COLOR, stationFor } from "@/lib/stations";

/* The wall clock is an external system, so it's modelled as one: a single
   shared ticker the clock subscribes to. The server snapshot is null, which
   renders dashes and keeps server and client markup identical. */
let tick = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribeToClock(onChange: () => void) {
  listeners.add(onChange);
  if (!timer) {
    tick = Date.now();
    timer = setInterval(() => {
      tick = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Live station clock. Renders dashes until hydrated. */
function StationClock() {
  const ms = useSyncExternalStore(
    subscribeToClock,
    () => tick,
    () => null,
  );
  const now = ms ? new Date(ms) : null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = now ? pad(now.getHours()) : "--";
  const mm = now ? pad(now.getMinutes()) : "--";
  const ss = now ? pad(now.getSeconds()) : "--";

  return (
    <div className="flex items-stretch gap-3">
      <div className="flex items-center gap-[3px] rounded-sm bg-panel px-3 py-2">
        {[hh, mm].map((part, i) => (
          <span key={i} className="flex items-center gap-[3px]">
            {i > 0 && (
              <span
                className="t-mono-lg px-[1px] text-amber-dim"
                style={{ transform: "translateY(-1px)" }}
              >
                :
              </span>
            )}
            <span className="t-mono-lg text-amber">{part}</span>
          </span>
        ))}
        <span className="t-mono ml-1.5 self-end pb-[3px] text-[11px] text-amber-dim">
          {ss}
        </span>
      </div>
      <div className="hidden flex-col justify-center sm:flex">
        <span className="t-label text-ink-muted">Station time</span>
        <span className="t-mono mt-1 text-[10px] text-ink-muted">
          LOCAL · LIVE
        </span>
      </div>
    </div>
  );
}

export function TopStrip() {
  const pathname = usePathname();
  const station = stationFor(pathname);
  const fromRole = useJourney((s) => s.fromRole);
  const toRole = useJourney((s) => s.toRole);
  const boarded = useJourney((s) => s.boarded);

  /* The route reads as a two-station line: origin ring, track, destination dot.
     On phone it gets its own full-width row rather than being truncated to
     "Support …" next to the clock. */
  const route = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="t-small min-w-0 flex-1 truncate text-right font-medium text-ink-soft lg:flex-none">
        {fromRole}
      </span>
      <span className="relative flex shrink-0 items-center" aria-hidden="true">
        <span
          className="block h-[9px] w-[9px] rounded-full border-2"
          style={{ borderColor: LINE_COLOR.pivot, background: "var(--color-paper)" }}
        />
        <span
          className="block h-[4px] w-7 lg:w-12"
          style={{ background: LINE_COLOR.pivot }}
        />
        <span
          className="block h-[11px] w-[11px] rounded-full"
          style={{ background: LINE_COLOR.pivot }}
        />
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-[19px] leading-none text-ink lg:flex-none">
        {toRole}
      </span>
    </div>
  );

  return (
    <header className="shrink-0 border-b border-paper-edge px-5 py-3 lg:px-10">
      <div className="flex min-h-10 items-center justify-between gap-4">
        <StationClock />

        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <div className="min-w-0 shrink-0 text-right">
            <div className="t-label text-ink-muted">
              {boarded ? "Your route" : "Demo route"}
            </div>
            <div className="t-mono mt-1 text-[10px] text-ink-muted">
              NOW AT {station.code}
            </div>
          </div>
          <div className="hidden min-w-0 lg:block">{route}</div>
        </div>
      </div>

      <div className="mt-3 border-t border-paper-edge pt-3 lg:hidden">{route}</div>
    </header>
  );
}
