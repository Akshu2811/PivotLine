"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LINE_COLOR, type LineKey, type Station } from "@/lib/stations";
import { useVoiceHandler } from "@/lib/store/voiceDock";
import { EmptyState, Screen } from "./Screen";

type Captured = { id: number; text: string; at: string };

/**
 * Shared body for the six screens while they are still placeholders. It proves
 * the dock wiring end to end: whatever the user dictates arrives at *this*
 * screen's handler and is logged on the screen it was spoken into.
 */
export function PlaceholderScreen({
  station,
  intro,
  emptyHeading,
  sayThis,
  notes,
  capturedLabel,
  onCapture,
}: {
  station: Station;
  intro: string;
  emptyHeading: string;
  sayThis: string[];
  notes?: string;
  /** Heading above the log of things said on this screen. */
  capturedLabel: string;
  onCapture?: (text: string) => void;
}) {
  const [captured, setCaptured] = useState<Captured[]>([]);
  const line: LineKey = station.line;
  const color = LINE_COLOR[line];

  const handle = useCallback(
    (text: string) => {
      const now = new Date();
      const at = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`;
      setCaptured((prev) => [{ id: now.getTime(), text, at }, ...prev]);
      onCapture?.(text);
    },
    [onCapture],
  );

  useVoiceHandler(station.href, handle);

  return (
    <Screen station={station} intro={intro}>
      {captured.length === 0 ? (
        <EmptyState
          line={line}
          heading={emptyHeading}
          sayThis={sayThis}
          notes={notes}
        />
      ) : (
        <section className="card card-offset overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-paper-edge bg-paper-sunken px-6 py-4">
            <span className="t-label text-ink">{capturedLabel}</span>
            <span className="t-mono text-[10px] text-ink-faint">
              {String(captured.length).padStart(2, "0")} LOGGED · {station.code}
            </span>
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {captured.map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-4 border-b border-paper-edge px-6 py-4 last:border-b-0"
                >
                  <span className="t-mono shrink-0 pt-[2px] text-[11px] text-ink-muted">
                    {item.at}
                  </span>
                  <span
                    className="mt-[6px] block h-[9px] w-[9px] shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="t-body min-w-0 text-ink">{item.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="perf" />
          <p className="t-small px-6 py-4 text-ink-muted">
            Captured on this screen. Parsing into structured data lands in the
            next build phase — the dock already routes to {station.code}.
          </p>
        </section>
      )}
    </Screen>
  );
}
