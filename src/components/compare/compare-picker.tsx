import type { ProductWithSpecs } from "@/types/catalog";
import { Button } from "@/components/ui/button";

const GROUPS = [
  ["body", "Camera bodies"],
  ["lens", "Lenses"],
] as const;

function ProductSelect({
  name,
  label,
  products,
  value,
}: {
  name: string;
  label: string;
  products: ProductWithSpecs[];
  value?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        required
        className="h-11 rounded-full border border-input bg-muted px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      >
        <option value="" disabled>
          Choose a product…
        </option>
        {GROUPS.map(([category, groupLabel]) => (
          <optgroup key={category} label={groupLabel}>
            {products
              .filter((p) => p.category === category)
              .map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** Plain GET form so comparisons are shareable links and work without JS. */
export function ComparePicker({ products, a, b }: { products: ProductWithSpecs[]; a?: string; b?: string }) {
  return (
    <form action="/compare" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-end">
      <ProductSelect key={`a-${a}`} name="a" label="Product A" products={products} value={a} />
      <span className="spec-figure hidden pb-3 text-xs text-muted-foreground sm:block">vs</span>
      <ProductSelect key={`b-${b}`} name="b" label="Product B" products={products} value={b} />
      <Button type="submit" size="lg">
        Compare
      </Button>
    </form>
  );
}
