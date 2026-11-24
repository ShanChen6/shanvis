import { backgroundBlurPx, bokehScale, isoSaturation, noiseStrength } from "@/lib/optics/simulate";

/** Deterministic pseudo-random sequence so server and client render the same lights. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(7);
const LIGHTS = Array.from({ length: 34 }, () => ({
  x: rand() * 100,
  y: 8 + rand() * 60,
  r: 1.2 + rand() * 2.2,
  hue: [28, 36, 45, 200, 330][Math.floor(rand() * 5)],
  a: 0.45 + rand() * 0.5,
}));

/** Night-street background: string lights and shop windows. */
function Background() {
  return (
    <svg viewBox="0 0 100 66.67" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <defs>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0b0d1a" />
          <stop offset="1" stopColor="#1d1310" />
        </linearGradient>
      </defs>
      <rect width="100" height="66.67" fill="url(#sky)" />
      {[6, 24, 58, 78].map((x, i) => (
        <rect key={x} x={x} y={30 + (i % 2) * 4} width="14" height="20" fill={i % 2 ? "#3a2412" : "#13243a"} opacity="0.9" />
      ))}
      {LIGHTS.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={`hsl(${l.hue} 95% 62%)`} opacity={l.a} />
      ))}
    </svg>
  );
}

/** Subject in the focal plane: a stylised portrait silhouette with rim light. */
function Subject() {
  return (
    <svg viewBox="0 0 100 66.67" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <defs>
        <linearGradient id="rim" x1="0" x2="1">
          <stop offset="0" stopColor="#ff9a5a" />
          <stop offset="0.25" stopColor="#2a1c16" />
          <stop offset="1" stopColor="#120e0c" />
        </linearGradient>
      </defs>
      <path d="M50 18 c7 0 11 5 11 12 c0 7 -4 12 -11 12 c-7 0 -11 -5 -11 -12 c0 -7 4 -12 11 -12 z" fill="url(#rim)" />
      <path d="M28 66.67 c2 -14 10 -21 22 -21 c12 0 20 7 22 21 z" fill="url(#rim)" />
      <path d="M50 18 c-7 0 -11 5 -11 12" fill="none" stroke="#ffc49a" strokeWidth="0.5" opacity="0.8" />
    </svg>
  );
}

/** Portrait at a given aperture: subject sharp, background defocused. */
export function ApertureScene({ fNumber }: { fNumber: number }) {
  const blur = backgroundBlurPx(fNumber);
  return (
    <div className="relative size-full overflow-hidden">
      <div
        className="absolute -inset-[8%]"
        style={{ filter: `blur(${blur}px)`, transform: `scale(${bokehScale(fNumber) * 0.55 + 0.45})` }}
      >
        <Background />
      </div>
      <div className="absolute inset-0">
        <Subject />
      </div>
    </div>
  );
}

const NOISE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.6 -0.3"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
  );

/** The same night scene at a given ISO: luminance + chroma noise and some loss of saturation. */
export function IsoScene({ iso }: { iso: number }) {
  const strength = noiseStrength(iso);
  return (
    <div className="relative size-full overflow-hidden">
      <div className="absolute -inset-[8%]" style={{ filter: `blur(6px) saturate(${isoSaturation(iso)})` }}>
        <Background />
      </div>
      <div className="absolute inset-0" style={{ filter: `saturate(${isoSaturation(iso)})` }}>
        <Subject />
      </div>
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_SVG}")`, opacity: strength }}
      />
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{ backgroundImage: `url("${NOISE_SVG}")`, backgroundSize: "160px", opacity: strength * 0.35 }}
      />
    </div>
  );
}
