"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { BoardingPassTicket } from "@/components/boarding-pass/BoardingPassTicket";
import { TranscriptBox } from "@/components/boarding-pass/TranscriptBox";
import { EmptyState, Screen } from "@/components/ui/Screen";
import { type CareerProfile, DEMO_PROFILE } from "@/lib/profile";
import { STATIONS } from "@/lib/stations";
import { useJourney } from "@/lib/store/journey";
import { useProfile } from "@/lib/store/profile";
import { useVoiceDock, useVoiceHandler } from "@/lib/store/voiceDock";

const STATION = STATIONS[0];
const EASE = [0.16, 1, 0.3, 1] as const;

const MERGE_PROMPT =
  "Add or correct a detail — it merges into your pass, it won't replace it";

/**
 * Boarding Pass (BP1) — the intake. The user dictates a messy career story into
 * the dock (or pastes résumé text); /api/profile turns it into a structured
 * profile; the result prints as a ticket whose every field is editable.
 *
 * With no API key and nothing dictated, the screen still shows a labelled
 * sample pass, so the whole station is explorable.
 */
export default function BoardingPassPage() {
  const profile = useProfile((s) => s.profile);
  const storeIssued = useProfile((s) => s.issued);
  const transcripts = useProfile((s) => s.transcripts);
  const followUp = useProfile((s) => s.followUp);
  const setProfile = useProfile((s) => s.setProfile);
  const patchProfile = useProfile((s) => s.patchProfile);
  const patchConstraints = useProfile((s) => s.patchConstraints);
  const patchSkill = useProfile((s) => s.patchSkill);
  const addTranscript = useProfile((s) => s.addTranscript);
  const resetProfile = useProfile((s) => s.reset);

  const setPrompt = useVoiceDock((s) => s.setPrompt);

  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printKey, setPrintKey] = useState(0);
  const [reRecording, setReRecording] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);

  // The persisted pass only exists in the browser, so the first render has to
  // match the server's — sample pass until storage has been read, then the real
  // one. Browser storage is the external system here, hence the subscription.
  const hydrated = useSyncExternalStore(
    (onChange) => useProfile.persist.onFinishHydration(onChange),
    () => useProfile.persist.hasHydrated(),
    () => false,
  );

  const issued = hydrated && storeIssued && profile !== null;
  const shown: CareerProfile = issued ? profile : DEMO_PROFILE;

  /** Send input to the extractor. `merge` folds it into the pass on file. */
  const extract = useCallback(
    async (input: { transcript?: string; resumeText?: string }, merge: boolean) => {
      setPrinting(true);
      setError(null);
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            existingProfile: merge ? useProfile.getState().profile : null,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.error || `Extraction failed (${response.status}).`);
        }

        const next = data.profile as CareerProfile;
        setProfile(next);
        setPrintKey((k) => k + 1);
        setReRecording(false);

        // The top strip reads the journey store, so keep the route in step.
        const journey = useJourney.getState();
        journey.setRoute(
          next.currentRole ?? "Unstated role",
          next.targetRole ?? "Destination unknown",
        );
        if (input.transcript) journey.setStory(input.transcript);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setPrinting(false);
      }
    },
    [setProfile],
  );

  const handleVoice = useCallback(
    async (text: string) => {
      addTranscript(text, "voice");
      // A pass already on file is added to, never overwritten — corrections and
      // extra detail merge into it.
      await extract({ transcript: text }, useProfile.getState().profile !== null);
    },
    [addTranscript, extract],
  );

  useVoiceHandler(STATION.href, handleVoice);

  // Surface the AI's follow-up (or a re-record hint) in the dock itself.
  useEffect(() => {
    setPrompt(followUp ?? (reRecording ? MERGE_PROMPT : null));
    return () => setPrompt(null);
  }, [followUp, reRecording, setPrompt]);

  const handleResume = useCallback(
    async (text: string) => {
      addTranscript(text, "resume");
      await extract({ resumeText: text }, useProfile.getState().profile !== null);
    },
    [addTranscript, extract],
  );

  return (
    <Screen
      station={STATION}
      intro="Everything starts here. Say your career story out loud — the jobs you've had, what you're actually good at, and the role you're trying to reach. PivotLine turns it into a boarding pass: *origin*, destination, and the line between them."
    >
      {printing && <PrintingStrip />}

      {error && (
        <div className="card mb-5 border-l-[4px] border-l-pivot px-5 py-4">
          <div className="t-label text-ink">Pass not issued</div>
          <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{error}</p>
          <p className="t-small mt-2 text-ink-muted">
            The sample pass below still works — every other station is explorable
            without a key.
          </p>
        </div>
      )}

      {followUp && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="card card-offset mb-5 overflow-hidden"
        >
          <div className="flex items-center gap-3 bg-paper-sunken px-5 py-3">
            <span className="t-label text-ink">Destination missing</span>
            <span className="t-mono ml-auto text-[10px] text-ink-muted">
              ASKED IN THE DOCK
            </span>
          </div>
          <p className="t-body max-w-[70ch] px-5 py-4 text-pretty text-ink">
            “{followUp}”
          </p>
        </motion.div>
      )}

      {!issued && (
        <div className="mb-7">
          <EmptyState
            line={STATION.line}
            heading="No boarding pass issued yet."
            sayThis={[
              "I've been in L2 application support for four years and I want to move into AI engineering.",
              "I'm strong on debugging and SQL, weak on Python beyond scripting, and I've never built a RAG pipeline.",
              "I can give this about six hours a week and I'd like to be interview-ready by March.",
            ]}
            notes="Ramble. Filler words, false starts and corrections are fine — correcting yourself out loud is handled, and the last thing you say about a fact wins."
          />
        </div>
      )}

      <BoardingPassTicket
        profile={shown}
        demo={!issued}
        printKey={printKey}
        handlers={{ patchProfile, patchConstraints, patchSkill }}
      />

      {/* Re-record / start fresh. */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-paper-edge pt-5">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!issued || printing}
          onClick={() => setReRecording((r) => !r)}
        >
          {reRecording ? "Cancel re-record" : "Re-record — merge in"}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={!issued || printing}
          onClick={() => {
            if (!confirmFresh) {
              setConfirmFresh(true);
              return;
            }
            resetProfile();
            setConfirmFresh(false);
            setReRecording(false);
            setError(null);
          }}
        >
          {confirmFresh ? "Confirm — clear the pass" : "Start fresh"}
        </button>

        <p className="t-small min-w-0 flex-1 text-ink-muted">
          {reRecording
            ? "Listening for additions. Dictate the correction into the dock — it merges into this pass."
            : issued
              ? "Anything you dictate from here is merged into this pass, not substituted for it."
              : "Dictate your story into the dock below to issue a real pass."}
        </p>
      </div>

      <ResumePaste onSubmit={handleResume} busy={printing} />

      {hydrated && <TranscriptBox transcripts={transcripts} />}
    </Screen>
  );
}

