"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { stationFor } from "@/lib/stations";
import { useReceivingDetector, useVoiceDock } from "@/lib/store/voiceDock";
import { WaveformRing } from "./WaveformRing";

/**
 * One dock, every screen. The textarea is where the user dictates (Wispr Flow
 * types into it); Send routes the text to the handler the current screen
 * registered via `useVoiceHandler`.
 *
 * Laptop lays it out in three columns — ring, field, send. Phone can't afford
 * that: the ring and the send button share one compact header row and the
 * field takes the rest, so the textarea never collapses to a sliver.
 */
export function VoiceDock() {
  const pathname = usePathname();
  const station = stationFor(pathname);

  const draft = useVoiceDock((s) => s.draft);
  const setDraft = useVoiceDock((s) => s.setDraft);
  const receiving = useVoiceDock((s) => s.receiving);
  const submitting = useVoiceDock((s) => s.submitting);
  const hasHandler = useVoiceDock((s) => s.handler !== null);
  const submit = useVoiceDock((s) => s.submit);

  useReceivingDetector(draft);

  // Clear the draft when the user walks to another station, so dictation never
  // lands on the wrong screen's handler.
  useEffect(() => {
    useVoiceDock.getState().setDraft("");
  }, [pathname]);

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const canSend = words > 0 && !submitting;
  const status = submitting ? "SENDING" : receiving ? "LIVE" : "READY";

  const sendButton = (
    <button
      type="button"
      onClick={() => void submit()}
      disabled={!canSend}
      className="flex h-[40px] shrink-0 items-center gap-2 rounded-sm border px-4 transition-colors disabled:cursor-not-allowed"
      style={{
        borderColor: canSend ? "var(--color-pivot)" : "var(--color-panel-edge)",
        background: canSend ? "var(--color-pivot)" : "transparent",
        color: canSend ? "#FAF8F2" : "var(--color-amber-dim)",
      }}
    >
      <span className="t-label">{submitting ? "Sending" : "Send"}</span>
      <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
        <path
          d="M0 5h13M9.5 1.5 13 5l-3.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );

  return (
    <div
      className="fixed right-0 bottom-0 left-0 z-30 lg:left-[232px]"
      style={{ height: "var(--dock-h)" }}
    >
      <div className="h-full border-t border-panel-edge bg-panel px-5 pt-3 pb-4 lg:px-10 lg:pt-4 lg:pb-5">
        <div className="mx-auto flex h-full max-w-[1100px] flex-col gap-2 lg:flex-row lg:gap-5">
          {/* Header row on phone; left column on laptop. */}
          <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:justify-center lg:gap-2">
            <WaveformRing active={receiving || submitting} />
            <span className="t-mono shrink-0 text-[9px] text-amber-dim">{status}</span>
            <span className="t-label ml-auto truncate text-amber lg:hidden">
              {station.code} · Voice in
            </span>
            <span className="lg:hidden">{sendButton}</span>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="hidden items-baseline justify-between gap-3 pb-1.5 lg:flex">
              <span className="t-label truncate text-amber">
                {station.code} · Voice in
              </span>
              <span className="t-mono shrink-0 text-[10px] text-amber-dim">
                {words} {words === 1 ? "WORD" : "WORDS"}
              </span>
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={station.dockHint}
              spellCheck={false}
              aria-label={`Dictate for ${station.name}`}
              className="min-h-0 flex-1 resize-none rounded-sm border border-panel-edge bg-panel-raised px-3 py-2 text-[14px] leading-[1.45] text-[#F3EEE2] placeholder:text-amber-dim focus-visible:border-amber focus-visible:outline-none"
            />
          </div>

          <div className="hidden shrink-0 flex-col items-stretch justify-end gap-2 lg:flex">
            {sendButton}
            <span className="t-mono text-center text-[9px] text-amber-dim">
              {hasHandler ? "⌘↵" : "NO HANDLER"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
