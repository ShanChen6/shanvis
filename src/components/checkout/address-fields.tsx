"use client";

import * as React from "react";

export interface AddressValue {
  line: string;
  province: string;
  district: string;
  ward: string;
  ghnDistrictId: number | null;
  ghnWardCode: string | null;
}

export const emptyAddress: AddressValue = {
  line: "",
  province: "",
  district: "",
  ward: "",
  ghnDistrictId: null,
  ghnWardCode: null,
};

export const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-muted px-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50";

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

type Option = { value: string; label: string };

function useOptions(url: string | null, key: "provinces" | "districts" | "wards") {
  const [state, setState] = React.useState<{ url: string | null; options: Option[]; error: boolean }>({
    url: null,
    options: [],
    error: false,
  });
  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json: Record<string, { id?: number; code?: string; name: string }[]>) => {
        if (cancelled) return;
        const options = (json[key] ?? []).map((o) => ({ value: String(o.id ?? o.code), label: o.name }));
        setState({ url, options, error: false });
      })
      .catch(() => !cancelled && setState({ url, options: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [url, key]);
  const current = state.url === url;
  return { options: current ? state.options : [], loading: Boolean(url) && !current, error: current && state.error };
}

/** Cascading province → district → ward selects backed by GHN master data. */
function GhnAddressSelects({ value, onChange }: { value: AddressValue; onChange: (v: AddressValue) => void }) {
  const [provinceId, setProvinceId] = React.useState("");
  const provinces = useOptions("/api/shipping/address", "provinces");
  const districts = useOptions(provinceId ? `/api/shipping/address?province=${provinceId}` : null, "districts");
  const wards = useOptions(value.ghnDistrictId ? `/api/shipping/address?district=${value.ghnDistrictId}` : null, "wards");

  const select = (
    id: string,
    label: string,
    opts: ReturnType<typeof useOptions>,
    current: string,
    onPick: (o: Option | undefined) => void,
    disabled: boolean,
  ) => (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        required
        disabled={disabled || opts.loading}
        value={current}
        onChange={(e) => onPick(opts.options.find((o) => o.value === e.target.value))}
        className={fieldClass}
      >
        <option value="">{opts.loading ? "Loading…" : opts.error ? "Unavailable, try again" : `Choose ${label.toLowerCase()}`}</option>
        {opts.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {select("province", "Province / City", provinces, provinceId, (o) => {
        setProvinceId(o?.value ?? "");
        onChange({ ...value, province: o?.label ?? "", district: "", ward: "", ghnDistrictId: null, ghnWardCode: null });
      }, false)}
      {select("district", "District", districts, value.ghnDistrictId ? String(value.ghnDistrictId) : "", (o) =>
        onChange({ ...value, district: o?.label ?? "", ward: "", ghnDistrictId: o ? Number(o.value) : null, ghnWardCode: null }),
      !provinceId)}
      {select("ward", "Ward", wards, value.ghnWardCode ?? "", (o) =>
        onChange({ ...value, ward: o?.label ?? "", ghnWardCode: o?.value ?? null }),
      !value.ghnDistrictId)}
    </div>
  );
}

export function AddressFields({
  mode,
  value,
  onChange,
}: {
  mode: "ghn" | "flat";
  value: AddressValue;
  onChange: (v: AddressValue) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Street address" htmlFor="address-line">
        <input
          id="address-line"
          required
          autoComplete="street-address"
          maxLength={200}
          value={value.line}
          onChange={(e) => onChange({ ...value, line: e.target.value })}
          placeholder="Số nhà, tên đường"
          className={fieldClass}
        />
      </Field>
      {mode === "ghn" ? (
        <GhnAddressSelects value={value} onChange={onChange} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["province", "Province / City", "address-level1"],
              ["district", "District", "address-level2"],
              ["ward", "Ward", "address-level3"],
            ] as const
          ).map(([key, label, autoComplete]) => (
            <Field key={key} label={label} htmlFor={`address-${key}`}>
              <input
                id={`address-${key}`}
                required
                autoComplete={autoComplete}
                maxLength={100}
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                className={fieldClass}
              />
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}
