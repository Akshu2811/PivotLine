"use client";

import { motion } from "framer-motion";
import { type CheckInProposal, isEmptyProposal } from "@/lib/checkIn";
import type { LearningPlan } from "@/lib/plan";
import { LINE_COLOR } from "@/lib/stations";

const LEARN = LINE_COLOR.learn;
const PIVOT = LINE_COLOR.pivot;
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The amendment notice: what a check-in proposes to change, shown as a diff
 * before anything moves. The plan is the user's, so a model's reading of a
 * spoken week is a suggestion to approve, never an edit that just happens.
 */
export function CheckInDiff({
  proposal,
  plan,
  onAccept,
  onReject,
  busy,
}: {
  proposal: CheckInProposal;
  plan: LearningPlan;
  onAccept: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const taskText = (taskId: string) =>
    plan.weeks.flatMap((w) => w.tasks).find((t) => t.id === taskId)?.text ?? taskId;

  const nothing = isEmptyProposal(proposal);

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="card card-offset mt-5 overflow-hidden"
      style={{ borderLeft: `4px solid ${PIVOT}` }}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-paper-edge bg-paper-sunken px-5 py-3.5">
        <span className="t-label text-ink">Amendment proposed</span>
        <span className="t-mono text-[10px] text-ink-muted">AWAITING YOUR APPROVAL</span>
      </header>

      <div className="px-5 py-4">
        <p className="t-body text-pretty text-ink">{proposal.summary}</p>
      </div>

      {nothing ? (
        <p className="t-small border-t border-paper-edge px-5 py-4 text-ink-muted">
          Nothing in that check-in changes the plan. Accepting just logs the week.
        </p>
      ) : (
        <div className="border-t border-paper-edge">
          {proposal.stationMoves.length > 0 && (
            <Group title="Stations moving">
              {proposal.stationMoves.map((m) => (
                <Row
                  key={m.stationName}
                  mark="move"
                  head={`${m.stationName} → ${m.to === "have" ? "cleared" : "partial"}`}
                  note={m.reason}
                />
              ))}
            </Group>
          )}

          {proposal.taskMoves.length > 0 && (
            <Group title="Work marked off">
              {proposal.taskMoves.map((m) => (
                <Row
                  key={m.taskId}
                  mark={m.to === "done" ? "done" : "partial"}
                  head={taskText(m.taskId)}
                  note={`Week ${m.weekIndex} · ${m.to === "done" ? "finished" : "part done"}`}
                />
              ))}
            </Group>
          )}

          {proposal.added.length > 0 && (
            <Group title="Added to later weeks">
              {proposal.added.map((a, i) => (
                <Row
                  key={`${a.weekIndex}-${i}`}
                  mark="add"
                  head={a.text}
                  note={`Week ${a.weekIndex} · ${a.hours}h · ${a.reason}`}
                />
              ))}
            </Group>
          )}

          {proposal.dropped.length > 0 && (
            <Group title="Dropped">
              {proposal.dropped.map((d) => (
                <Row
                  key={d.taskId}
                  mark="drop"
                  head={taskText(d.taskId)}
                  note={`Week ${d.weekIndex} · ${d.reason}`}
                  struck
                />
              ))}
            </Group>
          )}
        </div>
      )}

      <div className="border-t border-paper-edge px-5 py-4">
        <div className="t-label text-ink-muted">Why the rest of the plan changes</div>
        <p className="t-small mt-2 max-w-[70ch] text-pretty text-ink-soft">{proposal.reason}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-paper-edge bg-paper-sunken px-5 py-3.5">
        <button type="button" className="btn" onClick={onAccept} disabled={busy}>
          Accept amendment
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReject} disabled={busy}>
          Reject
        </button>
        <span className="t-small w-full text-ink-muted sm:w-auto sm:min-w-0 sm:flex-1">
          Either way the check-in is logged. Accepting also moves the stations on
          your line.
        </span>
      </div>
    </motion.section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-paper-edge px-5 py-4 last:border-b-0">
      <div className="t-label text-ink-muted">{title}</div>
      <ul className="mt-3">{children}</ul>
    </div>
  );
}

const MARKS: Record<string, { glyph: string; color: string }> = {
  add: { glyph: "+", color: LEARN },
  drop: { glyph: "−", color: PIVOT },
  done: { glyph: "✓", color: LEARN },
  partial: { glyph: "½", color: LEARN },
  move: { glyph: "→", color: PIVOT },
};

function Row({
  mark,
  head,
  note,
  struck = false,
}: {
  mark: keyof typeof MARKS | string;
  head: string;
  note: string;
  struck?: boolean;
}) {
  const m = MARKS[mark] ?? MARKS.move;
  return (
    <li className="flex items-start gap-3 border-b border-paper-edge py-2.5 last:border-b-0">
      <span
        className="t-mono mt-[1px] w-[14px] shrink-0 text-center text-[13px] font-medium"
        style={{ color: m.color }}
        aria-hidden="true"
      >
        {m.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="t-small block text-ink"
          style={{ textDecoration: struck ? "line-through" : undefined }}
        >
          {head}
        </span>
        <span className="t-small mt-0.5 block text-pretty text-ink-muted">{note}</span>
      </span>
    </li>
  );
}
