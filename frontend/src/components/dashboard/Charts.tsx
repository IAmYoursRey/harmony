/**
 * Lightweight, dependency-free SVG charts for the dashboard.
 */

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}

export function LineChart({ data, height = 160, color = 'hsl(var(--brand-600))' }: LineChartProps) {
  const width = 320;
  const rawMax = Math.max(...data.map((d) => d.value));
  const max = (rawMax === -Infinity || isNaN(rawMax) || rawMax === 0) ? 100 : rawMax * 1.15;
  const min = 0;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : i * step;
    const safeValue = isNaN(d.value) ? 0 : d.value;
    const y = height - ((safeValue - min) / (max - min)) * (height - 20) - 10;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg role="img" aria-label="Chart visualization" viewBox={`0 0 ${width} ${height + 24}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line key={r} x1="0" y1={height * r} x2={width} y2={height * r} stroke="#e0e7ff" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}
      <path d={area} fill="url(#lineG)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
          <text x={x} y={height + 16} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="#64748b">
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  max?: number;
  height?: number;
}

export function BarChart({ data, max, height = 140 }: BarChartProps) {
  const rawMax = max ?? Math.max(...data.map((d) => d.value));
  const maxVal = (rawMax === -Infinity || isNaN(rawMax) || rawMax === 0) ? 100 : rawMax;
  const barWidth = 28;
  const gap = 14;
  const totalWidth = Math.max(1, data.length * (barWidth + gap));

  return (
    <svg role="img" aria-label="Chart visualization" viewBox={`0 0 ${totalWidth} ${height + 24}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-500))" />
          <stop offset="100%" stopColor="hsl(var(--brand-600))" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const safeValue = isNaN(d.value) ? 0 : d.value;
        const h = (safeValue / maxVal) * height;
        const x = i * (barWidth + gap);
        const y = height - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx="6" fill="url(#barG)" />
            <text
              x={x + barWidth / 2}
              y={height + 16}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="10"
              fill="#64748b"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface GroupedBarChartProps {
  data: { label: string; pre: number; post: number }[];
  height?: number;
}

