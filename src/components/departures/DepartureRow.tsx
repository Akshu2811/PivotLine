"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { type ApplicationRecord, daysSince, STATUS_COLOR } from "@/lib/applications";
import { SplitFlapRow } from "./SplitFlapRow";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Nothing to subscribe to — the snapshot itself is what differs between
 *  the server's render and the client's. */
function neverChanges() {
  return () => {};
}

/**
 * Days-since reads the wall clock, so it can't be computed during the
 * server/build render pass — same reason `TopStrip`'s clock waits for the
 * client. `getServerSnapshot` returns null there; the real figure only
 * reads `Date.now()` once React is running on the client, and flips in like
 * any other flap update.
 */
function useDaysSince(iso: string): number | null {
  return useSyncExternalStore(
    neverChanges,
    () => daysSince(iso),
    () => null,
  );
}

export function DepartureRow({
  app,
  cols,
  sizes,
}: {
  app: ApplicationRecord;
  cols: { company: number; role: number; status: number; days: number };
  sizes: { company: number; role: number; status: number; days: number };
}) {
  const days = useDaysSince(app.appliedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-center gap-[2px]"
    >
      <SplitFlapRow value={app.company} length={cols.company} size={sizes.company} />
      <SplitFlapRow value={app.role} length={cols.role} size={sizes.role} />
      <SplitFlapRow
        value={app.status}
        length={cols.status}
        defaultColor={STATUS_COLOR[app.status]}
        size={sizes.status}
      />
      <SplitFlapRow
        value={days === null ? "--" : `${days}D`}
        length={cols.days}
        align="right"
        size={sizes.days}
      />
    </motion.div>
  );
}
