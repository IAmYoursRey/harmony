/**
 * Professional inline SVG illustration for the Harmony Edu hero.
 * Depicts a modern school building surrounded by AI, satellite, geospatial
 * map, shield, and disaster (storm/flood) motifs. All vector — no external
 * assets, scales crisply on every screen.
 */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 560 420"
      className="h-full w-full"
      role="img"
      aria-label="Modern school protected by AI, satellite, geospatial map, and shield"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-50))" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="bldg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-500))" />
          <stop offset="100%" stopColor="hsl(var(--brand-700))" />
        </linearGradient>
        <linearGradient id="bldgLight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-100))" />
          <stop offset="100%" stopColor="hsl(var(--brand-200))" />
        </linearGradient>
        <linearGradient id="shieldG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="hsl(var(--brand-600))" />
        </linearGradient>
        <linearGradient id="mapG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-200))" />
          <stop offset="100%" stopColor="hsl(var(--brand-400))" />
        </linearGradient>
        <radialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="hsl(var(--brand-400))"
            stopOpacity="0.5"
          />
          <stop
            offset="100%"
            stopColor="hsl(var(--brand-400))"
            stopOpacity="0"
          />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Background panel */}
      <rect x="0" y="0" width="560" height="420" rx="24" fill="url(#sky)" />

      {/* Geospatial map grid (bottom) */}
      <g opacity="0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={60 + i * 40}
            x2="560"
            y2={60 + i * 40}
            stroke="hsl(var(--brand-300))"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 13 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 44}
            y1="60"
            x2={i * 44}
            y2="420"
            stroke="hsl(var(--brand-300))"
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Geospatial map card */}
      <g transform="translate(40,250)">
        <rect
          width="200"
          height="120"
          rx="14"
          fill="url(#mapG)"
          opacity="0.85"
        />
        <rect
          width="200"
          height="120"
          rx="14"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        />
        {/* contour lines */}
        <path
          d="M10 90 Q60 60 100 80 T190 70"
          stroke="hsl(var(--brand-700))"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M10 60 Q70 30 110 50 T190 40"
          stroke="hsl(var(--brand-700))"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
        />
        {/* risk pins */}
        <circle cx="60" cy="78" r="6" fill="#ef4444" />
        <circle cx="60" cy="78" r="6" fill="#ef4444" opacity="0.4">
          <animate
            attributeName="r"
            values="6;14;6"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.4;0;0.4"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="140" cy="50" r="5" fill="#f59e0b" />
        <circle cx="100" cy="95" r="5" fill="#10b981" />
        {/* pin label */}
        <text
          x="72"
          y="74"
          fontFamily="Inter, sans-serif"
          fontSize="9"
          fill="hsl(var(--brand-900))"
          fontWeight="600"
        >
          RISK
        </text>
      </g>

      {/* School building (center) */}
      <g transform="translate(180,120)">
        {/* shadow */}
        <ellipse
          cx="100"
          cy="190"
          rx="110"
          ry="14"
          fill="hsl(var(--brand-700))"
          opacity="0.12"
          filter="url(#soft)"
        />
        {/* main block */}
        <rect x="20" y="60" width="160" height="120" rx="8" fill="url(#bldg)" />
        <rect
          x="20"
          y="60"
          width="160"
          height="120"
          rx="8"
          fill="url(#bldgLight)"
          opacity="0.18"
        />
        {/* roof */}
        <path d="M0 64 L100 10 L200 64 Z" fill="hsl(var(--brand-800))" />
        <path d="M0 64 L100 10 L200 64 Z" fill="#ffffff" opacity="0.12" />
        {/* flag */}
        <line
          x1="100"
          y1="10"
          x2="100"
          y2="-20"
          stroke="hsl(var(--brand-800))"
          strokeWidth="3"
        />
        <path d="M100 -20 L124 -14 L100 -8 Z" fill="#ef4444" />
        {/* door */}
        <rect
          x="86"
          y="130"
          width="28"
          height="50"
          rx="4"
          fill="hsl(var(--brand-900))"
        />
        <circle cx="107" cy="156" r="2" fill="#fbbf24" />
        {/* windows */}
        {[
          [40, 80],
          [82, 80],
          [124, 80],
          [40, 116],
          [124, 116],
        ].map(([x, y], i) => (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="24"
              height="22"
              rx="3"
              fill="hsl(var(--brand-200))"
              opacity="0.9"
            />
            <line
              x1={x + 12}
              y1={y}
              x2={x + 12}
              y2={y + 22}
              stroke="hsl(var(--brand-800))"
              strokeWidth="1.5"
            />
            <line
              x1={x}
              y1={y + 11}
              x2={x + 24}
              y2={y + 11}
              stroke="hsl(var(--brand-800))"
              strokeWidth="1.5"
            />
          </g>
        ))}
        {/* steps */}
        <rect
          x="76"
          y="180"
          width="48"
          height="6"
          rx="2"
          fill="hsl(var(--brand-900))"
          opacity="0.5"
        />
        {/* SCHOOL label */}
        <text
          x="100"
          y="52"
          textAnchor="middle"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontSize="11"
          fontWeight="700"
          fill="#ffffff"
          letterSpacing="2"
        >
          SCHOOL
        </text>
      </g>

      {/* AI neural node (top-left) */}
      <g transform="translate(60,50)">
        <circle cx="40" cy="40" r="48" fill="url(#aiGlow)" />
        <circle
          cx="40"
          cy="40"
          r="26"
          fill="#ffffff"
          stroke="hsl(var(--brand-500))"
          strokeWidth="2"
        />
        {/* nodes */}
        {[
          [22, 28],
          [58, 28],
          [40, 52],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="hsl(var(--brand-600))" />
        ))}
        {/* connections */}
        <line
          x1="22"
          y1="28"
          x2="58"
          y2="28"
          stroke="hsl(var(--brand-400))"
          strokeWidth="1.5"
        />
        <line
          x1="22"
          y1="28"
          x2="40"
          y2="52"
          stroke="hsl(var(--brand-400))"
          strokeWidth="1.5"
        />
        <line
          x1="58"
          y1="28"
          x2="40"
          y2="52"
          stroke="hsl(var(--brand-400))"
          strokeWidth="1.5"
        />
        {/* AI label */}
        <text
          x="40"
          y="84"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="hsl(var(--brand-700))"
        >
          AI
        </text>
      </g>

      {/* Satellite (top-right) */}
      <g transform="translate(420,40)">
        {/* beam */}
        <path
          d="M30 40 L60 130 L0 130 Z"
          fill="hsl(var(--brand-400))"
          opacity="0.18"
        />
        {/* body */}
        <rect
          x="14"
          y="20"
          width="32"
          height="20"
          rx="4"
          fill="hsl(var(--brand-800))"
        />
        <rect x="26" y="14" width="8" height="8" rx="1" fill="#fbbf24" />
        {/* panels */}
        <rect
          x="-18"
          y="22"
          width="28"
          height="16"
          rx="2"
          fill="hsl(var(--brand-500))"
        />
        <rect
          x="50"
          y="22"
          width="28"
          height="16"
          rx="2"
          fill="hsl(var(--brand-500))"
        />
        <line
          x1="-18"
          y1="30"
          x2="10"
          y2="30"
          stroke="hsl(var(--brand-900))"
          strokeWidth="1"
        />
        <line
          x1="50"
          y1="30"
          x2="78"
          y2="30"
          stroke="hsl(var(--brand-900))"
          strokeWidth="1"
        />
        {/* signal */}
        <circle cx="30" cy="30" r="3" fill="#fbbf24">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      {/* Shield (over school, right) */}
      <g transform="translate(360,150)">
        <path
          d="M40 0 L74 12 V44 C74 64 58 78 40 86 C22 78 6 64 6 44 V12 Z"
          fill="url(#shieldG)"
        />
        <path
          d="M40 0 L74 12 V44 C74 64 58 78 40 86 C22 78 6 64 6 44 V12 Z"
          fill="#ffffff"
          opacity="0.12"
        />
        {/* check */}
        <path
          d="M26 42 L36 52 L56 28"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Disaster motifs: storm cloud + lightning (top center) */}
      <g transform="translate(250,30)">
        <ellipse cx="30" cy="22" rx="34" ry="16" fill="#cbd5e1" />
        <ellipse cx="50" cy="18" rx="22" ry="12" fill="#e2e8f0" />
        <path
          d="M44 34 L36 50 L46 50 L38 66"
          stroke="#fbbf24"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          <animate
            attributeName="opacity"
            values="1;0.2;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Disaster motifs: flood waves (bottom right) */}
      <g transform="translate(330,300)">
        <path
          d="M0 20 Q20 8 40 20 T80 20 T120 20"
          stroke="#38bdf8"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M0 36 Q20 24 40 36 T80 36 T120 36"
          stroke="#0ea5e9"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M0 52 Q20 40 40 52 T80 52 T120 52"
          stroke="hsl(var(--brand-600))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />
      </g>

      {/* Data points floating */}
      <g>
        <circle
          cx="150"
          cy="120"
          r="4"
          fill="hsl(var(--brand-600))"
          opacity="0.7"
        >
          <animate
            attributeName="cy"
            values="120;108;120"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="470" cy="200" r="4" fill="#22d3ee" opacity="0.7">
          <animate
            attributeName="cy"
            values="200;188;200"
            dur="3.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx="500"
          cy="340"
          r="4"
          fill="hsl(var(--brand-600))"
          opacity="0.6"
        >
          <animate
            attributeName="cy"
            values="340;328;340"
            dur="2.8s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  );
}
