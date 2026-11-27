"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";

import { createProductAction } from "@/app/admin/actions";
import { MOUNT_LABELS, MOUNT_TYPES, SENSOR_LABELS, SENSOR_SIZES, type ProductCategory } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/checkout/address-fields";

function Input({ name, label, ...props }: { name: string; label: string } & React.ComponentProps<"input">) {
  return (
    <Field label={label} htmlFor={name}>
      <input id={name} name={name} className={fieldClass} {...props} />
    </Field>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: Record<string, string> }) {
  return (
    <Field label={label} htmlFor={name}>
      <select id={name} name={name} required className={fieldClass}>
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

const sensorOptions = Object.fromEntries(SENSOR_SIZES.map((s) => [s, SENSOR_LABELS[s]]));

export function ProductForm() {
  const [category, setCategory] = React.useState<ProductCategory>("body");
  const [state, action, pending] = useActionState(createProductAction, null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="max-w-3xl space-y-8">
      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">Product</legend>
        <Field label="Category" htmlFor="category">
          <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className={fieldClass}>
            <option value="body">Camera body</option>
            <option value="lens">Lens</option>
            <option value="accessory">Accessory</option>
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="name" label="Name" required maxLength={200} />
          <Input name="brand" label="Brand" required maxLength={40} placeholder="sony" />
          <Input name="slug" label="URL slug (optional, from name)" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          <Input name="price" label="Price (VND)" type="number" required min={0} step={1000} />
          <Input name="stock" label="Stock" type="number" required min={0} defaultValue={0} />
        </div>
        <Field label="Description" htmlFor="description">
          <textarea id="description" name="description" rows={3} maxLength={2000} className={`${fieldClass} h-auto py-3`} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">Specs</legend>
        {category === "body" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Select name="mount_type" label="Mount" options={MOUNT_LABELS} />
            <Select name="sensor_size" label="Sensor" options={sensorOptions} />
            <Input name="megapixels" label="Megapixels" type="number" step="0.1" required min={1} />
            <Input name="iso_min" label="ISO min" type="number" required min={1} defaultValue={100} />
            <Input name="iso_max" label="ISO max" type="number" required min={1} />
            <Input name="ibis_stops" label="IBIS stops (blank = none)" type="number" step="0.5" min={0} />
            <Input name="video_max" label="Max video" required placeholder="4K60 10-bit" />
            <Input name="weight_g" label="Weight (g)" type="number" required min={1} />
            <Input name="fixed_lens" label="Fixed lens (if any)" placeholder="23mm f/2" />
          </div>
        )}
        {category === "lens" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Select name="mount_type" label="Mount" options={MOUNT_LABELS} />
            <Select name="sensor_coverage" label="Format coverage" options={sensorOptions} />
            <Input name="weight_g" label="Weight (g)" type="number" required min={1} />
            <Input name="focal_min_mm" label="Focal min (mm)" type="number" required min={1} />
            <Input name="focal_max_mm" label="Focal max (mm)" type="number" required min={1} />
            <Input name="aperture_max" label="Max aperture (f/)" type="number" step="0.1" required min={0.7} />
            <Input name="aperture_min" label="Min aperture (f/)" type="number" step="0.1" required min={0.7} defaultValue={22} />
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" name="ois" className="size-4 accent-primary" /> Optical stabilisation
            </label>
          </div>
        )}
        {category === "accessory" && (
          <div className="space-y-4">
            <Input name="accessory_type" label="Type" placeholder="battery, strap, filter…" maxLength={40} />
            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Compatible mounts (none = universal)</legend>
              <div className="flex flex-wrap gap-3">
                {MOUNT_TYPES.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="compatible_mounts" value={m} className="size-4 accent-primary" /> {MOUNT_LABELS[m]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </fieldset>

      {state && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${state.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Create product
      </Button>
    </form>
  );
}
