"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ApplicationRecord, daysSince, STATUS_COLOR } from "@/lib/applications";
import { SplitFlapRow } from "./SplitFlapRow";

const EASE = [0.16, 1, 0.3, 1] as const;

const COLS = {
  company: 13,
  role: 27,
  status: 9,
  days: 4,
};

/** Role titles run long, so that column uses a smaller font to fit more
 *  characters without the board getting any wider overall. */
const SIZES = {
  company: 15,
  role: 12,
  status: 15,
  days: 15,
};

/**
 * The mechanical board itself: one flap row per application, newest first.
 * The status column flips to a color per status; everything else stays the
 * dim amber the rest of the board reads in.
 */
export function DepartureBoard({ applications }: { applications: ApplicationRecord[] }) {
  const rows = [...applications].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  return (
    <section className="overflow-hidden rounded-sm border border-panel-edge bg-panel">
      <header className="flex items-center gap-3 border-b border-panel-edge px-5 py-3">
        <span className="t-label text-amber">Departure board</span>
        <span className="t-mono ml-auto text-[10px] text-amber-dim">
          {String(rows.length).padStart(2, "0")} FILED
        </span>
      </header>

      <div className="overflow-x-auto px-5 py-4">
        <div className="inline-flex min-w-full flex-col gap-3">
          <div className="flex items-center gap-[2px]">
            <SplitFlapRow value="COMPANY" length={COLS.company} size={SIZES.company} />
            <SplitFlapRow value="ROLE" length={COLS.role} size={SIZES.role} />
            <SplitFlapRow value="STATUS" length={COLS.status} size={SIZES.status} />
            <SplitFlapRow value="DAYS" length={COLS.days} align="right" size={SIZES.days} />
          </div>

          <AnimatePresence initial={false}>
            {rows.map((app) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex items-center gap-[2px]"
              >
                <SplitFlapRow value={app.company} length={COLS.company} size={SIZES.company} />
                <SplitFlapRow value={app.role} length={COLS.role} size={SIZES.role} />
                <SplitFlapRow
                  value={app.status}
                  length={COLS.status}
                  defaultColor={STATUS_COLOR[app.status]}
                  size={SIZES.status}
                />
                <SplitFlapRow
                  value={`${daysSince(app.appliedAt)}D`}
                  length={COLS.days}
                  align="right"
                  size={SIZES.days}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
