"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * The voice dock is one fixed component at the bottom of every screen, but the
 * text it captures belongs to whichever screen is mounted. Each screen calls
 * `useVoiceHandler` to register a submit handler; the dock reads the currently
 * registered one. Only one screen is mounted at a time, so last-registration
 * wins and unmount clears it.
 */

export type VoiceHandler = (text: string) => void | Promise<void>;

type DockState = {
  /** Live text in the dock textarea. */
  draft: string;
  /** True while characters are arriving (dictation in flight) — drives the ring. */
  receiving: boolean;
  /** True while the screen's handler is running. */
  submitting: boolean;
  /** Handler registered by the mounted screen, if any. */
  handler: VoiceHandler | null;
  /** Owner key, so a late unmount can't clear a newer screen's handler. */
  handlerKey: string | null;
  /**
   * A question the current screen is asking. When set it takes over the dock's
   * label and placeholder — this is how the app asks for a missing fact
   * (e.g. the target role) instead of guessing one.
   */
  prompt: string | null;

  setDraft: (text: string) => void;
  setReceiving: (receiving: boolean) => void;
  setPrompt: (prompt: string | null) => void;
  registerHandler: (key: string, handler: VoiceHandler) => void;
  unregisterHandler: (key: string) => void;
  submit: () => Promise<void>;
};

export const useVoiceDock = create<DockState>((set, get) => ({
  draft: "",
  receiving: false,
  submitting: false,
  handler: null,
  handlerKey: null,
  prompt: null,

  setDraft: (draft) => set({ draft }),
  setReceiving: (receiving) => set({ receiving }),
  setPrompt: (prompt) => set({ prompt }),

  registerHandler: (handlerKey, handler) => set({ handler, handlerKey }),

  unregisterHandler: (key) =>
    set((s) => (s.handlerKey === key ? { handler: null, handlerKey: null } : s)),

  submit: async () => {
    const { draft, handler, submitting } = get();
    const text = draft.trim();
    if (!text || submitting) return;
    set({ submitting: true });
    try {
      await handler?.(text);
      set({ draft: "", receiving: false });
    } finally {
      set({ submitting: false });
    }
  },
}));

/**
 * Register this screen as the owner of the voice dock. `key` should be stable
 * per screen (the route path). The handler is kept in a ref-like effect so a
 * changing closure doesn't need to re-register.
 */
export function useVoiceHandler(key: string, handler: VoiceHandler) {
  useEffect(() => {
    useVoiceDock.getState().registerHandler(key, handler);
    return () => useVoiceDock.getState().unregisterHandler(key);
  }, [key, handler]);
}

/**
 * Dictation tools (Wispr Flow) insert text into the textarea in bursts. We treat
 * any growth in length as "receiving" and let it decay after a short quiet gap,
 * which is what the waveform ring reacts to.
 */
export function useReceivingDetector(draft: string) {
  useEffect(() => {
    if (!draft) {
      useVoiceDock.getState().setReceiving(false);
      return;
    }
    useVoiceDock.getState().setReceiving(true);
    const t = setTimeout(() => useVoiceDock.getState().setReceiving(false), 700);
    return () => clearTimeout(t);
  }, [draft]);
}
