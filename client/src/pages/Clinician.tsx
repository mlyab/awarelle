import { useEffect, useState } from "react";
import { fetchAndDecrypt, type Dossier } from "../crypto/dossier";
import { APP_NAME } from "../constants";

export default function Clinician() {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [status, setStatus] = useState<string>("Fetching ciphertext…");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const key = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("key");
    if (!id || !key) {
      setStatus("This link is missing the id or the key. Nothing can be decrypted.");
      return;
    }
    setStatus("Decrypting in this browser…");
    fetchAndDecrypt(id, key)
      .then(setDossier)
      .catch((e) => setStatus(`Could not decrypt: ${String(e)}. The relay restarts empty; re-send from the phone.`));
  }, []);

  if (!dossier) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        <div className="max-w-md text-center">{status}</div>
      </div>
    );
  }

  const d = dossier;
  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="max-w-[820px] mx-auto p-8 print:p-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-muted">{APP_NAME} · clinician dossier</div>
            <h1 className="text-3xl">Cycle-linked symptom dossier</h1>
            <div className="text-xs text-muted mt-1">Generated {new Date(d.generatedAt).toLocaleString()} · decrypted in this browser · the relay never saw plaintext</div>
          </div>
          <button onClick={() => window.print()} className="no-print border border-line rounded-lg px-3 py-1.5 text-sm">
            Print
          </button>
        </div>

        <section className="border border-amber bg-ambertint rounded-xl p-4 mb-6">
          <h2 className="text-lg mb-1">Limitations</h2>
          <ul className="text-sm list-disc pl-5 leading-6">
            {d.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-2">Hormonal pattern screen (C-PASS-lite)</h2>
          <p className="text-base font-medium">{d.cpass.headline}</p>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            {d.cpass.cycles.map((c) => (
              <table key={c.cycle} className="w-full text-sm border border-line rounded-lg overflow-hidden">
                <thead className="bg-mist text-muted">
                  <tr>
                    <th className="text-left p-2 font-normal">Cycle {c.cycle} · {c.meets ? "meets criteria" : "does not meet"}</th>
                    <th className="text-right p-2 font-normal">post</th>
                    <th className="text-right p-2 font-normal">pre</th>
                    <th className="text-right p-2 font-normal">change</th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((i) => (
                    <tr key={i.item} className="border-t border-line">
                      <td className="p-2 capitalize">{i.item === "depressed" ? "depressed mood" : i.item}</td>
                      <td className="p-2 text-right">{i.post.toFixed(1)}</td>
                      <td className="p-2 text-right">{i.pre.toFixed(1)}</td>
                      <td className="p-2 text-right">{isFinite(i.relIncrease) ? `+${Math.round(i.relIncrease * 100)} %` : "new"}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line text-muted">
                    <td className="p-2">functioning impairment (pre)</td>
                    <td />
                    <td className="p-2 text-right">{c.functioningPre.toFixed(1)}</td>
                    <td className="p-2 text-right">{c.functioningPre >= 2 ? "≥ 2" : "< 2"}</td>
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
          <p className="text-sm text-muted mt-3">{d.cpass.footer}</p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-2">Current state</h2>
          <p className="text-sm leading-6">
            Cycle day {d.phaseSummary.cycleDay}, {d.phaseSummary.phase}. Ovulation day {d.phaseSummary.ovulationDay} (
            {d.phaseSummary.ovulationMethod === "lh" ? "LH peak" : d.phaseSummary.ovulationMethod === "temp" ? "temperature rise" : "default"}). Confidence{" "}
            {Math.round(d.phaseSummary.confidence * 100)} % ({d.phaseSummary.confidenceLabel}).
          </p>
          <ul className="text-sm list-disc pl-5 mt-2 leading-6">
            {d.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>

        <section className="mb-6 grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl mb-2">Cycles</h2>
            <table className="w-full text-sm border border-line">
              <thead className="bg-mist text-muted">
                <tr>
                  <th className="text-left p-2 font-normal">cycle</th>
                  <th className="text-right p-2 font-normal">length</th>
                  <th className="text-right p-2 font-normal">ovulation</th>
                  <th className="text-right p-2 font-normal">status</th>
                </tr>
              </thead>
              <tbody>
                {d.cycleLengths.map((c) => (
                  <tr key={c.cycle} className="border-t border-line">
                    <td className="p-2">{c.cycle}</td>
                    <td className="p-2 text-right">{c.length}</td>
                    <td className="p-2 text-right">day {c.ovulationDay}</td>
                    <td className="p-2 text-right">{c.complete ? "complete" : "in progress"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-xl mb-2">Strip results</h2>
            <div className="max-h-[220px] overflow-y-auto border border-line">
              <table className="w-full text-sm">
                <thead className="bg-mist text-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-normal">cycle · day</th>
                    <th className="text-right p-2 font-normal">LH</th>
                    <th className="text-right p-2 font-normal">E3G</th>
                    <th className="text-right p-2 font-normal">PdG</th>
                  </tr>
                </thead>
                <tbody>
                  {d.strips.map((s, i) => (
                    <tr key={i} className={"border-t border-line " + (s.source === "scanned" ? "bg-tealtint" : "")}>
                      <td className="p-2">{s.cycle} · {s.day}{s.source === "scanned" ? " (scanned)" : ""}</td>
                      <td className="p-2 text-right">{s.lh}</td>
                      <td className="p-2 text-right">{s.e3g}</td>
                      <td className="p-2 text-right">{s.pdg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-muted mt-1">LH mIU/mL · E3G ng/mL · PdG µg/mL</div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-2">Last {d.nights.length} nights</h2>
          <div className="max-h-[320px] overflow-y-auto border border-line print:max-h-none print:overflow-visible">
            <table className="w-full text-xs">
              <thead className="bg-mist text-muted sticky top-0">
                <tr>
                  <th className="text-left p-1.5 font-normal">cycle · day</th>
                  <th className="text-right p-1.5 font-normal">temp °C</th>
                  <th className="text-right p-1.5 font-normal">rest HR</th>
                  <th className="text-right p-1.5 font-normal">HRV ms</th>
                  <th className="text-right p-1.5 font-normal">sleep eff.</th>
                  <th className="text-right p-1.5 font-normal">bleeding</th>
                </tr>
              </thead>
              <tbody>
                {d.nights.map((n, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="p-1.5">{n.cycle} · {n.day}</td>
                    <td className="p-1.5 text-right">{n.tempC.toFixed(2)}</td>
                    <td className="p-1.5 text-right">{n.restingHR.toFixed(0)}</td>
                    <td className="p-1.5 text-right">{n.hrvRmssd.toFixed(0)}</td>
                    <td className="p-1.5 text-right">{Math.round(n.sleepEfficiency * 100)} %</td>
                    <td className="p-1.5 text-right">{n.bleeding ? "yes" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
