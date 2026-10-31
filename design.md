# PivotLine — Design System

PivotLine is a **printed railway timetable** that happens to be software. Every
screen should feel like it was set in a print shop in 1974 and then wired up to a
live departure board.

## What this is not

These are hard rules, not preferences. Breaking one is a bug.

- **No purple or blue gradients.** No gradients at all as decoration. The only
  acceptable gradient is a fade-to-transparent mask (e.g. a scroll edge).
- **No glass / frosted / blurred translucent cards.** Surfaces are opaque paper.
- **No centered hero with a glowing CTA button.** Content starts top-left, like a
  printed page.
- **No emoji.** Anywhere. Iconography is drawn: dots, rules, chevrons, SVG glyphs.
- **No soft drop shadows.** Depth comes from **hairline rules** and **flat offset
  blocks**, never `box-shadow: 0 4px 20px rgba(0,0,0,.1)`.
- **No large rounded corners.** Radius is 0–3px. Dots and the train marker are the
  only perfect circles.
- **No line color as a page background.** The four transit colors are reserved for
  lines, dots, badges, and 1–2px rules. A whole panel is never signal orange.

---

## Color

### Paper (surfaces)

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | `#F4F1E9` | App background. Warm off-white, slightly yellow. |
| `--paper-raised` | `#FAF8F2` | Cards, panels sitting on paper. |
| `--paper-sunken` | `#E9E4D7` | Wells, inactive track, input troughs. |
| `--paper-edge` | `#DED7C6` | Hairline rules, card borders, table dividers. |
| `--rule` | `#CFC7B2` | Timetable rule lines (the thin printed lines). |

### Ink (text)

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#17150F` | Headings, primary text. Near-black, warm. |
| `--ink-soft` | `#4A443A` | Body text on paper. |
| `--ink-muted` | `#7A7263` | Labels, captions, metadata. |
| `--ink-faint` | `#A79E8C` | Placeholders, disabled, empty-state hints. |

### Dark panels

Used for the station clock, the departure board, and the voice dock. Near-black
with **warm amber** text — split-flap / CRT, not neon.

| Token | Hex | Use |
| --- | --- | --- |
| `--panel` | `#141210` | Dark panel background. |
| `--panel-raised` | `#1F1C18` | Flap tiles, dock inner surface. |
| `--panel-edge` | `#302B24` | Divisions inside dark panels. |
| `--amber` | `#F0B429` | Primary text on dark panels. |
| `--amber-dim` | `#8A6A24` | Secondary / unlit characters on dark panels. |

### Transit lines

Four lines, one per domain. **Lines, dots, and badges only.**

| Token | Hex | Line | Domain |
| --- | --- | --- | --- |
| `--line-pivot` | `#E2541C` | Signal Orange | The main pivot line — the user's route |
| `--line-learn` | `#11766F` | Teal | Timetable / learning plan |
| `--line-build` | `#C2156A` | Magenta | Project Depot |
| `--line-talk` | `#D4A017` | Mustard | Interview Booth |

Semantic status reuses the line palette so nothing new enters the system:
`--line-learn` for on-time/good, `--line-pivot` for delayed/attention,
`--line-talk` for scheduled/pending.

---

## Type

Three families, loaded via `next/font/google`.

| Token | Family | Role |
| --- | --- | --- |
| `--font-display` | **Instrument Serif** | Big headings. Station names. Route names. |
| `--font-sans` | **Inter Tight** | Body, UI, labels, buttons. |
| `--font-mono` | **JetBrains Mono** | Numbers, clock times, platform codes, IDs, durations. |

### Scale

| Class | Size / line | Font | Notes |
| --- | --- | --- | --- |
| `.t-display` | 56/0.95 | display | Screen title. `-0.02em`. Phone: 38px. |
| `.t-h2` | 30/1.1 | display | Section heading. |
| `.t-h3` | 17/1.3 | sans, 600 | Card heading. |
| `.t-body` | 15/1.55 | sans | Paragraphs. |
| `.t-small` | 13/1.45 | sans | Secondary. |
| `.t-label` | 11/1 | sans, 600, `0.14em` uppercase | Field labels, rail headers, badges. |
| `.t-mono` | 13/1 | mono, `0.02em` | Times, codes, counts. |
| `.t-mono-lg` | 26/1 | mono, 500, `-0.01em` | Station clock. `tnum` on. |

All mono runs use `font-variant-numeric: tabular-nums` so digits don't jitter as
the clock ticks.

---

## Space, line & shape

- **Grid:** 4px base. Spacing steps 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Radius:** `--r-sm: 2px`, `--r-md: 3px`. Nothing larger. Dots are `9999px`.
- **Hairline:** `1px solid var(--paper-edge)`. The default separator everywhere.
- **Track width:** 4px for a line on a diagram, 2px for a connector, 6px for the
  active/hovered pivot line.
- **Station dot:** 11px outer, 2px ring in the line color, paper-colored core.
  Visited stations fill solid. The train marker is a 13px solid pivot-orange dot
  with a 3px paper ring.
- **Depth:** hairline rules first; if a surface must lift, use a 3px flat offset
  block of `--ink` at 8% opacity (hard-edged, no blur).

## Layout

- **Left rail:** 232px fixed on ≥1024px. Becomes a horizontal scrolling station
  strip at the top on narrow screens.
- **Top strip:** 64px. Station clock on the left, route on the right.
- **Voice dock:** fixed to the bottom, 132px tall on laptop / 120px on phone. Page
  content gets matching bottom padding so nothing is ever covered.
- **Content column:** max 1100px, left-aligned, 40px gutters (20px on phone).
- **Breakpoint:** one real break at 1024px. Everything below is the phone layout.

## Motion

Framer Motion. Transit motion is **mechanical**: things travel along tracks, they
don't fade and float.

- **Route draw:** on navigation, an SVG line draws from the previous station dot to
  the next with `pathLength` 0→1 over 480ms, `ease: [0.16, 1, 0.3, 1]`. Incoming
  page content follows with an 8px travel along the line's axis, 320ms.
- **Flap:** departure board rows flip on the X axis, 180ms, staggered 30ms.
- **Waveform ring:** the voice dock ring pulses only while text is arriving; bars
  animate on a 900ms loop, 12 bars, staggered 60ms.
- **Durations:** 160ms (state), 320ms (enter), 480ms (route draw). Nothing longer.
- Everything respects `prefers-reduced-motion`: draws become instant, the ring
  stops animating and shows a static lit state.
