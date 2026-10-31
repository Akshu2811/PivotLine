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
 * Renders an intro string where exactly one word is wrapped in asterisks, and
 * sets that word in display italic. Keeping the marker in the copy means each
 * screen's emphasis lives next to the sentence it belongs to, not in markup.
 */
function Intro({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*([^*]+)\*/).map((part, i) =>
        i % 2 === 1 ? (
          <em key={i} className="t-accent">
            {part}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * Page frame. Content is a left-aligned printed column, never a centred hero.
 * The shell reserves the dock's height, so this only needs ordinary trailing
 * space — the scroll viewport already ends above the dock.
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
    <div className="paper-grid min-h-full px-5 pt-7 pb-10 lg:px-10 lg:pt-10 lg:pb-12">
      <div className="mx-auto max-w-[1100px]">
        <header className="pb-6 lg:pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="badge"
              style={{ background: color, color: LINE_BADGE_TEXT[station.line] }}
            >
              {LINE_NAME[station.line]}
            </span>
            <span className="t-mono text-[11px] text-ink-muted">
              PLATFORM {station.code}
            </span>
          </div>

          {/* The platform code, printed huge and outlined behind the station
              name the way it is stencilled on a real platform wall. */}
          <div className="relative mt-7 lg:mt-10">
            <span
              aria-hidden="true"
              className="platform-ghost pointer-events-none absolute top-1/2 left-[-6px] -translate-y-1/2 text-[92px] lg:left-[-10px] lg:text-[128px]"
            >
              {station.code}
            </span>
            <h1 className="t-display relative text-ink">{station.name}</h1>
          </div>

          <p className="t-body mt-6 max-w-[62ch] text-pretty text-ink-soft">
            <Intro text={intro} />
          </p>

          {/* Printed rule under the header, tipped with this screen's line. */}
          <div className="mt-6 flex items-center lg:mt-7">
            <span className="block h-[5px] w-16" style={{ background: color }} />
            <span className="block h-[2px] flex-1 bg-rule" />
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
      <span className="t-label shrink-0 text-ink-muted">Next stop</span>
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
      <span className="t-mono shrink-0 text-[10px] text-ink-muted">{next.code}</span>
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
          here yet" in the visual language of the app. A single train dot keeps
          creeping along it, so the screen reads as waiting rather than dead. */}
      <div className="flex items-center border-b border-paper-edge bg-paper-sunken px-6 py-5">
        {/* The dots sit at 0% and 100% of this box, so the train's travel can
            be expressed as a plain 0→100% sweep of the same box. */}
        <div className="relative flex min-w-0 flex-1 items-center">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={
                i < 3 ? "flex min-w-0 flex-1 items-center" : "flex shrink-0 items-center"
              }
            >
              <span
                className="relative z-10 block h-[12px] w-[12px] shrink-0 rounded-full border-2 bg-paper-raised"
                style={{ borderColor: color }}
              />
              {i < 3 && (
                <span
                  className="block h-0 min-w-0 flex-1 border-t-[3px] border-dashed"
                  style={{ borderColor: color, opacity: 0.75 }}
                />
              )}
            </span>
          ))}

          <span
            aria-hidden="true"
            className="train-creep pointer-events-none absolute top-1/2 z-20 block h-[9px] w-[9px] rounded-full"
            style={{
              background: color,
              marginTop: -4.5,
              marginLeft: -4.5,
              boxShadow: "0 0 0 3px var(--color-paper-sunken)",
            }}
          />
        </div>

        <span className="t-mono ml-5 shrink-0 text-[10px] text-ink-muted">
          NO SERVICE
        </span>
      </div>

      <div className="px-6 py-6 lg:px-8 lg:py-7">
        <h2 className="t-h2 text-ink">{heading}</h2>

        <div className="t-label mt-6 text-ink-muted">Say something like</div>
        <ul className="mt-3 space-y-0 border-t border-paper-edge">
          {sayThis.map((line_, i) => (
            <li
              key={i}
              className="flex items-start gap-3 border-b border-paper-edge py-3"
            >
              <span className="t-mono shrink-0 pt-[3px] text-[11px] text-ink-muted">
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

        <p className="t-small mt-5 max-w-[62ch] text-pretty text-ink-muted">
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
      <div className="t-label text-ink-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] leading-none font-medium tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {unit && <span className="t-mono text-[11px] text-ink-muted">{unit}</span>}
      </div>
    </div>
  );
}
