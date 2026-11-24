"use client";

import * as React from "react";

import { APERTURES, ISOS } from "@/lib/optics/simulate";
import { cn } from "@/lib/utils";

import { CompareSlider } from "./compare-slider";
import { ApertureScene, IsoScene } from "./scenes";

function Picker<T extends number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-11 text-xs text-muted-foreground">{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={opt === value}
          onClick={() => onChange(opt)}
          className={cn(
            "spec-figure rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            opt === value
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
          )}
        >
          {format(opt)}
        </button>
      ))}
    </div>
  );
}

const fmtF = (f: number) => `f/${f}`;
const fmtIso = (iso: number) => `ISO ${iso}`;

export function ApertureLab() {
  const [left, setLeft] = React.useState<(typeof APERTURES)[number]>(1.4);
  const [right, setRight] = React.useState<(typeof APERTURES)[number]>(4);
  return (
    <div className="space-y-4">
      <CompareSlider
        label="Compare background blur between two apertures"
        className="aspect-[3/2]"
        left={<ApertureScene fNumber={left} />}
        right={<ApertureScene fNumber={right} />}
        leftLabel={fmtF(left)}
        rightLabel={fmtF(right)}
      />
      <div className="flex flex-col gap-2">
        <Picker label="Left" options={APERTURES} value={left} onChange={setLeft} format={fmtF} />
        <Picker label="Right" options={APERTURES} value={right} onChange={setRight} format={fmtF} />
      </div>
    </div>
  );
}

export function IsoLab() {
  const [left, setLeft] = React.useState<(typeof ISOS)[number]>(100);
  const [right, setRight] = React.useState<(typeof ISOS)[number]>(12800);
  return (
    <div className="space-y-4">
      <CompareSlider
        label="Compare noise between two ISO settings"
        className="aspect-[3/2]"
        left={<IsoScene iso={left} />}
        right={<IsoScene iso={right} />}
        leftLabel={fmtIso(left)}
        rightLabel={fmtIso(right)}
      />
      <div className="flex flex-col gap-2">
        <Picker label="Left" options={ISOS} value={left} onChange={setLeft} format={fmtIso} />
        <Picker label="Right" options={ISOS} value={right} onChange={setRight} format={fmtIso} />
      </div>
    </div>
  );
}
