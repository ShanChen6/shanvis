import QRCode from "qrcode";

/** Server-rendered QR code as an SVG path (no client JS, no innerHTML). */
export function QrCodeSvg({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const margin = 2;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (qr.modules.get(x, y)) d += `M${x + margin} ${y + margin}h1v1h-1z`;
    }
  }
  const full = size + margin * 2;
  return (
    <svg viewBox={`0 0 ${full} ${full}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges">
      <rect width={full} height={full} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
