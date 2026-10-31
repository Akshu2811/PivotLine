"use client";

import { useRef, useState } from "react";

/**
 * Any printed value on the boarding pass is clickable and becomes an input in
 * place. The input inherits the field's own typography, so editing a field
 * doesn't change the layout of the ticket around it — the serif stays serif and
 * the mono stays mono, it just gains a well.
 *
 * Enter (or blur) commits, Escape cancels. Numeric fields commit null when the
 * user clears them, because "not stated" is a real value on this screen.
 */
export function EditableField({
  value,
  onSave,
  placeholder = "—",
  className = "",
  numeric = false,
  multiline = false,
  label,
}: {
  value: string | number | null;
  onSave: (next: string | null) => void;
  placeholder?: string;
  /** Typography/colour of the printed value; the editor reuses it verbatim. */
  className?: string;
  numeric?: boolean;
  multiline?: boolean;
  /** Accessible name, since the visible label is a separate printed element. */
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  /** Guards against blur firing a second commit after Enter or Escape. */
  const committed = useRef(false);

  const start = () => {
    setDraft(value === null || value === undefined ? "" : String(value));
    committed.current = false;
    setEditing(true);
  };

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const next = draft.trim();
    onSave(next === "" ? null : next);
    setEditing(false);
  };

  const cancel = () => {
    committed.current = true;
    setEditing(false);
  };

  if (editing) {
    // autoFocus (rather than a ref + effect) because the editor is mounted only
    // in response to the click that should put the caret in it.
    const shared = {
      value: draft,
      autoFocus: true,
      "aria-label": label,
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        e.currentTarget.select(),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      },
      className: `w-full rounded-sm border border-pivot bg-paper-sunken px-1.5 py-0.5 outline-none ${className}`,
    };

    return multiline ? (
      <textarea
        {...shared}
        rows={2}
        className={`w-full resize-none rounded-sm border border-pivot bg-paper-sunken px-1.5 py-0.5 outline-none ${className}`}
      />
    ) : (
      <input {...shared} type="text" inputMode={numeric ? "numeric" : "text"} />
    );
  }

  const empty = value === null || value === undefined || value === "";

  return (
    <button
      type="button"
      onClick={start}
      title="Click to edit"
      aria-label={`${label}: ${empty ? "not set" : value}. Click to edit.`}
      className={`editable block w-full cursor-text text-left ${className} ${
        empty ? "text-ink-faint" : ""
      }`}
    >
      {empty ? placeholder : value}
    </button>
  );
}
