import { useState } from "react";
import { getDataset } from "../data/synth";
import { store, useStore } from "../state/store";

type Item = { key: "irritability" | "anxiety" | "pain" | "functioning"; label: string; anchors: [string, string] };
const ITEMS: Item[] = [
  { key: "irritability", label: "Irritability", anchors: ["not at all", "extreme"] },
  { key: "anxiety", label: "Anxiety or tension", anchors: ["not at all", "extreme"] },
  { key: "pain", label: "Physical pain", anchors: ["none", "severe"] },
  { key: "functioning", label: "Got in the way of work or relationships", anchors: ["not at all", "could not function"] },
];

export default function CheckIn() {
  const { checkins } = useStore();
  const ds = getDataset();
  const [values, setValues] = useState<Record<Item["key"], number>>({ irritability: 3, anxiety: 3, pain: 1, functioning: 2 });
  const [toast, setToast] = useState(false);

  function save() {
    store.addCheckIn({ ...values, cycle: ds.today.cycle, day: ds.today.day, ts: new Date().toISOString() });
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  }

  return (
    <div className="p-5 flex flex-col gap-4 relative">
      <div>
        <h1 className="text-2xl">20-second check-in</h1>
        <p className="text-xs text-muted mt-1">Day {ds.today.day}. Rate today from 0 to 6. Stored on this phone only.</p>
      </div>

      {ITEMS.map((it) => (
        <section key={it.key} className="bg-white rounded-2xl border border-line p-4">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>{it.label}</span>
            <span className="text-teal">{values[it.key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={values[it.key]}
            onChange={(e) => setValues({ ...values, [it.key]: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>0 · {it.anchors[0]}</span>
            <span>6 · {it.anchors[1]}</span>
          </div>
        </section>
      ))}

      <button onClick={save} className="w-full bg-teal text-white rounded-xl py-3 text-sm font-medium">
        Save
      </button>
      {checkins.length > 0 && (
        <div className="text-[11px] text-muted text-center">{checkins.length} check-in{checkins.length > 1 ? "s" : ""} saved on this device</div>
      )}

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 bg-ink text-white text-sm rounded-full px-4 py-2 shadow-lg">
          Saved on this device
        </div>
      )}
    </div>
  );
}
