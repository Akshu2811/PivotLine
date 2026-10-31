/**
 * The six screens of PivotLine, modelled as stations on a line. The order here
 * is the order on the left rail, and it drives the route-draw transition: the
 * line draws between the index the user left and the index they arrived at.
 */

export type LineKey = "pivot" | "learn" | "build" | "talk";

export type Station = {
  /** Route path. */
  href: string;
  /** Station name, as printed on the rail. */
  name: string;
  /** Platform-style code, set in mono on the rail. */
  code: string;
  /** Which transit line owns this station. */
  line: LineKey;
  /** Shown in the voice dock as the hint for what to dictate here. */
  dockHint: string;
};

export const STATIONS: Station[] = [
  {
    href: "/boarding-pass",
    name: "Boarding Pass",
    code: "BP1",
    line: "pivot",
    dockHint: "Tell me your career story — where you are now, where you want to go",
  },
  {
    href: "/line",
    name: "The Line",
    code: "LN2",
    line: "pivot",
    dockHint: "Paste a job description, or say which skill you just picked up",
  },
  {
    href: "/timetable",
    name: "Timetable",
    code: "TT3",
    line: "learn",
    dockHint: "Say how much time you have each week, or what you finished",
  },
  {
    href: "/project-depot",
    name: "Project Depot",
    code: "PD4",
    line: "build",
    dockHint: "Describe a project idea, or ask for one that proves a missing skill",
  },
  {
    href: "/interview-booth",
    name: "Interview Booth",
    code: "IB5",
    line: "talk",
    dockHint: "Answer the question out loud, or ask for a new one",
  },
  {
    href: "/departures",
    name: "Departures",
    code: "DP6",
    line: "talk",
    dockHint: "Say who you applied to, the role, and what happened",
  },
];

/** Tailwind-free color lookup, for SVG strokes and inline fills. */
export const LINE_COLOR: Record<LineKey, string> = {
  pivot: "#e2541c",
  learn: "#11766f",
  build: "#c2156a",
  talk: "#d4a017",
};

export const LINE_NAME: Record<LineKey, string> = {
  pivot: "Pivot Line",
  learn: "Learning Line",
  build: "Build Line",
  talk: "Interview Line",
};

/** Single word, for tight mono slots on the rail where the full name wraps. */
export const LINE_SHORT: Record<LineKey, string> = {
  pivot: "PIVOT",
  learn: "LEARN",
  build: "BUILD",
  talk: "TALK",
};

/**
 * Badge foreground. Mustard is far too light to carry paper-colored text, so
 * the talk line flips to ink instead of silently shipping 2:1 contrast.
 */
export const LINE_BADGE_TEXT: Record<LineKey, string> = {
  pivot: "#FAF8F2",
  learn: "#FAF8F2",
  build: "#FAF8F2",
  talk: "#17150F",
};

export function stationFor(pathname: string): Station {
  return (
    STATIONS.find((s) => pathname === s.href || pathname.startsWith(s.href + "/")) ??
    STATIONS[0]
  );
}

export function stationIndex(pathname: string): number {
  const i = STATIONS.findIndex(
    (s) => pathname === s.href || pathname.startsWith(s.href + "/"),
  );
  return i === -1 ? 0 : i;
}
