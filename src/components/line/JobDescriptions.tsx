"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ADVISED_JDS, MAX_JDS } from "@/lib/skillMap";
import type { StoredJd } from "@/lib/store/skillMap";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The intake for the survey. The counts on the map are only as good as the
 * sample, so this is explicit about how many postings are loaded and how many
 * it wants — five is where "6 of 8 JDs" starts meaning something.
 */
export function JobDescriptions({
  jds,
  onAdd,
  onRemove,
  onSurvey,
  onLoadSamples,
  onClearSamples,
  busy,
}: {
  jds: StoredJd[];
  onAdd: (text: string) => void;
  onRemove: (id: number) => void;
  onSurvey: () => void;
  onLoadSamples: () => void;
  onClearSamples: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState("");
  const full = jds.length >= MAX_JDS;
  const canAdd = draft.trim().length > 120 && !full && !busy;

  return (
    <section className="card card-offset overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-paper-edge bg-paper-sunken px-5 py-3.5">
        <span className="t-label text-ink">Postings on file</span>
        <span className="t-mono text-[11px] text-ink-muted">
          {String(jds.length).padStart(2, "0")} / {MAX_JDS}
        </span>
        {jds.some((jd) => jd.sample) && (
          <span className="badge" style={{ background: "var(--color-pivot)", color: "#FAF8F2" }}>
            Sample data
          </span>
        )}
        <span className="t-small ml-auto text-ink-muted">
          {jds.length === 0
            ? `Paste ${ADVISED_JDS}–${MAX_JDS} real postings for your target role.`
            : jds.some((jd) => jd.sample)
              ? "These are made-up postings — remove them and paste real ones for a real survey."
              : jds.length < ADVISED_JDS
                ? `${ADVISED_JDS - jds.length} more and the demand counts start meaning something.`
                : "Enough to survey."}
        </span>
      </header>

      {jds.length > 0 && (
        <ul>
          <AnimatePresence initial={false}>
            {jds.map((jd, i) => (
              <motion.li
                key={jd.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="flex items-center gap-3 border-b border-paper-edge px-5 py-3"
              >
                <span className="t-mono shrink-0 text-[10px] text-ink-muted">
                  JD{String(i + 1).padStart(2, "0")}
                </span>
                <span className="t-small min-w-0 flex-1 truncate text-ink">{jd.title}</span>
                {jd.sample && (
                  <span
                    className="badge shrink-0"
                    style={{ background: "var(--color-paper-sunken)", color: "var(--color-ink-muted)" }}
                  >
                    Sample
                  </span>
                )}
                <span className="t-mono shrink-0 text-[10px] text-ink-faint">
                  {jd.text.trim().split(/\s+/).length}W
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(jd.id)}
                  aria-label={`Remove job description ${i + 1}`}
                  className="t-mono shrink-0 cursor-pointer px-1 text-[10px] text-ink-muted hover:text-[var(--color-pivot)]"
                >
                  REMOVE
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="px-5 py-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          spellCheck={false}
          aria-label="Job description text"
          disabled={full}
          placeholder={
            full
              ? `That's ${MAX_JDS} postings — remove one to add another.`
              : "Paste one full job posting here — requirements, nice-to-haves, the lot."
          }
          className="t-small w-full resize-y rounded-sm border border-paper-edge bg-paper px-3 py-2 font-mono text-ink placeholder:text-ink-faint focus-visible:border-pivot focus-visible:outline-none disabled:opacity-60"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!canAdd}
            onClick={() => {
              onAdd(draft.trim());
              setDraft("");
            }}
          >
            Add posting
          </button>

          <button
            type="button"
            className="btn"
            disabled={jds.length === 0 || busy}
            onClick={onSurvey}
          >
            {busy ? "Surveying…" : `Survey ${jds.length || ""} ${jds.length === 1 ? "posting" : "postings"}`.trim()}
          </button>

          {jds.length === 0 && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onLoadSamples}>
              Load 6 sample postings
            </button>
          )}

          {jds.some((jd) => jd.sample) && (
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClearSamples}>
              Clear samples
            </button>
          )}

          {/* Its own line on a phone: sharing the button row leaves it a few
              characters wide and it clips. */}
          <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
            {draft.trim().length > 0 && draft.trim().length <= 120
              ? "That's short for a posting — paste the whole thing."
              : "Or dictate a posting into the dock below."}
          </span>
        </div>
      </div>
    </section>
  );
}
