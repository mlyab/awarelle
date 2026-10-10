import { Area, ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, XAxis, YAxis, Tooltip } from "recharts";
import type { CurvePoint } from "../model/phase";

export type Dot = { day: number; e3g?: number; pdg?: number; prior?: boolean };

const TEAL = "#146C6B";
const AMBER = "#E0A43C";

// Strip values scaled onto the same 0-100 axis as the template (% of a typical peak).
export const scaleE3g = (v: number) => Math.min(100, (v / 350) * 100);
export const scalePdg = (v: number) => Math.min(100, (v / 10) * 100);

export default function Curves({ curve, today, dots }: { curve: CurvePoint[]; today: number; dots: Dot[] }) {
  const data = curve.map((p) => {
    const row: Record<string, number | undefined> = { ...p };
    for (const d of dots.filter((x) => x.day === p.day)) {
      if (d.e3g != null) row[d.prior ? "priorE3g" : "e3gDot"] = scaleE3g(d.e3g);
      if (d.pdg != null) row[d.prior ? "priorPdg" : "pdgDot"] = scalePdg(d.pdg);
    }
    return row;
  });
  return (
    <div className="w-full h-[190px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AMBER} stopOpacity={0.4} />
              <stop offset="100%" stopColor={AMBER} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#5E6974" }} tickLine={false} axisLine={{ stroke: "#D3DBD8" }} ticks={[1, 7, 14, 21, 28]} />
          <YAxis domain={[0, 110]} tick={false} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #D3DBD8" }}
            formatter={(v: number, name: string) => [`${Math.round(v)} %`, name]}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Area type="monotone" dataKey="estradiol" name="estradiol (est.)" stroke={TEAL} strokeWidth={2} fill="url(#gE)" dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="progesterone" name="progesterone (est.)" stroke={AMBER} strokeWidth={2} fill="url(#gP)" dot={false} isAnimationActive={false} />
          <Scatter dataKey="priorE3g" name="E3G, previous cycle" fill={TEAL} fillOpacity={0.3} isAnimationActive={false} />
          <Scatter dataKey="priorPdg" name="PdG, previous cycle" fill={AMBER} fillOpacity={0.35} isAnimationActive={false} />
          <Scatter dataKey="e3gDot" name="E3G measured" fill={TEAL} stroke="#fff" strokeWidth={1.5} isAnimationActive={false} />
          <Scatter dataKey="pdgDot" name="PdG measured" fill={AMBER} stroke="#fff" strokeWidth={1.5} isAnimationActive={false} />
          <ReferenceLine x={today} stroke="#1B2432" strokeDasharray="3 3" label={{ value: "today", position: "top", fontSize: 10, fill: "#1B2432" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
