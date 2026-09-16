/**
 * Professional inline SVG illustration for the Harmony hero.
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

      {/* Isometric Map & Disaster Zones (center) */}
      <g transform="translate(140, 150)">
        {/* Map Base Shadow */}
        <ellipse
          cx="140"
          cy="120"
          rx="150"
          ry="40"
          fill="hsl(var(--brand-700))"
          opacity="0.2"
          filter="url(#soft)"
        />
        
        {/* Map Base Layers (3D effect) */}
        <path d="M140 20 L280 80 L140 140 L0 80 Z" fill="hsl(var(--brand-200))" opacity="0.6" />
        <path d="M140 40 L280 100 L140 160 L0 100 Z" fill="hsl(var(--brand-100))" opacity="0.8" />
        
        {/* Top Terrain Layer */}
        <path d="M140 0 L280 60 L140 120 L0 60 Z" fill="url(#bldg)" />
        
        {/* Map Grid */}
        <path d="M70 30 L140 60 M210 90 L140 120 M35 45 L175 105 M105 15 L245 75" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.25" />
        <path d="M105 105 L245 45 M35 75 L175 15 M70 90 L210 30" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.25" />

        {/* Contour lines (topography) */}
        <path d="M100 40 Q140 20 180 50 T240 50" fill="none" stroke="hsl(var(--brand-300))" strokeWidth="2" strokeOpacity="0.7" />
        <path d="M80 60 Q130 50 180 80 T260 70" fill="none" stroke="hsl(var(--brand-300))" strokeWidth="2" strokeOpacity="0.5" />
        <path d="M50 75 Q100 80 140 100 T210 95" fill="none" stroke="hsl(var(--brand-300))" strokeWidth="2" strokeOpacity="0.3" />
        
        {/* Glowing Radar / Sonar effect on map */}
        <circle cx="140" cy="60" r="40" fill="none" stroke="hsl(var(--brand-400))" strokeWidth="2" opacity="0.6">
          <animate attributeName="r" values="0; 80; 0" dur="4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8; 0; 0.8" dur="4s" repeatCount="indefinite" />
        </circle>
        
        {/* Disaster Marker: Fire / Heat Zone (Right) */}
        <g transform="translate(200, 45)">
          <path d="M0 -22 Q12 -5 0 0 Q-12 -5 0 -22" fill="#ef4444" />
          <circle cx="0" cy="-2" r="3" fill="#ffffff" />
          <circle cx="0" cy="-2" r="14" fill="#ef4444" opacity="0.3">
            <animate attributeName="r" values="6;20;6" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
        
        {/* Disaster Marker: Flood Zone (Left) */}
        <g transform="translate(80, 85)">
          <path d="M0 -22 Q12 -5 0 0 Q-12 -5 0 -22" fill="#0ea5e9" />
          <circle cx="0" cy="-2" r="3" fill="#ffffff" />
          <path d="M-12 8 Q0 2 12 8" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-8 14 Q0 8 8 14" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-2" r="16" fill="#0ea5e9" opacity="0.2">
            <animate attributeName="r" values="10;24;10" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </g>
        
        {/* Disaster Marker: Earthquake / Fault Line Zone (Center) */}
        <g transform="translate(130, 40)">
          <path d="M0 -22 Q12 -5 0 0 Q-12 -5 0 -22" fill="#f59e0b" />
          <circle cx="0" cy="-2" r="3" fill="#ffffff" />
          <path d="M-18 10 L-6 16 L6 4 L18 10" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-2" r="20" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8">
            <animateTransform attributeName="transform" type="rotate" from="0 0 -2" to="360 0 -2" dur="8s" repeatCount="indefinite" />
          </circle>
        </g>
        
        {/* Central Data Pillar */}
        <rect x="136" y="-40" width="8" height="100" fill="url(#shieldG)" opacity="0.9" />
        <polygon points="132,-40 148,-40 140,-55" fill="#22d3ee" />
        
        {/* Hologram Text / Label */}
        <text
          x="140"
          y="-70"
          textAnchor="middle"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontSize="14"
          fontWeight="800"
          fill="#ffffff"
          letterSpacing="3"
        >
          MAP ZONE
        </text>
        <rect x="90" y="-60" width="100" height="2" fill="hsl(var(--brand-300))" opacity="0.8" />
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