export function GroupedBarChart({ data, height = 160 }: GroupedBarChartProps) {
  const maxVal = 100;
  const groupWidth = 64;
  const gap = 24;
  const totalWidth = data.length * (groupWidth + gap);
  const barW = 22;

  return (
    <svg role="img" aria-label="Chart visualization" viewBox={`0 0 ${totalWidth} ${height + 28}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="preG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-300))" />
          <stop offset="100%" stopColor="hsl(var(--brand-400))" />
        </linearGradient>
        <linearGradient id="postG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-600))" />
          <stop offset="100%" stopColor="hsl(var(--brand-700))" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const x = i * (groupWidth + gap);
        const preSafe = isNaN(d.pre) ? 0 : d.pre;
        const postSafe = isNaN(d.post) ? 0 : d.post;
        const preH = (preSafe / maxVal) * height;
        const postH = (postSafe / maxVal) * height;
        return (
          <g key={d.label}>
            <rect x={x} y={height - preH} width={barW} height={preH} rx="5" fill="url(#preG)" />
            <rect x={x + barW + 6} y={height - postH} width={barW} height={postH} rx="5" fill="url(#postG)" />
            <text x={x + groupWidth / 2} y={height + 18} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill="#64748b">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface DonutProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}

export function Donut({ value, size = 140, stroke = 12, label, sublabel }: DonutProps) {
  const safeSize = isNaN(size) ? 140 : size;
  const safeStroke = isNaN(stroke) ? 12 : stroke;
  const radius = Math.max(0, (safeSize - safeStroke) / 2);
  const circ = 2 * Math.PI * radius;
  const safeValue = isNaN(value) ? 0 : value;
  const offset = isNaN(circ) ? 0 : circ - (safeValue / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg role="img" aria-label="Chart visualization" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="donutG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="hsl(var(--brand-600))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e0e7ff" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#donutG)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="font-display text-2xl font-extrabold text-ink-900">{label ?? `${value}%`}</span>
        {sublabel && <span className="text-[10px] font-medium text-ink-500">{sublabel}</span>}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function PieChart({ data, size = 180 }: PieChartProps) {
  const safeSize = isNaN(size) ? 180 : size;
  const total = data.reduce((s, d) => s + (isNaN(d.value) ? 0 : d.value), 0);
  const safeTotal = total || 1;
  const radius = Math.max(0, safeSize / 2 - 6);
  const cx = safeSize / 2;
  const cy = safeSize / 2;
  let angle = -90;

  const slices = data.map((d) => {
    const safeValue = isNaN(d.value) ? 0 : d.value;
    const pct = safeValue / safeTotal;
    const startAngle = angle;
    const endAngle = angle + pct * 360;
    angle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const largeArc = pct > 0.5 ? 1 : 0;

    return {
      path: `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`,
      color: d.color,
      label: d.label,
      value: d.value,
      pct: Math.round(pct * 100),
    };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg role="img" aria-label="Chart visualization" width={size} height={size} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.45} fill="#fff" />
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
            <span className="font-medium text-ink-700">{s.label}</span>
            <span className="text-ink-400">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 240, height = 60, color = 'hsl(var(--brand-600))' }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max === -Infinity || max === Infinity || isNaN(max)) ? 1 : (max - min || 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((v, i) => {
    const x = data.length === 1 ? width / 2 : i * step;
    const safeV = isNaN(v) ? 0 : v;
    const safeMin = isNaN(min) || min === Infinity ? 0 : min;
    const y = height - ((safeV - safeMin) / range) * (height - 8) - 4;
    return [x, isNaN(y) ? height / 2 : y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg role="img" aria-label="Chart visualization" viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkG)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 4 : 0} fill={color} />
      ))}
    </svg>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = 'hsl(var(--brand-600))',
  track = '#e0e7ff',
  label,
}: ProgressRingProps) {
  const safeSize = isNaN(size) ? 56 : size;
  const safeStroke = isNaN(stroke) ? 6 : stroke;
  const radius = Math.max(0, (safeSize - safeStroke) / 2);
  const circ = 2 * Math.PI * radius;
  const safeValue = isNaN(value) ? 0 : value;
  const offset = isNaN(circ) ? 0 : circ - (safeValue / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg role="img" aria-label="Chart visualization" width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      {label && (
        <span className="absolute text-[10px] font-bold text-ink-700">{label}</span>
      )}
    </div>
  );
}

interface RadarChartProps {
  data: { label: string; value: number }[];
  size?: number;
  color?: string;
}

export function RadarChart({ data, size = 240, color = 'hsl(var(--brand-600))' }: RadarChartProps) {
  const safeSize = isNaN(size) ? 240 : size;
  const cx = safeSize / 2;
  const cy = safeSize / 2;
  const maxRadius = Math.max(0, safeSize / 2 - 40);
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointFor = (i: number, r: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  const polygon = data
    .map((d, i) => {
      const safeValue = isNaN(d.value) ? 0 : d.value;
      const r = (safeValue / 100) * maxRadius;
      const [x, y] = pointFor(i, r);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg role="img" aria-label="Chart visualization" viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
      <defs>
        <radialGradient id="radarG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {/* rings */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          points={data.map((_, i) => { const [x, y] = pointFor(i, maxRadius * r); return `${x},${y}`; }).join(' ')}
          fill="none"
          stroke="hsl(var(--brand-100))"
          strokeWidth="0.8"
        />
      ))}
      {/* axes */}
      {data.map((_, i) => {
        const [x, y] = pointFor(i, maxRadius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--brand-100))" strokeWidth="0.8" />;
      })}
      {/* data polygon */}
      <polygon points={polygon} fill="url(#radarG)" stroke={color} strokeWidth="2" />
      {data.map((d, i) => {
        const safeValue = isNaN(d.value) ? 0 : d.value;
        const r = (safeValue / 100) * maxRadius;
        const [x, y] = pointFor(i, r);
        const [lx, ly] = pointFor(i, maxRadius + 18);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="#475569" fontWeight="600">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
}

export function DonutChart({ data, size = 200, stroke = 28 }: DonutChartProps) {
  const safeSize = isNaN(size) ? 200 : size;
  const safeStroke = isNaN(stroke) ? 28 : stroke;
  const total = data.reduce((s, d) => s + (isNaN(d.value) ? 0 : d.value), 0);
  const safeTotal = total || 1;
  const radius = Math.max(0, (safeSize - safeStroke) / 2);
  const circ = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative" style={{ width: safeSize, height: safeSize }}>
        <svg role="img" aria-label="Chart visualization" width={safeSize} height={safeSize} className="-rotate-90">
          {data.map((d) => {
            const safeValue = isNaN(d.value) ? 0 : d.value;
            const fraction = safeValue / safeTotal;
            const dash = fraction * circ;
            const gap = circ - dash;
            const offset = isNaN(circ) ? 0 : -accumulated * circ;
            accumulated += fraction;
            return (
              <circle
                key={d.label}
                cx={safeSize / 2}
                cy={safeSize / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-extrabold text-ink-900">{total}%</span>
          <span className="text-[10px] text-ink-500">Preparedness</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="font-medium text-ink-700">{d.label}</span>
            <span className="font-bold text-ink-900">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
