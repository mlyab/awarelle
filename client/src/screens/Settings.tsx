import { useState } from "react";
import { store, useStore } from "../state/store";
import { useLedger } from "../state/ledger";
import { getDataset } from "../data/synth";
import { contributeUpdate } from "../model/dp";

export default function Settings() {
  const { settings, scans } = useStore();
  const ledger = useLedger();
  const [status, setStatus] = useState<string>("");

  async function toggleContribute() {
    const next = !settings.contribute;
    store.setSettings({ contribute: next });
    if (next) {
      setStatus("Clipping to L2 norm 1.0, adding Gaussian noise σ = 1.0, sending…");
      try {
        const r = await contributeUpdate(getDataset(), scans);
        setStatus(`Sent one DP-noised update (${r.bytes.toLocaleString()} bytes, ε ≈ 1.0). No fields, no identity.`);
      } catch (e) {
        setStatus(`Could not send: ${String(e)}. Nothing left the device.`);
      }
    } else {
      setStatus("");
    }
  }

  return (
    <div className="p-5 flex flex-col gap-4">
      <h1 className="text-2xl">Settings</h1>

      <section className="bg-white rounded-2xl border border-line divide-y divide-line">
        <Toggle
          label="Contribute to the population model (DP-noised)"
          hint="Sends one 128-float update, clipped and noised (ε ≈ 1.0). Never raw data."
          on={settings.contribute}
          onChange={toggleContribute}
        />
        {status && <div className="px-4 py-2 text-[11px] text-teal leading-5">{status}</div>}
        <Toggle
          label="I use hormonal contraception"
          hint="Switches Today to symptom-only mode. There is no ovulatory cycle to estimate."
          on={settings.contraception}
          onChange={() => store.setSettings({ contraception: !settings.contraception })}
        />
        <Toggle
          label="No wearable"
          hint="Hides physiology. Keeps strips and check-ins."
          on={settings.noWearable}
          onChange={() => store.setSettings({ noWearable: !settings.noWearable })}
        />
      </section>

      <section className="bg-white rounded-2xl border border-line p-4">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="text-base">Ledger: everything that left this device</h2>
          <span className="text-xs text-teal font-medium">{ledger.total.toLocaleString()} bytes</span>
        </div>
        {ledger.entries.length === 0 ? (
          <div className="text-xs text-muted">Nothing. 0 bytes have left this device.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="text-muted">
              <tr>
                <th className="text-left font-normal">time</th>
                <th className="text-left font-normal">endpoint</th>
                <th className="text-right font-normal">bytes</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((e, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-1 pr-2 text-muted whitespace-nowrap">{e.ts.slice(11, 19)}</td>
                  <td className="py-1 pr-2">
                    <div className="font-mono">{e.endpoint}</div>
                    <div className="text-muted">{e.contents}</div>
                  </td>
                  <td className="py-1 text-right">{e.bytes.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-muted mt-2">Counted by a wrapper around fetch: every outgoing request body, no exceptions.</p>
      </section>

      <button
        onClick={() => {
          if (confirm("Delete everything stored on this device and reload?")) {
            store.clear();
            location.reload();
          }
        }}
        className="w-full border border-red text-red rounded-xl py-3 text-sm font-medium"
      >
        Delete everything
      </button>
    </div>
  );
}

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="w-full flex items-start gap-3 p-4 text-left">
      <div className={"mt-0.5 w-10 h-6 rounded-full shrink-0 relative transition-colors " + (on ? "bg-teal" : "bg-line")}>
        <div className={"absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all " + (on ? "left-[18px]" : "left-0.5")} />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted leading-4">{hint}</div>
      </div>
    </button>
  );
}
