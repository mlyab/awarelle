import { ReactNode } from "react";

export type Tab = "Today" | "Scan" | "Check-in" | "Pattern" | "Settings";
export const TABS: Tab[] = ["Today", "Scan", "Check-in", "Pattern", "Settings"];

export default function Phone({ tab, onTab, children }: { tab: Tab; onTab: (t: Tab) => void; children: ReactNode }) {
  return (
    <div className="w-[390px] h-[844px] shrink-0 rounded-[24px] border border-line bg-mist flex flex-col overflow-hidden shadow-sm">
      <div className="flex-1 overflow-y-auto">{children}</div>
      <nav className="border-t border-line bg-white flex">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={"flex-1 py-3 text-[11px] font-medium " + (tab === t ? "text-teal" : "text-muted")}
          >
            <div className={"mx-auto mb-1 w-5 h-5 rounded-full " + (tab === t ? "bg-teal" : "bg-line")} />
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
