/**
 * Original, generic mirrorless-camera illustration split into layers for the
 * exploded scrollytelling view. Each layer is a separate SVG on the same
 * 600x400 canvas so they line up when stacked.
 */

export const LAYER_IDS = ["rear", "board", "sensor", "ibis", "shell"] as const;
export type LayerId = (typeof LAYER_IDS)[number];

const VIEWBOX = "0 0 600 400";

function Rear() {
  return (
    <svg viewBox={VIEWBOX} className="size-full" aria-hidden>
      <rect x="70" y="110" width="460" height="250" rx="34" fill="#141418" stroke="#2c2c33" strokeWidth="2" />
      <rect x="120" y="150" width="280" height="180" rx="10" fill="#0b0b0d" stroke="#33333b" />
      <rect x="132" y="162" width="256" height="156" rx="6" fill="url(#lcd)" opacity="0.9" />
      <circle cx="465" cy="215" r="26" fill="#1d1d22" stroke="#3a3a42" />
      <circle cx="465" cy="215" r="9" fill="#25252b" />
      <circle cx="465" cy="290" r="11" fill="#1d1d22" stroke="#3a3a42" />
      <defs>
        <linearGradient id="lcd" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#1b2330" />
          <stop offset="1" stopColor="#101014" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Board() {
  return (
    <svg viewBox={VIEWBOX} className="size-full" aria-hidden>
      <rect x="120" y="125" width="360" height="220" rx="14" fill="#0f1a16" stroke="#1f3a30" strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M${140 + i * 36} 140 v${40 + (i % 3) * 18} h${i % 2 ? 22 : -14} V330`}
          stroke="#1f4a3a"
          strokeWidth="2"
          fill="none"
        />
      ))}
      <rect x="250" y="190" width="100" height="90" rx="6" fill="#16161a" stroke="#FF4D00" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} fill="#8e8e98">
          <rect x={258 + i * 11} y="182" width="4" height="8" />
          <rect x={258 + i * 11} y="280" width="4" height="8" />
        </g>
      ))}
      <text x="300" y="232" textAnchor="middle" fontSize="11" fill="#f2f2f3" fontFamily="var(--font-mono)" letterSpacing="2">
        IMAGE
      </text>
      <text x="300" y="248" textAnchor="middle" fontSize="11" fill="#f2f2f3" fontFamily="var(--font-mono)" letterSpacing="2">
        ENGINE
      </text>
      <rect x="150" y="290" width="60" height="30" rx="3" fill="#1b1b20" stroke="#2d2d34" />
      <rect x="390" y="290" width="60" height="30" rx="3" fill="#1b1b20" stroke="#2d2d34" />
    </svg>
  );
}

function Sensor() {
  return (
    <svg viewBox={VIEWBOX} className="size-full" aria-hidden>
      <defs>
        <linearGradient id="sensor-sheen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#3b1f5c" />
          <stop offset="0.35" stopColor="#1d4a5c" />
          <stop offset="0.65" stopColor="#2f5a2a" />
          <stop offset="1" stopColor="#5c2a1d" />
        </linearGradient>
        <pattern id="pixels" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M6 0H0V6" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="205" y="165" width="190" height="140" rx="6" fill="#1a1a1f" stroke="#3a3a42" strokeWidth="2" />
      <rect x="220" y="178" width="160" height="114" rx="2" fill="url(#sensor-sheen)" />
      <rect x="220" y="178" width="160" height="114" rx="2" fill="url(#pixels)" />
      <text x="300" y="330" textAnchor="middle" fontSize="11" fill="#8e8e98" fontFamily="var(--font-mono)" letterSpacing="2">
        36 × 24 MM
      </text>
    </svg>
  );
}

function Ibis() {
  return (
    <svg viewBox={VIEWBOX} className="size-full" aria-hidden>
      <rect x="180" y="145" width="240" height="180" rx="12" fill="none" stroke="#8e8e98" strokeWidth="2" strokeDasharray="6 5" />
      {[
        [170, 220],
        [410, 220],
        [285, 135],
        [285, 315],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={i < 2 ? x - 10 : x}
          y={i < 2 ? y - 15 : y - 10}
          width={i < 2 ? 20 : 30}
          height={i < 2 ? 30 : 20}
          rx="4"
          fill="#2a1a12"
          stroke="#FF4D00"
          strokeWidth="1.5"
        />
      ))}
      <path d="M140 235 h-30 m10 -8 l-10 8 l10 8 M460 235 h30 m-10 -8 l10 8 l-10 8" stroke="#FF4D00" strokeWidth="1.5" fill="none" opacity="0.7" />
      <path d="M300 115 v-30 m-8 10 l8 -10 l8 10 M300 345 v30 m-8 -10 l8 10 l8 -10" stroke="#FF4D00" strokeWidth="1.5" fill="none" opacity="0.7" />
    </svg>
  );
}

function Shell() {
  return (
    <svg viewBox={VIEWBOX} className="size-full" aria-hidden>
      <defs>
        <linearGradient id="shell" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#26262c" />
          <stop offset="1" stopColor="#141418" />
        </linearGradient>
        <mask id="mount-hole">
          <rect width="600" height="400" fill="white" />
          <circle cx="300" cy="235" r="78" fill="black" />
        </mask>
      </defs>
      {/* top plate + EVF hump */}
      <path d="M215 110 L240 62 H360 L385 110 Z" fill="url(#shell)" stroke="#34343c" strokeWidth="2" />
      <rect x="420" y="92" width="64" height="18" rx="6" fill="#1d1d22" stroke="#34343c" />
      <circle cx="140" cy="100" r="14" fill="#1d1d22" stroke="#34343c" />
      {/* body with grip, mount hole cut out */}
      <g mask="url(#mount-hole)">
        <path
          d="M70 140 Q70 108 102 108 H498 Q530 108 530 140 V330 Q530 362 498 362 H102 Q70 362 70 330 Z"
          fill="url(#shell)"
          stroke="#34343c"
          strokeWidth="2"
        />
        <path d="M70 150 Q60 150 58 175 V310 Q60 340 78 345 H150 V150 Z" fill="#101013" opacity="0.9" />
      </g>
      {/* mount ring */}
      <circle cx="300" cy="235" r="78" fill="none" stroke="#5a5a64" strokeWidth="6" />
      <circle cx="300" cy="235" r="90" fill="none" stroke="#2d2d34" strokeWidth="10" />
      <circle cx="300" cy="140" r="4" fill="#FF4D00" />
      <circle cx="455" cy="150" r="5" fill="#FF4D00" />
      <text x="470" y="340" textAnchor="end" fontSize="12" fill="#8e8e98" fontFamily="var(--font-mono)" letterSpacing="4">
        SHANVIS
      </text>
    </svg>
  );
}

export const LAYERS: Record<LayerId, { label: string; Svg: () => React.JSX.Element }> = {
  rear: { label: "Rear display", Svg: Rear },
  board: { label: "Image engine", Svg: Board },
  sensor: { label: "Sensor", Svg: Sensor },
  ibis: { label: "IBIS unit", Svg: Ibis },
  shell: { label: "Magnesium shell", Svg: Shell },
};
