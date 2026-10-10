import { useMemo, useState } from "react";
import { getDataset } from "../data/synth";
import { scoreCpass } from "../model/cpass";
import { useStore } from "../state/store";
import { buildDossier, clinicianLink, encryptDossier, sendToRelay, type Encrypted } from "../crypto/dossier";

type Stage = "idle" | "encrypting" | "ready" | "sending" | "sent" | "error";

export default function Pattern() {
  const { scans } = useStore();
  const ds = getDataset();
  const result = useMemo(() => scoreCpass(ds), [ds]);

  const [stage, setStage] = useState<Stage>("idle");
  const [enc, setEnc] = useState<Encrypted | null>(null);
  const [link, setLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>("");

  async function prepare() {
    setStage("encrypting");
    try {
      const dossier = buildDossier(ds, scans);
      await new Promise((r) => setTimeout(r, 600)); // let the audience see it happen
      setEnc(await encryptDossier(dossier));
      setStage("ready");
    } catch (e) {
      setError(String(e));
      setStage("error");
    }
  }

  async function send() {
    if (!enc) return;
    setStage("sending");
    try {
      const { id } = await sendToRelay(enc);
      setLink(clinicianLink(id, enc.keyB64url));
      setStage("sent");
    } catch (e) {
      setError(String(e));
      setStage("error");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the link is selectable below */
    }
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <h1 className="text-2xl">Your pattern</h1>

      <section className={"rounded-2xl border p-4 " + (result.pattern ? "bg-ambertint border-amber" : "bg-white border-line")}>
        <div className="text-[11px] uppercase tracking-wide text-muted mb-1">C-PASS-lite · {result.of} tracked cycles</div>
        <p className="text-sm font-medium leading-6">{result.headline}</p>
      </section>

      <section className="bg-white rounded-2xl border border-line p-4">
        <h2 className="text-base mb-2">Evidence per cycle</h2>
        <p className="text-[11px] text-muted mb-2">Mean daily rating (0–6), premenstrual week vs postmenstrual week.</p>
        {result.cycles.map((c) => (
          <div key={c.cycle} className="mb-3 last:mb-0">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span>Cycle {c.cycle}</span>
              <span className={c.meets ? "text-teal" : "text-muted"}>{c.meets ? "meets timing criteria" : "does not meet"}</span>
            </div>
            <table className="w-full text-[11px]">
              <thead className="text-muted">
                <tr>
                  <th className="text-left font-normal">item</th>
                  <th className="text-right font-normal">post</th>
                  <th className="text-right font-normal">pre</th>
                  <th className="text-right font-normal">change</th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((i) => (
                  <tr key={i.item} className={i.meets ? "text-ink" : "text-muted"}>
                    <td className="capitalize">{i.item === "depressed" ? "depressed mood" : i.item}</td>
                    <td className="text-right">{i.post.toFixed(1)}</td>
                    <td className="text-right">{i.pre.toFixed(1)}</td>
                    <td className="text-right">{isFinite(i.relIncrease) ? `+${Math.round(i.relIncrease * 100)} %` : "new"}</td>
                  </tr>
                ))}
                <tr className="text-muted">
                  <td>functioning impairment (pre)</td>
                  <td />
                  <td className="text-right">{c.functioningPre.toFixed(1)}</td>
                  <td className="text-right">{c.functioningPre >= 2 ? "≥ 2" : "< 2"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
        <p className="text-[11px] text-muted mt-3 border-t border-line pt-2 leading-5">{result.footer}</p>
      </section>

      <section className="bg-white rounded-2xl border border-line p-4">
        <h2 className="text-base mb-1">Share with a clinician</h2>
        <p className="text-xs text-muted mb-3 leading-5">
          The dossier is built and encrypted on this phone. The relay only ever holds ciphertext.
        </p>

        {stage === "idle" && (
          <button onClick={prepare} className="w-full bg-teal text-white rounded-xl py-3 text-sm font-medium">
            Prepare dossier for a clinician
          </button>
        )}
        {stage === "encrypting" && <div className="text-sm text-muted text-center py-3">Encrypting on device (AES-GCM 256)…</div>}
        {(stage === "ready" || stage === "sending") && enc && (
          <div>
            <div className="text-xs text-muted mb-3 leading-5">
              Dossier: {enc.plaintextBytes.toLocaleString()} bytes of plaintext → {enc.ciphertextBytes.toLocaleString()} bytes of ciphertext.
              Key stays on this device.
            </div>
            <button onClick={send} disabled={stage === "sending"} className="w-full bg-teal text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60">
              {stage === "sending" ? "Sending ciphertext…" : "Send"}
            </button>
          </div>
        )}
        {stage === "sent" && (
          <div>
            <div className="text-xs text-teal font-medium mb-2">Sent. Watch the console: the relay reports what it received.</div>
            <div className="bg-mist rounded-lg p-2 text-[10px] font-mono break-all select-all border border-line">{link}</div>
            <button onClick={copy} className="w-full mt-2 border border-teal text-teal rounded-xl py-2 text-sm font-medium">
              {copied ? "Copied" : "Copy link"}
            </button>
            <p className="text-xs text-muted mt-3 leading-5">
              The relay cannot read this. Only someone with this link can. The key lives after the <span className="font-mono">#</span>, which browsers never send to a server.
            </p>
          </div>
        )}
        {stage === "error" && (
          <div className="text-xs text-red">
            {error}
            <button onClick={() => setStage("idle")} className="block mt-2 underline">Try again</button>
          </div>
        )}
      </section>
    </div>
  );
}
