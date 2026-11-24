import { requireAdmin } from "@/lib/admin/auth";
import { getEmbeddingModel } from "@/lib/ai/model";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {getEmbeddingModel()
            ? "A search embedding is generated automatically after saving (used by AI search)."
            : "AI is not configured, so no search embedding will be generated. You can generate it later from Inventory."}
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
