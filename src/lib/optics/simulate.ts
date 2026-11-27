/**
 * Simplified optics used by the Lens Lab illustrations. Not a physical
 * simulation — just monotonic mappings that preserve the right intuitions.
 */

export const APERTURES = [1.4, 2, 2.8, 4, 5.6, 8] as const;
export const ISOS = [100, 400, 1600, 6400, 12800, 25600] as const;

/** Background blur radius (px) for an aperture. Blur disc ~ 1 / f-number. */
export function backgroundBlurPx(fNumber: number, base = 20) {
  return base * (1.4 / fNumber);
}

/** Relative size of bokeh highlights; stays above 1 so lights never shrink below their source. */
export function bokehScale(fNumber: number) {
  return 1 + 1.6 * (1.4 / fNumber);
}

/** Noise overlay strength 0..1, growing per stop above base ISO. */
export function noiseStrength(iso: number, baseIso = 100) {
  const stops = Math.log2(Math.max(iso, baseIso) / baseIso);
  return Math.min(1, Math.max(0, (stops / 8) ** 1.6));
}

/** Small loss of saturation/contrast at high ISO. */
export function isoSaturation(iso: number) {
  return 1 - 0.35 * noiseStrength(iso);
}
