"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LINE_COLOR, LINE_SHORT, STATIONS, stationIndex } from "@/lib/stations";

/* Rail geometry. The track sits at TRACK_X; every station dot is centred on it,
   so the nav *is* the line diagram rather than a list with decoration. */
const TRACK_X = 22;
const ROW_H = 58;
const TOP_PAD = 14;

function dotY(i: number) {
  return TOP_PAD + i * ROW_H + ROW_H / 2;
}

export function LeftRail() {
  const pathname = usePathname();
  const active = stationIndex(pathname);
  const height = TOP_PAD * 2 + STATIONS.length * ROW_H;

  return (
    <nav
      aria-label="Stations"
      className="hidden lg:flex lg:flex-col lg:shrink-0 lg:w-[232px] lg:border-r lg:border-paper-edge"
    >
      <div className="flex h-16 items-end border-b border-paper-edge px-5 pb-3">
        <Link href="/boarding-pass" className="group block">
          <div className="t-label text-pivot">PivotLine</div>
          <div className="t-mono mt-1.5 text-[10px] text-ink-muted">
            NETWORK MAP · 6 STOPS
          </div>
        </Link>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 pt-4">
        <div className="relative" style={{ height }}>
          {/* The track. One SVG so segments can carry their own line color and
              the travelled portion can read as solid. */}
          <svg
            className="pointer-events-none absolute inset-0"
            width="100%"
            height={height}
            aria-hidden="true"
          >
            {STATIONS.slice(0, -1).map((_, i) => {
              const next = STATIONS[i + 1];
              const travelled = i < active;
              return (
                <line
                  key={i}
                  x1={TRACK_X}
                  y1={dotY(i)}
                  x2={TRACK_X}
                  y2={dotY(i + 1)}
                  stroke={LINE_COLOR[next.line]}
                  strokeWidth={travelled ? 6 : 4}
                  strokeLinecap="butt"
                  opacity={travelled ? 1 : 0.7}
                />
              );
            })}
          </svg>

          {STATIONS.map((station, i) => {
            const isActive = i === active;
            const color = LINE_COLOR[station.line];
            return (
              <Link
                key={station.href}
                href={station.href}
                aria-current={isActive ? "page" : undefined}
                className="group absolute left-0 right-0 flex items-center"
                style={{ top: TOP_PAD + i * ROW_H, height: ROW_H }}
              >
                {/* Station dot, centred on the track. */}
                <span
                  className="relative z-10 flex items-center justify-center"
                  style={{ width: TRACK_X * 2 }}
                >
                  <span
                    className="block rounded-full border-2 bg-paper transition-all duration-150"
                    style={{
                      width: isActive ? 15 : 11,
                      height: isActive ? 15 : 11,
                      borderColor: color,
                      background: i <= active ? color : "var(--color-paper)",
                      boxShadow: isActive ? `0 0 0 3px var(--color-paper)` : undefined,
                    }}
                  />
                  {isActive && (
                    <motion.span
                      layoutId="rail-train"
                      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute rounded-full"
                      style={{
                        width: 27,
                        height: 27,
                        border: `1.5px solid ${color}`,
                      }}
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1 pl-1">
                  <span
                    className="block truncate font-display text-[19px] leading-tight transition-colors"
                    style={{ color: isActive ? "var(--color-ink)" : "var(--color-ink-soft)" }}
                  >
                    {station.name}
                  </span>
                  <span className="t-mono mt-1 block truncate text-[10px] text-ink-muted group-hover:text-ink">
                    {station.code} · {LINE_SHORT[station.line]}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Legend: two columns so all four lines always fit above the fold, even
          on a short laptop window. */}
      <div className="shrink-0 border-t border-paper-edge px-5 py-4">
        <div className="t-label text-ink-muted">Lines</div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {(["pivot", "learn", "build", "talk"] as const).map((key) => (
            <li key={key} className="flex min-w-0 items-center gap-2">
              <span
                className="block h-[3px] w-4 shrink-0"
                style={{ background: LINE_COLOR[key] }}
              />
              <span className="t-mono truncate text-[10px] text-ink-muted">
                {LINE_SHORT[key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Narrow-screen equivalent: the same stations as a horizontal station strip. */
export function StationStrip() {
  const pathname = usePathname();
  const active = stationIndex(pathname);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // The strip overflows on phone, so the current station has to be scrolled to
  // or stops 5 and 6 are never visible when you're standing on them.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  return (
    <nav
      aria-label="Stations"
      className="lg:hidden border-b border-paper-edge"
    >
      <div className="flex items-center justify-between px-5 pt-3">
        <span className="t-label text-pivot">PivotLine</span>
        <span className="t-mono text-[10px] text-ink-muted">
          STOP {active + 1}/{STATIONS.length}
        </span>
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <div className="relative flex min-w-max items-start gap-0 px-5 pt-4 pb-3">
          {STATIONS.map((station, i) => {
            const isActive = i === active;
            const color = LINE_COLOR[station.line];
            return (
              <Link
                key={station.href}
                href={station.href}
                ref={isActive ? activeRef : undefined}
                aria-current={isActive ? "page" : undefined}
                className="relative flex w-[98px] shrink-0 flex-col items-center"
              >
                {/* Connector to the next station, drawn to the right of the dot. */}
                {i < STATIONS.length - 1 && (
                  <span
                    className="absolute left-1/2 top-[5px] h-[4px] w-full"
                    style={{
                      background: LINE_COLOR[STATIONS[i + 1].line],
                      opacity: i < active ? 1 : 0.45,
                    }}
                  />
                )}
                <span
                  className="relative z-10 block rounded-full border-2"
                  style={{
                    width: isActive ? 14 : 11,
                    height: isActive ? 14 : 11,
                    marginTop: isActive ? -1.5 : 0,
                    borderColor: color,
                    background: i <= active ? color : "var(--color-paper)",
                    boxShadow: "0 0 0 3px var(--color-paper)",
                  }}
                />
                <span
                  className="mt-2.5 px-1 text-center font-display text-[14px] leading-[1.15]"
                  style={{
                    color: isActive ? "var(--color-ink)" : "var(--color-ink-muted)",
                  }}
                >
                  {station.name}
                </span>
                <span className="t-mono mt-1 text-[9px] text-ink-muted">
                  {station.code}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
