import type { Cell, GateBlocker, GateResult } from "@/lib/types";
import { GATE_CHECKS } from "@/lib/config/seoCritical";

/**
 * Deterministic, client-side pre-publish gate. Pure function over the draft cell's
 * editor fields — no network, no LLM. `blockers` are the failed checks; status is
 * red if any critical fails, amber if only improvements fail, else green.
 */
export function evaluateGate(cell: Cell): GateResult {
  const blockers: GateBlocker[] = GATE_CHECKS.filter(
    (chk) => !chk.test(cell),
  ).map((chk) => ({ id: chk.id, label: chk.label, severity: chk.severity }));

  const status = blockers.some((b) => b.severity === "critical")
    ? "red"
    : blockers.length > 0
      ? "amber"
      : "green";

  return { status, blockers };
}

/** Critical blockers only (the ones that actually block publishing). */
export function criticalBlockers(cell: Cell): GateBlocker[] {
  return evaluateGate(cell).blockers.filter((b) => b.severity === "critical");
}

/** Whether the cell may publish: no open critical SEO blockers. */
export function canPublish(cell: Cell): boolean {
  return criticalBlockers(cell).length === 0;
}
