"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Transcript } from "@/lib/store/profile";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The receipt roll: every raw input, unedited, kept out of the way in a small
 * collapsible box. This is the "show your working" panel — open it and you can
 * read the filler words and self-corrections that the pass above was cut from.
 */
export function TranscriptBox({ transcripts }: { transcripts: Transcript[] }) {
  const [open, setOpen] = useState(false);
  if (transcripts.length === 0) return null;

  const words = transcripts.reduce(
    (total, t) => total + (t.text.trim() ? t.text.trim().split(/\s+/).length : 0),
    0,
  );

  return (
    <section className="card mt-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 bg-paper-sunken px-5 py-3 text-left transition-colors hover:bg-paper-edge/60"
      >
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="block shrink-0"
        >
          <svg width="8" height="10" viewBox="0 0 8 10">
            <path d="M1 1l5 4-5 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </motion.span>
        <span className="t-label min-w-0 text-ink">Raw transcript</span>
        <span className="t-mono ml-auto shrink-0 text-[10px] text-ink-muted">
          {String(transcripts.length).padStart(2, "0")} TAKE
          {transcripts.length === 1 ? "" : "S"} · {words} WORDS
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="roll"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden border-t border-paper-edge"
          >
            <ul>
              {transcripts.map((t) => (
                <li
                  key={t.id}
                  className="flex gap-4 border-b border-paper-edge px-5 py-3.5 last:border-b-0"
                >
                  <span className="t-mono shrink-0 pt-[2px] text-[10px] text-ink-muted">
                    {t.at}
                    <br />
                    {t.kind === "voice" ? "VOICE" : "PASTE"}
                  </span>
                  <p className="t-small min-w-0 max-w-[96ch] font-mono whitespace-pre-wrap text-ink-soft">
                    {t.text}
                  </p>
                </li>
              ))}
            </ul>
            <p className="t-small bg-paper-sunken px-5 py-3 text-ink-muted">
              Kept verbatim, in this browser only. The pass above is what the AI
              cut out of it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