/** Live strip while the extractor is running — the ticket is being printed. */
function PrintingStrip() {
  return (
    <div className="card mb-5 flex items-center gap-4 px-5 py-3.5">
      <motion.span
        aria-hidden="true"
        className="block h-[11px] w-[11px] shrink-0 rounded-full"
        style={{ background: "var(--color-pivot)" }}
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="t-label text-ink">Printing pass</span>
      <span className="t-small min-w-0 flex-1 text-ink-muted">
        Reading the transcript, pulling out roles, skills and constraints.
      </span>
      <span className="t-mono shrink-0 text-[10px] text-ink-muted">BP1</span>
    </div>
  );
}

/** Résumé text route into the same extractor, for people who'd rather paste. */
function ResumePaste({
  onSubmit,
  busy,
}: {
  onSubmit: (text: string) => void | Promise<void>;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const ready = text.trim().length > 20 && !busy;

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
        <span className="t-label text-ink">Or paste résumé text</span>
        <span className="t-mono ml-auto shrink-0 text-[10px] text-ink-muted">
          OPTIONAL
        </span>
      </button>

      {open && (
        <div className="border-t border-paper-edge px-5 py-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            aria-label="Résumé text"
            placeholder="Paste the plain text of your résumé — bullet points are fine."
            className="t-small w-full resize-y rounded-sm border border-paper-edge bg-paper px-3 py-2 font-mono text-ink placeholder:text-ink-faint focus-visible:border-pivot focus-visible:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn"
              disabled={!ready}
              onClick={() => {
                void onSubmit(text.trim());
                setText("");
              }}
            >
              {busy ? "Reading…" : "Add to pass"}
            </button>
            <span className="t-small text-ink-muted">
              Merged into your pass alongside anything you said out loud.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
