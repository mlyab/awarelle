import { useEffect, useRef, useState } from "react";
import { PUBLIC_URL } from "../constants";

type LogLine = { ts: string; line: string };

export default function Console() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      const entry = JSON.parse(ev.data) as LogLine;
      setLines((prev) => [...prev.slice(-199), entry]);
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <aside className="w-[420px] shrink-0 bg-ink text-mist rounded-3xl p-5 flex flex-col h-[844px]">
      <div className="mb-3">
        <h2 className="text-xl">What the cloud sees</h2>
        <div className="text-xs text-[#9aa7b2] mt-1 break-all">{PUBLIC_URL}</div>
        <div className="text-xs mt-1 flex items-center gap-2">
          <span className={"inline-block w-2 h-2 rounded-full " + (connected ? "bg-[#4fb3a3]" : "bg-[#e06c5f]")} />
          {connected ? "agent connected" : "agent unreachable - phone keeps working"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-[12px] leading-5 border-t border-[#33404f] pt-3">
        {lines.length === 0 && <div className="text-[#6c7a88]">no logs yet</div>}
        {lines.map((l, i) => {
          const color = l.line.startsWith("relay")
            ? "text-amber"
            : l.line.startsWith("agent up")
              ? "text-[#7fcfc0]"
              : "";
          return (
            <div key={i} className="whitespace-pre-wrap break-words">
              <span className="text-[#6c7a88]">{l.ts.slice(11, 19)}</span> <span className={color}>{l.line}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
