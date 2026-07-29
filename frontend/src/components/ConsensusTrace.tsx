import type { TxUiStatus } from "@/lib/types";

const STEPS: { statuses: TxUiStatus[]; label: string }[] = [
  { statuses: ["submitted"], label: "Plea received" },
  { statuses: ["pending", "proposing"], label: "Gremlin invoked" },
  { statuses: ["committing", "revealing"], label: "Validators judging" },
  { statuses: ["accepted", "finalized"], label: "Balance settled" },
];

const TERMINAL_ORDER: TxUiStatus[] = ["submitted", "pending", "proposing", "committing", "revealing", "accepted", "finalized"];

export function ConsensusTrace({ status, error }: { status: TxUiStatus; error: string | null }) {
  if (status === "idle") return null;

  if (status === "failed") {
    return (
      <div className="trace trace--failed">
        <span className="trace__icon">⚠</span>
        Transaction failed{error ? `: ${error}` : ""}
      </div>
    );
  }

  if (status === "undetermined") {
    return (
      <div className="trace trace--warn">
        <span className="trace__icon">◌</span>
        Validators could not reach consensus. The Gremlin got confused. Try rephrasing.
      </div>
    );
  }

  if (status === "canceled") {
    return (
      <div className="trace trace--warn">
        <span className="trace__icon">◌</span>
        Transaction was canceled.
      </div>
    );
  }

  const reachedIndex = TERMINAL_ORDER.indexOf(status);
  const isTerminal = status === "accepted" || status === "finalized";

  return (
    <div className="trace">
      {STEPS.map((step, i) => {
        const isLast = i === STEPS.length - 1;
        const stepMaxIndex = Math.max(...step.statuses.map((s) => TERMINAL_ORDER.indexOf(s)));
        // The final step resolves straight to "done" the moment we hit accepted/finalized -
        // useContractWrite resolves at ACCEPTED and never separately signals FINALIZED, so
        // there's no real "in progress" window to show as active for this step.
        const done = isLast ? isTerminal : reachedIndex > stepMaxIndex;
        const active = isLast ? false : step.statuses.includes(status);
        return (
          <div key={step.label} className={`trace__step ${active ? "trace__step--active" : ""} ${done ? "trace__step--done" : ""}`}>
            <span className="trace__dot" />
            <span className="trace__label">{step.label}</span>
            {i < STEPS.length - 1 && <span className="trace__connector" />}
          </div>
        );
      })}
    </div>
  );
}
