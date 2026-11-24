import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { brandLabel } from "@/lib/catalog/filters";
import { getStore } from "@/lib/store";
import { cn, formatVnd } from "@/lib/utils";
import { setActiveAction, updateStockAction } from "@/app/admin/actions";
import { EmbeddingsButton } from "@/components/admin/embeddings-button";
import { Button } from "@/components/ui/button";

export default async function InventoryPage() {
  await requireAdmin();
  const store = getStore();
  const [products, embedded] = await Promise.all([store.listAllProducts(), store.productIdsWithEmbeddings()]);
  products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const missing = products.filter((p) => !embedded.has(p.id)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <EmbeddingsButton missing={missing} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-card text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Search vector</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id} className={cn(!p.is_active && "opacity-50")}>
                <td className="px-4 py-3">
                  <Link href={`/products/${p.slug}`} className="font-medium hover:text-primary">{p.name}</Link>
                  <p className="text-xs text-muted-foreground">{brandLabel(p.brand)}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                <td className="spec-figure px-4 py-3 text-right">{formatVnd(p.price)}</td>
                <td className="px-4 py-3">
                  <form action={updateStockAction} className="flex items-center gap-2">
                    <input type="hidden" name="productId" value={p.id} />
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      max={100000}
                      defaultValue={p.stock}
                      aria-label={`Stock for ${p.name}`}
                      className={cn(
                        "spec-figure h-8 w-20 rounded-lg border border-input bg-muted px-2 text-sm outline-none focus-visible:border-ring",
                        p.stock === 0 && "text-destructive",
                      )}
                    />
                    <Button type="submit" size="sm" variant="ghost">Save</Button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  {embedded.has(p.id) ? (
                    <Check className="size-4 text-success" aria-label="Embedded" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" aria-label="Missing" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <form action={setActiveAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="active" value={String(!p.is_active)} />
                    <Button type="submit" size="sm" variant="outline">{p.is_active ? "Hide" : "Publish"}</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
