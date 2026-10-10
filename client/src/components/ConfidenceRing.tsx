export default function ConfidenceRing({ value, label }: { value: number; label: string }) {
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D3DBD8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#146C6B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c * (1 - v)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="15" fontWeight="600" fill="#1B2432">
          {Math.round(v * 100)}
        </text>
      </svg>
      <div className={"text-[11px] font-medium mt-1 " + (label === "Measured" ? "text-teal" : "text-muted")}>{label}</div>
    </div>
  );
}
