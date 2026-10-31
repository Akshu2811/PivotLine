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
| `--paper` | `#F2EEE4` | App background. Warm off-white, slightly yellow. |
| `--paper-raised` | `#FAF8F2` | Cards, panels sitting on paper. |
| `--paper-sunken` | `#E2DBC8` | Wells, inactive track, input troughs. |
| `--paper-edge` | `#C9BFA6` | Hairline rules, card borders, table dividers. |
| `--rule` | `#B3A888` | Timetable rule lines (the thin printed lines). |

### Ink (text)

Deliberately heavier than a typical web ramp. This is **printed ink on paper**:
even metadata holds its weight instead of greying out. `--ink-faint` is reserved
for genuinely inert text — placeholders and disabled controls. Anything a user is
meant to *read* uses `--ink-muted` or darker.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#0D0B07` | Headings, primary text. Near-black, warm. |
| `--ink-soft` | `#312C22` | Body text on paper. |
| `--ink-muted` | `#554D3E` | Labels, captions, metadata. |
| `--ink-faint` | `#7D7461` | Placeholders and disabled controls only. |

### Paper texture

Two stacked layers, both so low-contrast they read as stock rather than pattern.
Neither is a gradient.

- **`.paper-grain`** — applied once, on the shell root. Desaturated SVG
  `feTurbulence` fractal noise tiled at 180px and composited with
  `background-blend-mode: multiply` over `--paper`, so it can only ever *darken*
  the stock and never introduces a grey cast. Every surface above it is either
  transparent (rails, top strip) or an intentionally opaque card.
- **`.paper-grid`** — applied to the page content column. Two 32px hairline
  grids at 3.5% ink, the printed tooth over the fibre.

### Dark panels

Used for the station clock, the departure board, and the voice dock. Near-black
with **warm amber** text — split-flap / CRT, not neon.

| Token | Hex | Use |
| --- | --- | --- |
| `--panel` | `#141210` | Dark panel background. |
| `--panel-raised` | `#1F1C18` | Flap tiles, dock inner surface. |
| `--panel-edge` | `#302B24` | Divisions inside dark panels. |
| `--amber` | `#F0B429` | Primary text on dark panels. |
| `--amber-dim` | `#C49A3D` | Secondary / unlit characters on dark panels. |

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
| `--font-display` | **Instrument Serif** (roman + italic) | Big headings. Station names. Route names. The italic is load-bearing — see `.t-accent`. |
| `--font-sans` | **Bricolage Grotesque** | Body, UI, labels, buttons. Chosen over a neutral grotesque for its slightly irregular, cut-by-hand feel — closer to type set in a print shop than to a UI font. |
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
| `.t-accent` | 1.22em | display **italic** | One word per screen description. |
| `.platform-ghost` | 104px / 152px | mono, stroke only | Platform code behind a screen title. |

All mono runs use `font-variant-numeric: tabular-nums` so digits don't jitter as
the clock ticks.

### Accent word

**Every screen's description sets exactly one word in `.t-accent`** — Instrument
Serif italic at 1.22em, in full `--ink`. It is the one place a serif appears in
running text, and it gives each screen a word that carries the argument
("artefacts", "evidence", "genuinely").

The marker lives in the copy, not the markup: screen intros are plain strings
with one word wrapped in asterisks (`…proves *artefacts* do`), and `Screen`'s
`Intro` splits on that. Emphasis stays next to the sentence it belongs to.

### Platform ghost

Behind each screen title, the platform code (`LN2`, `TT3`) is printed in huge
**outlined** mono — `color: transparent` plus a 1.5px `-webkit-text-stroke` of
ink at 13% — the way it is stencilled on a real platform wall. Stroke only: a
filled numeral at that size fights the headline. It is vertically centred on the
title and bleeds slightly past the left gutter, and it is `aria-hidden`.

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
- **Depth:** hairline rules first; if a surface must lift, use a 4px flat offset
  block of `--ink` at 16% opacity (hard-edged, no blur).
- **Header rule:** every screen closes its header with a 5px stub in that
  screen's line colour running into a 2px `--rule` hairline.

## Layout

- **Left rail:** 232px fixed on ≥1024px. Becomes a horizontal scrolling station
  strip at the top on narrow screens.
- **Top strip:** 64px. Station clock on the left, route on the right.
- **Voice dock:** fixed to the bottom, 150px tall on laptop / 146px on phone. Page
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
- **Empty-state train:** the dashed "no service" track in every empty state
  carries one 9px solid dot in the line colour, creeping from the first station
  to the last on a 9s linear loop. The one deliberately slow motion in the
  system — the screen should read as *waiting for service*, not as dead. Linear,
  never eased: a train at constant speed, not a UI element animating in.
- **Durations:** 160ms (state), 320ms (enter), 480ms (route draw). Nothing longer,
  with the empty-state train as the single, explicit exception.
- Everything respects `prefers-reduced-motion`: draws become instant, the ring
  stops animating and shows a static lit state.
