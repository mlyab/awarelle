import { useEffect, useState } from "react";
import { APP_NAME } from "../constants";

type Aggregate = { n: number; k: number; epsilon: number; metrics: { enrolled: number; completedAssessment: number; medianDaysToCare: number; satisfaction: number } };

export default function Employer() {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/aggregate")
      .then((r) => r.json())
      .then(setAgg)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-[560px] w-full">
        <div className="text-xs text-muted">{APP_NAME} · employer program view</div>
        <h1 className="text-3xl mb-4">Program metrics</h1>
        {err && <div className="text-red text-sm">{err}</div>}
        {!agg && !err && <div className="text-muted text-sm">Loading aggregate…</div>}
        {agg && (
          <div className="bg-white rounded-2xl border border-line p-6">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <Metric label="Enrolled" value={`${Math.round(agg.metrics.enrolled * 100)} %`} />
              <Metric label="Completed assessment" value={`${Math.round(agg.metrics.completedAssessment * 100)} %`} />
              <Metric label="Median days to care" value={`${agg.metrics.medianDaysToCare}`} />
              <Metric label="Satisfaction" value={`${agg.metrics.satisfaction} / 5`} />
            </div>
            <div className="text-xs text-muted border-t border-line pt-3">
              n = {agg.n.toLocaleString()} · k-anonymity ≥ {agg.k} · differential privacy ε = {agg.epsilon.toFixed(1)} · no individual record exists
            </div>
            <p className="text-sm text-red font-medium mt-3 leading-6">
              No individual data exists on this server. We do not predict productivity from cycles.
            </p>
            <div className="text-[11px] text-muted mt-3">Synthetic figures for the prototype.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-mist rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-medium">{value}</div>
    </div>
  );
}
