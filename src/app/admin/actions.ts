"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin, signIn, signOut } from "@/lib/admin/auth";
import { formDataToObject, productFormSchema } from "@/lib/admin/product-schema";
import { embedProduct } from "@/lib/ai/embeddings";
import { embeddingModelId, getEmbeddingModel } from "@/lib/ai/model";
import { CATALOG_TAG } from "@/lib/catalog/source";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getStore, isStoreError } from "@/lib/store";
import type { ProductWithSpecs } from "@/types/catalog";

export type FormState = { ok: boolean; message: string } | null;

const loginLimit = createRateLimiter({ limit: 5, windowMs: 60_000 });

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (!loginLimit(clientKey(await headers())).ok) return { ok: false, message: "Too many attempts. Wait a minute." };
  const password = form.get("password");
  if (typeof password !== "string" || !(await signIn(password))) return { ok: false, message: "Wrong password." };
  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin/login");
}

/* ------------------------------- orders -------------------------------- */

const id = z.string().min(1).max(64);

export async function cancelOrderAction(form: FormData) {
  await requireAdmin();
  const orderId = id.parse(form.get("orderId"));
  try {
    await getStore().cancelOrder(orderId);
  } catch (error) {
    if (!isStoreError(error)) throw error;
  }
  updateTag(CATALOG_TAG);
}

export async function markShippedAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = z
    .object({ orderId: id, trackingCode: z.string().trim().min(3, "Enter the tracking code.").max(40) })
    .safeParse({ orderId: form.get("orderId"), trackingCode: form.get("trackingCode") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  try {
    await getStore().markShipped(parsed.data.orderId, parsed.data.trackingCode);
    return { ok: true, message: "Marked as shipped." };
  } catch (error) {
    if (isStoreError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

/* ------------------------------ inventory ------------------------------ */

export async function updateStockAction(form: FormData) {
  await requireAdmin();
  const { productId, stock } = z
    .object({ productId: id, stock: z.coerce.number().int().min(0).max(100_000) })
    .parse({ productId: form.get("productId"), stock: form.get("stock") });
  await getStore().updateProduct(productId, { stock });
  updateTag(CATALOG_TAG);
}

export async function setActiveAction(form: FormData) {
  await requireAdmin();
  const productId = id.parse(form.get("productId"));
  await getStore().updateProduct(productId, { isActive: form.get("active") === "true" });
  updateTag(CATALOG_TAG);
}

async function embedAndStore(product: ProductWithSpecs): Promise<"generated" | "skipped" | "failed"> {
  const model = getEmbeddingModel();
  if (!model) return "skipped";
  try {
    const { content, embedding } = await embedProduct(model, product);
    await getStore().upsertEmbedding(product.id, content, embedding, embeddingModelId());
    return "generated";
  } catch (error) {
    console.error(`Embedding failed for ${product.slug}`, error);
    return "failed";
  }
}

export async function generateMissingEmbeddingsAction(): Promise<FormState> {
  await requireAdmin();
  if (!getEmbeddingModel()) return { ok: false, message: "Set GOOGLE_GENERATIVE_AI_API_KEY to generate embeddings." };
  const store = getStore();
  const have = await store.productIdsWithEmbeddings();
  const missing = (await store.listAllProducts()).filter((p) => !have.has(p.id));
  let done = 0;
  for (const p of missing) if ((await embedAndStore(p)) === "generated") done++;
  return { ok: done === missing.length, message: `Generated ${done} of ${missing.length} missing embeddings.` };
}

/* ------------------------------- products ------------------------------ */

export async function createProductAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = productFormSchema.safeParse(formDataToObject(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  let product: ProductWithSpecs;
  try {
    product = await getStore().createProduct(parsed.data);
  } catch (error) {
    if (isStoreError(error)) {
      return { ok: false, message: error.code === "duplicate_slug" ? "That slug is already used." : error.message };
    }
    throw error;
  }
  updateTag(CATALOG_TAG);

  const embedding = await embedAndStore(product);
  const note = {
    generated: "Search embedding generated.",
    skipped: "Embedding skipped (AI not configured).",
    failed: "Embedding failed — retry from Inventory.",
  }[embedding];
  return { ok: true, message: `Created “${product.name}” (/products/${product.slug}). ${note}` };
}
