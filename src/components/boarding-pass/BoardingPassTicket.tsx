"use client";

import { motion } from "framer-motion";
import {
  type CareerProfile,
  roleCode,
  ticketNumber,
  topSkills,
} from "@/lib/profile";
import { LINE_COLOR } from "@/lib/stations";
import { EditableField } from "./EditableField";

const PIVOT = LINE_COLOR.pivot;
const EASE = [0.16, 1, 0.3, 1] as const;

export type TicketHandlers = {
  patchProfile: (patch: Partial<CareerProfile>) => void;
  patchConstraints: (patch: Partial<CareerProfile["constraints"]>) => void;
  patchSkill: (index: number, patch: Partial<CareerProfile["skills"][number]>) => void;
};

/**
 * The boarding pass. Two panels divided by a perforation: the ticket proper
 * (route, seat, gate) and a tear-off stub listing the top five skills.
 *
 * It prints in — the card is revealed top-down behind a travelling scan line,
 * the way a thermal printer feeds a ticket out of a slot. Every printed value
 * is an EditableField, so the user can correct whatever the AI misheard.
 */
export function BoardingPassTicket({
  profile,
  demo,
  handlers,
  /** Changes on every re-issue so the print animation replays on a merge. */
  printKey,
}: {
  profile: CareerProfile;
  demo: boolean;
  handlers: TicketHandlers;
  printKey: number;
}) {
  const { patchProfile, patchConstraints, patchSkill } = handlers;
  const skills = topSkills(profile);
  const hours = profile.constraints.hoursPerWeek;

  const num = (next: string | null) => {
    if (next === null) return null;
    const parsed = Number.parseFloat(next.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  return (
    <section aria-label="Boarding pass" className="relative">
      {/* Printer slot: the ticket emerges from under this lip. */}
      <div className="flex items-end gap-3 pb-2">
        <span className="t-label text-ink-muted">
          {demo ? "Demo pass · platform BP1" : "Issued · platform BP1"}
        </span>
        <span className="mb-[5px] block h-[2px] flex-1 bg-rule" />
        <span className="t-mono text-[10px] text-ink-muted">{ticketNumber(profile)}</span>
      </div>

      <motion.div
        key={printKey}
        initial={{ clipPath: "inset(0 0 100% 0)", y: -10 }}
        animate={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
        transition={{ duration: 0.85, ease: EASE }}
        className="card card-offset relative overflow-hidden"
      >
        {/* The scan line, riding down the page as it prints. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-30 block h-[3px]"
          style={{ background: PIVOT }}
          initial={{ top: 0, opacity: 0.9 }}
          animate={{ top: ["0%", "100%"], opacity: [0.9, 0.9, 0] }}
          transition={{ duration: 0.85, ease: EASE, times: [0, 0.85, 1] }}
        />

        <div className="flex flex-col lg:flex-row">
          {/* ── Ticket proper ─────────────────────────────────────────── */}
          <div className="min-w-0 flex-1">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-paper-edge bg-paper-sunken px-6 py-3.5">
              <span className="t-label text-ink">Pivotline</span>
              <span className="t-mono text-[10px] text-ink-muted">BOARDING PASS</span>
              {demo && (
                <span
                  className="badge ml-auto"
                  style={{ background: PIVOT, color: "#FAF8F2" }}
                >
                  Sample
                </span>
              )}
            </header>

            <div className="px-6 py-6 lg:px-8 lg:py-7">
              <Field label="Passenger">
                <EditableField
                  label="Passenger name"
                  value={profile.name}
                  placeholder="Unnamed traveller"
                  onSave={(next) => patchProfile({ name: next })}
                  className="t-h2 text-ink"
                />
              </Field>

              {/* Route: current role → target role, printed as a line. */}
              <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-start gap-3 lg:gap-6">
                <Endpoint
                  slot="From"
                  code={roleCode(profile.currentRole)}
                  role={profile.currentRole}
                  placeholder="Current role"
                  onSave={(next) => patchProfile({ currentRole: next })}
                />

                <div className="flex flex-col items-center pt-[26px]">
                  <div className="flex w-full min-w-[44px] items-center lg:min-w-[120px]">
                    <span
                      className="block h-[9px] w-[9px] shrink-0 rounded-full"
                      style={{ background: PIVOT }}
                    />
                    <span
                      className="block h-[3px] min-w-0 flex-1"
                      style={{ background: PIVOT }}
                    />
                    <span
                      className="block h-[9px] w-[9px] shrink-0 rounded-full border-2 bg-paper-raised"
                      style={{ borderColor: PIVOT }}
                    />
                  </div>
                  <span className="t-mono mt-2 text-[9px] text-ink-muted">PIVOT</span>
                </div>

                <Endpoint
                  slot="To"
                  code={roleCode(profile.targetRole)}
                  role={profile.targetRole}
                  placeholder="Destination unknown"
                  align="right"
                  onSave={(next) => patchProfile({ targetRole: next })}
                />
              </div>

              {/* Seat / gate / experience, as printed on a real pass. */}
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t-2 border-ink pt-5 lg:grid-cols-4">
                <Field label="Seat · seniority">
                  <EditableField
                    label="Seniority"
                    value={profile.seniority}
                    placeholder="—"
                    onSave={(next) => patchProfile({ seniority: next })}
                    className="t-mono-lg text-ink"
                  />
                </Field>

                <Field label="Gate · hrs / week">
                  <EditableField
                    label="Hours available per week"
                    value={hours === null ? null : `H${hours}`}
                    placeholder="—"
                    numeric
                    onSave={(next) => patchConstraints({ hoursPerWeek: num(next) })}
                    className="t-mono-lg text-ink"
                  />
                </Field>

                <Field label="Experience">
                  <EditableField
                    label="Years of experience"
                    value={profile.yearsExperience === null ? null : `${profile.yearsExperience} yr`}
                    placeholder="—"
                    numeric
                    onSave={(next) => patchProfile({ yearsExperience: num(next) })}
                    className="t-mono-lg text-ink"
                  />
                </Field>

                <Field label="Work mode">
                  <EditableField
                    label="Work mode"
                    value={profile.constraints.workMode}
                    placeholder="Any"
                    onSave={(next) => patchConstraints({ workMode: next })}
                    className="font-mono text-[15px] leading-tight text-ink"
                  />
                </Field>
              </div>

              <div className="mt-6 grid gap-5 border-t border-paper-edge pt-5 lg:grid-cols-2">
                <Field label="Target window">
                  <EditableField
                    label="Timeline"
                    value={profile.constraints.timeline}
                    placeholder="No deadline given"
                    onSave={(next) => patchConstraints({ timeline: next })}
                    className="t-body text-ink"
                  />
                </Field>

                <Field label="Other constraints">
                  <EditableField
                    label="Other constraints"
                    value={profile.constraints.other.join("; ")}
                    placeholder="None recorded"
                    multiline
                    onSave={(next) =>
                      patchConstraints({
                        other: next
                          ? next.split(";").map((s) => s.trim()).filter(Boolean)
                          : [],
                      })
                    }
                    className="t-body text-ink"
                  />
                </Field>
              </div>

              {profile.notableProjects.length > 0 && (
                <div className="mt-6 border-t border-paper-edge pt-5">
                  <div className="t-label text-ink-muted">Notable work</div>
                  <ul className="mt-3 space-y-0">
                    {profile.notableProjects.map((project, i) => (
                      <li
                        key={`${project.name}-${i}`}
                        className="border-b border-paper-edge py-3 last:border-b-0"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="t-h3 text-ink">{project.name}</span>
                          {project.demonstrates.map((d) => (
                            <span
                              key={d}
                              className="t-mono text-[10px] text-ink-muted"
                            >
                              {d.toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <p className="t-small mt-1.5 max-w-[68ch] text-pretty text-ink-soft">
                          {project.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Barcode: fixed widths, so it is identical on server and client. */}
            <div className="flex items-end gap-[3px] border-t border-paper-edge bg-paper-sunken px-6 py-4">
              {BARS.map((w, i) => (
                <span
                  key={i}
                  className="block h-[26px] bg-ink"
                  style={{ width: w, opacity: i % 3 === 0 ? 1 : 0.72 }}
                />
              ))}
              <span className="t-mono ml-auto text-[10px] text-ink-muted">
                {roleCode(profile.currentRole)} → {roleCode(profile.targetRole)}
              </span>
            </div>
          </div>

          {/* ── Perforation + stub ────────────────────────────────────── */}
          <div className="perf lg:hidden" />
          <div
            className="hidden w-0 shrink-0 border-l border-dashed lg:block"
            style={{ borderColor: "var(--color-rule)" }}
          />

          {/* Column, so the stub's footer sits on its bottom edge rather than
              leaving the tail of a tall ticket blank. */}
          <div className="flex shrink-0 flex-col bg-paper-raised lg:w-[292px]">
            <header className="flex items-center justify-between gap-3 border-b border-paper-edge bg-paper-sunken px-6 py-3.5">
              <span className="t-label text-ink">Skills stub</span>
              <span className="t-mono text-[10px] text-ink-muted">TOP 05</span>
            </header>

            <ul className="px-6 py-4">
              {skills.map((skill, i) => (
                <motion.li
                  key={`${skill.name}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.5 + i * 0.07 }}
                  className="border-b border-paper-edge py-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <EditableField
                      label={`Skill ${i + 1} name`}
                      value={skill.name}
                      onSave={(next) => patchSkill(i, { name: next ?? skill.name })}
                      className="t-h3 min-w-0 text-ink"
                    />
                    <Pips
                      value={skill.proficiency}
                      onChange={(next) => patchSkill(i, { proficiency: next })}
                      name={skill.name}
                    />
                  </div>
                  <EditableField
                    label={`Evidence for ${skill.name}`}
                    value={skill.evidence}
                    placeholder="No evidence recorded"
                    multiline
                    onSave={(next) => patchSkill(i, { evidence: next ?? "" })}
                    className="t-small mt-1.5 text-ink-muted"
                  />
                </motion.li>
              ))}

              {skills.length === 0 && (
                <li className="t-small py-3 text-ink-muted">
                  No skills extracted yet.
                </li>
              )}
            </ul>

            <div className="t-mono mt-auto flex items-center justify-between gap-3 border-t border-paper-edge bg-paper-sunken px-6 py-3 text-[10px] text-ink-muted">
              <span>
                {profile.skills.length > skills.length
                  ? `+${profile.skills.length - skills.length} MORE ON THE LINE`
                  : "ALL SKILLS SHOWN"}
              </span>
              <span>{ticketNumber(profile)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="t-small mt-3 text-ink-muted">
        Click any field to correct it — edits save straight to this browser.
      </p>
    </section>
  );
}

/** Deterministic barcode widths. */
const BARS = [3, 1, 2, 5, 1, 3, 1, 1, 4, 2, 1, 3, 5, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 5, 2, 1, 3];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="t-label pb-1.5 text-ink-muted">{label}</div>
      {children}
    </div>
  );
}

/** One end of the route: a three-letter code over the editable role title. */
function Endpoint({
  slot,
  code,
  role,
  placeholder,
  onSave,
  align = "left",
}: {
  slot: string;
  code: string;
  role: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
  align?: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <div className="t-label pb-1 text-ink-muted">{slot}</div>
      <div className="font-mono text-[34px] leading-none font-medium tracking-tight text-ink lg:text-[44px]">
        {code}
      </div>
      <div className={right ? "[&_button]:text-right" : ""}>
        <EditableField
          label={`${slot} role`}
          value={role}
          placeholder={placeholder}
          onSave={onSave}
          className="t-body mt-2 text-ink"
        />
      </div>
    </div>
  );
}

/** Proficiency 1-5. Each pip is a button, so the rating is editable too. */
function Pips({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (next: number) => void;
  name: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-[3px] pt-[3px]"
      role="group"
      aria-label={`${name} proficiency: ${value} of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          title={`Set ${name} to ${n} of 5`}
          aria-label={`Set ${name} proficiency to ${n}`}
          className="block h-[11px] w-[6px] cursor-pointer border transition-colors"
          style={{
            background: n <= value ? PIVOT : "transparent",
            borderColor: n <= value ? PIVOT : "var(--color-paper-edge)",
          }}
        />
      ))}
    </div>
  );
}
