import { useEffect, useState } from "react";
import { getDataset } from "../data/synth";
import { store, useStore } from "../state/store";

// Simulated reading for today's strip. Day 24, late luteal: LH low, E3G moderate, PdG clearly positive.
const SIMULATED = { lh: 6.2, e3g: 142, pdg: 8.1 };

export default function Scan() {
  const { scans } = useStore();
  const ds = getDataset();
  const todayScan = scans.find((s) => s.cycle === ds.today.cycle && s.day === ds.today.day);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (progress === null) return;
    if (progress >= 100) {
      store.addScan({ ...SIMULATED, cycle: ds.today.cycle, day: ds.today.day, ts: new Date().toISOString() });
      setProgress(null);
      return;
    }
    const t = setTimeout(() => setProgress((p) => (p ?? 0) + 5), 100); // 20 steps x 100 ms = 2 s
    return () => clearTimeout(t);
  }, [progress, ds.today.cycle, ds.today.day]);

  const scanning = progress !== null;

  return (
    <div className="p-5 flex flex-col gap-4">
      <h1 className="text-2xl">Scan strip</h1>
      <p className="text-xs text-muted leading-5">
        Quantitative urinary strip: LH, E3G and PdG. Read by the camera, interpreted on this phone. Simulated in this prototype.
      </p>

      <section className="bg-ink rounded-2xl p-4 relative overflow-hidden" style={{ height: 300 }}>
        {/* viewfinder corners */}
        {[
          "top-4 left-4 border-t-2 border-l-2",
          "top-4 right-4 border-t-2 border-r-2",
          "bottom-4 left-4 border-b-2 border-l-2",
          "bottom-4 right-4 border-b-2 border-r-2",
        ].map((c) => (
          <div key={c} className={"absolute w-6 h-6 border-white/70 " + c} />
        ))}
        {/* strip illustration */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[230px] bg-[#f4f1ea] rounded-md shadow-lg flex flex-col items-center pt-4 gap-5">
          <div className="text-[9px] text-muted">LH · E3G · PdG</div>
          {[0.35, 0.75, 0.9].map((o, i) => (
            <div key={i} className="w-12 h-3 rounded-sm bg-[#b98ac2]" style={{ opacity: o }} />
          ))}
          <div className="mt-auto mb-3 w-8 h-8 rounded-full bg-[#e7e0d2]" />
        </div>
        {scanning && (
          <div
            className="absolute left-0 right-0 h-[2px] bg-[#7fcfc0] shadow-[0_0_12px_#7fcfc0]"
            style={{ top: `${8 + (progress ?? 0) * 0.84}%`, transition: "top 100ms linear" }}
          />
        )}
        {scanning && (
          <div className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/80">Reading colour bands… {progress} %</div>
        )}
      </section>

      {!todayScan && (
        <button onClick={() => setProgress(0)} disabled={scanning} className="w-full bg-teal text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">
          {scanning ? "Scanning…" : "Scan"}
        </button>
      )}

      {todayScan && (
        <section className="bg-white rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base">Today's strip</h2>
            <span className="text-[11px] font-medium bg-tealtint text-teal rounded-full px-2.5 py-0.5">Measured</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Value label="LH" value={todayScan.lh} unit="mIU/mL" />
            <Value label="E3G" value={todayScan.e3g} unit="ng/mL" />
            <Value label="PdG" value={todayScan.pdg} unit="µg/mL" highlight />
          </div>
          <p className="text-sm font-medium mt-3 leading-6">
            PdG {todayScan.pdg} µg/mL — ovulation confirmed, luteal progesterone sufficient.
          </p>
          <p className="text-xs text-muted mt-2 leading-5">
            <span className="font-medium text-ink">Why these numbers matter: </span>
            PdG above 5 µg/mL means progesterone is being produced, so your estimated curve is now anchored to a measurement and the confidence ring rises.
          </p>
        </section>
      )}
    </div>
  );
}

function Value({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg py-2 " + (highlight ? "bg-ambertint" : "bg-mist")}>
      <div className="text-[10px] text-muted">{label}</div>
      <div className="text-lg font-medium">{value}</div>
      <div className="text-[10px] text-muted">{unit}</div>
    </div>
  );
}
