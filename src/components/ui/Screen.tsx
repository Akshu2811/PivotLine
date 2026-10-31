"use client";

import Link from "next/link";
import {
  LINE_BADGE_TEXT,
  LINE_COLOR,
  LINE_NAME,
  STATIONS,
  type LineKey,
  type Station,
} from "@/lib/stations";

/**
 * Page frame. Content is a left-aligned printed column, never a centred hero.
 * Bottom padding clears the fixed voice dock on every screen.
 */
export function Screen({
  station,
  intro,
  children,
}: {
  station: Station;
  intro: string;
  children?: React.ReactNode;
}) {
  const color = LINE_COLOR[station.line];

  return (
    <div
      className="paper-grain min-h-full px-5 pt-7 lg:px-10 lg:pt-10"
      style={{ paddingBottom: "calc(var(--dock-h) + 40px)" }}
    >
      <div className="mx-auto max-w-[1100px]">
        <header className="pb-6 lg:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="badge"
              style={{ background: color, color: LINE_BADGE_TEXT[station.line] }}
            >
              {LINE_NAME[station.line]}
            </span>
            <span className="t-mono text-[11px] text-ink-faint">
              PLATFORM {station.code}
            </span>
          </div>

          <h1 className="t-display mt-4 text-ink">{station.name}</h1>

          <p className="t-body mt-4 max-w-[62ch] text-ink-soft">{intro}</p>

          {/* Printed rule under the header, tipped with this screen's line. */}
          <div className="mt-6 flex items-center lg:mt-7">
            <span className="block h-[4px] w-14" style={{ background: color }} />
            <span className="block h-px flex-1 bg-paper-edge" />
          </div>
        </header>

        {children}

        <NextStop station={station} />
      </div>
    </div>
  );
}

/** Closes every screen with the onward connection, so no page dead-ends. */
function NextStop({ station }: { station: Station }) {
  const i = STATIONS.findIndex((s) => s.href === station.href);
  const next = STATIONS[(i + 1) % STATIONS.length];
  const color = LINE_COLOR[next.line];

  return (
    <Link
      href={next.href}
      className="group mt-6 flex items-center gap-4 border-t border-paper-edge pt-5"
    >
      <span className="t-label shrink-0 text-ink-faint">Next stop</span>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="block h-[3px] min-w-6 flex-1" style={{ background: color }} />
        <span
          className="block h-[11px] w-[11px] shrink-0 rounded-full"
          style={{ background: color }}
        />
      </span>
      <span className="shrink-0 font-display text-[19px] leading-none text-ink transition-colors group-hover:text-[var(--color-pivot)]">
        {next.name}
      </span>
      <span className="t-mono shrink-0 text-[10px] text-ink-faint">{next.code}</span>
    </Link>
  );
}

/**
 * Empty state. Its whole job is to tell the user exactly what to say into the
 * dock, so a screen with no data is still instructive.
 */
export function EmptyState({
  line,
  heading,
  sayThis,
  notes,
}: {
  line: LineKey;
  heading: string;
  /** Example utterances, written the way someone would actually speak them. */
  sayThis: string[];
  notes?: string;
}) {
  const color = LINE_COLOR[line];

  return (
    <section className="card card-offset relative overflow-hidden">
      {/* Unbuilt track: a dashed line with hollow stations, meaning "nothing
          here yet" in the visual language of the app. */}
      <div className="flex items-center gap-0 border-b border-paper-edge bg-paper-sunken px-6 py-5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex min-w-0 flex-1 items-center">
            <span
              className="block h-[11px] w-[11px] shrink-0 rounded-full border-2 bg-paper-raised"
              style={{ borderColor: color, opacity: 0.8 }}
            />
            {i < 3 && (
              <span
                className="block h-0 min-w-0 flex-1 border-t-[3px] border-dashed"
                style={{ borderColor: color, opacity: 0.6 }}
              />
            )}
          </span>
        ))}
        <span className="t-mono ml-4 shrink-0 text-[10px] text-ink-faint">
          NO SERVICE
        </span>
      </div>

      <div className="px-6 py-6 lg:px-8 lg:py-7">
        <h2 className="t-h2 text-ink">{heading}</h2>

        <div className="t-label mt-6 text-ink-faint">Say something like</div>
        <ul className="mt-3 space-y-0 border-t border-paper-edge">
          {sayThis.map((line_, i) => (
            <li
              key={i}
              className="flex items-start gap-3 border-b border-paper-edge py-3"
            >
              <span className="t-mono shrink-0 pt-[3px] text-[11px] text-ink-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="mt-[7px] block h-[3px] w-5 shrink-0"
                style={{ background: color }}
              />
              <span className="t-body min-w-0 text-ink">“{line_}”</span>
            </li>
          ))}
        </ul>

        <p className="t-small mt-5 max-w-[62ch] text-ink-muted">
          {notes ??
            "Dictate into the dock below, then press Send. Nothing leaves your browser until you do."}
        </p>
      </div>
    </section>
  );
}

/** Small labelled stat, mono figure over a hairline. Used for screen summaries. */
export function Stat({
  label,
  value,
  unit,
  line,
}: {
  label: string;
  value: string;
  unit?: string;
  line?: LineKey;
}) {
  return (
    <div className="border-t-2 pt-3" style={{ borderColor: line ? LINE_COLOR[line] : "var(--color-ink)" }}>
      <div className="t-label text-ink-faint">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] leading-none font-medium tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {unit && <span className="t-mono text-[11px] text-ink-muted">{unit}</span>}
      </div>
    </div>
  );
}
