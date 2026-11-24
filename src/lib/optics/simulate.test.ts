import { describe, expect, it } from "vitest";

import { backgroundBlurPx, bokehScale, isoSaturation, noiseStrength } from "./simulate";

describe("optics mappings", () => {
  it("blurs the background more at wider apertures", () => {
    expect(backgroundBlurPx(1.4)).toBeGreaterThan(backgroundBlurPx(2.8));
    expect(backgroundBlurPx(2.8)).toBeCloseTo(backgroundBlurPx(1.4) / 2);
  });

  it("keeps bokeh highlights at least their source size", () => {
    expect(bokehScale(1.4)).toBeGreaterThan(bokehScale(8));
    expect(bokehScale(22)).toBeGreaterThan(1);
  });

  it("has no noise at base ISO and grows monotonically", () => {
    expect(noiseStrength(100)).toBe(0);
    expect(noiseStrength(50)).toBe(0);
    expect(noiseStrength(1600)).toBeLessThan(noiseStrength(12800));
    expect(noiseStrength(10_000_000)).toBe(1);
    expect(isoSaturation(100)).toBe(1);
  });
});
