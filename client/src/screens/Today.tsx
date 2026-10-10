import { useMemo } from "react";
import { getDataset } from "../data/synth";
import { estimate, HORMONE_SENTENCE } from "../model/phase";
import { useStore } from "../state/store";
import { useLedger } from "../state/ledger";
import Curves, { Dot } from "../components/Curves";
import ConfidenceRing from "../components/ConfidenceRing";

export default function Today() {
  const { scans, settings } = useStore();
  const ledger = useLedger();
  const ds = getDataset();
  const est = useMemo(() => estimate(ds, scans), [ds, scans]);

  const dots: Dot[] = useMemo(() => {
    const prev = ds.cycles[ds.cycles.length - 2];
    const prior: Dot[] = prev ? prev.days.filter((d) => d.strip).map((d) => ({ day: d.day, e3g: d.strip!.e3g, pdg: d.strip!.pdg, prior: true })) : [];
    const cur: Dot[] = scans.filter((s) => s.cycle === est.cycleIndex).map((s) => ({ day: s.day, e3g: s.e3g, pdg: s.pdg }));
    return [...prior, ...cur];
  }, [ds, scans, est.cycleIndex]);

  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  if (settings.contraception) {
    return (
      <div className="p-5 flex flex-col gap-4">
        <div className="text-xs text-muted">{date}</div>
        <h1 className="text-2xl">Today</h1>
        <section className="bg-white rounded-2xl border border-line p-4">
          <h2 className="text-lg mb-1">Symptom-only mode</h2>
          <p className="text-sm leading-6">
            You told us you use hormonal contraception, so there is no ovulatory cycle to estimate. We will not draw hormone curves or
            guess a phase. Your check-ins and strips are still tracked on this phone, and a clinician dossier can still be prepared from them.
          </p>
        </section>
        <footer className="text-center text-sm font-medium text-teal py-1">Bytes that left this device: {ledger.total.toLocaleString()}</footer>
      </div>
    );
  }
  const physiology = !settings.noWearable;

  return (
    <div className="p-5 pb-3 flex flex-col gap-4">
      <div>
        <div className="text-xs text-muted">{date}</div>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl">Today</h1>
          <span className="text-xs font-medium bg-tealtint text-teal rounded-full px-3 py-1">{est.chip}</span>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-line p-3">
        <div className="flex items-center justify-between text-[11px] text-muted mb-1 px-1">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-teal mr-1" />estradiol
            <span className="inline-block w-2 h-2 rounded-full bg-amber ml-3 mr-1" />progesterone
          </span>
          <span>estimated pattern · dots are measured</span>
        </div>
        <Curves curve={est.curve} today={est.day} dots={dots} />
      </section>

      <section className="bg-white rounded-2xl border border-line p-4 flex gap-4 items-center">
        <ConfidenceRing value={est.confidence.value} label={est.confidence.label} />
        <div className="text-xs text-muted leading-5">
          <div className="text-ink font-medium text-sm">Confidence {Math.round(est.confidence.value * 100)} %</div>
          <div>Wearable only: 0.35</div>
          <div className={est.confidence.lhObserved ? "text-teal" : ""}>LH peak this cycle: {est.confidence.lhObserved ? "observed" : "not yet"}</div>
          <div className={est.confidence.pdgConfirmed ? "text-teal" : ""}>PdG confirmed: {est.confidence.pdgConfirmed ? "yes" : "not yet"}</div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-line p-4">
        <h2 className="text-lg mb-1">What's happening now, and why</h2>
        <p className="text-sm leading-6">{physiology ? est.why : `${est.chip}. ${HORMONE_SENTENCE[est.phase]} No wearable connected, so physiology is hidden; strips and check-ins still count.`}</p>
        {physiology && <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] text-muted">
          <Stat label="HRV" value={`${est.deviations.hrv.value.toFixed(0)} ms`} pct={est.deviations.hrv.pct} />
          <Stat label="Temp" value={`${est.deviations.temp.value.toFixed(2)} °C`} pct={null} />
          <Stat label="Rest HR" value={`${est.deviations.hr.value.toFixed(0)} bpm`} pct={est.deviations.hr.pct} />
          <Stat label="Sleep" value={`${Math.round(est.deviations.sleep.value * 100)} %`} pct={est.deviations.sleep.pct} />
        </div>}
      </section>

      <footer className="text-center text-sm font-medium text-teal py-1">
        Bytes that left this device: {ledger.total.toLocaleString()}
      </footer>
    </div>
  );
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  return (
    <div className="bg-mist rounded-lg py-2">
      <div>{label}</div>
      <div className="text-ink text-xs font-medium">{value}</div>
      {pct != null && <div>{pct >= 0 ? "+" : ""}{Math.round(pct)} % vs you</div>}
    </div>
  );
}
