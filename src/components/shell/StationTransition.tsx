"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LINE_COLOR, stationFor, stationIndex } from "@/lib/stations";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Page transition: a line draws from the station you left to the station you
 * arrived at, and the page content travels in along that line's axis. Forward
 * moves draw left-to-right, back-navigation draws right-to-left.
 */
export function StationTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const index = stationIndex(pathname);
  const station = stationFor(pathname);
  const color = LINE_COLOR[station.line];

  // Direction of travel, derived from the station we came from. Held in state
  // and adjusted during render (rather than read from a ref) so the value is
  // correct on the very first render of the new page, not one frame late.
  const [nav, setNav] = useState({ index, forward: true });
  const forward = nav.index === index ? nav.forward : index >= nav.index;
  if (nav.index !== index) setNav({ index, forward });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} className="flex min-h-0 flex-1 flex-col">
          {/* The drawing line. Sits on the content's top edge, over the rule. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[4px]"
            aria-hidden="true"
          >
            <motion.div
              className="h-full origin-left"
              style={{ background: color, transformOrigin: forward ? "left" : "right" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 1, 0] }}
              transition={{
                duration: 0.78,
                times: [0, 0.55, 0.72, 1],
                ease: EASE,
              }}
            />
          </div>

          {/* Travelling station dot, riding the line it just drew. */}
          <motion.div
            className="pointer-events-none absolute top-[-4.5px] z-20 h-[13px] w-[13px] rounded-full"
            aria-hidden="true"
            style={{ background: color, boxShadow: "0 0 0 3px var(--color-paper)" }}
            initial={{ left: forward ? "0%" : "100%", opacity: 0 }}
            animate={{
              left: forward ? ["0%", "100%"] : ["100%", "0%"],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 0.6, ease: EASE, times: [0, 1] }}
          />

          <motion.div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            initial={{ opacity: 0, x: forward ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.34, ease: EASE, delay: 0.1 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
