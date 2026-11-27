import Link from "next/link";

import { formatVnd } from "@/lib/utils";
import type { ProductWithSpecs } from "@/types/catalog";
import { specRows } from "@/components/product/spec-table";

/** Side-by-side specs, rows aligned by label; differing values are highlighted. */
export function SpecDiffTable({ a, b }: { a: ProductWithSpecs; b: ProductWithSpecs }) {
  const rowsA = new Map(specRows(a));
  const rowsB = new Map(specRows(b));
  const labels = [...new Set([...rowsA.keys(), ...rowsB.keys()])];
  const rows: [string, string, string][] = [
    ["Price", formatVnd(a.price), formatVnd(b.price)],
    ...labels.map((l) => [l, rowsA.get(l) ?? "—", rowsB.get(l) ?? "—"] as [string, string, string]),
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="w-1/4 px-5 py-4 font-normal text-muted-foreground">
              Spec
            </th>
            {[a, b].map((p) => (
              <th key={p.slug} scope="col" className="px-5 py-4 font-semibold">
                <Link href={`/products/${p.slug}`} className="hover:text-primary">
                  {p.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([label, va, vb]) => {
            const differs = va !== vb;
            return (
              <tr key={label}>
                <th scope="row" className="px-5 py-3 text-left font-normal text-muted-foreground">
                  {label}
                </th>
                <td className={`spec-figure px-5 py-3 ${differs ? "text-foreground" : "text-muted-foreground"}`}>{va}</td>
                <td className={`spec-figure px-5 py-3 ${differs ? "text-foreground" : "text-muted-foreground"}`}>{vb}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
