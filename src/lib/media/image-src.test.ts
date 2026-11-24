import { describe, expect, it } from "vitest";

import { isOptimizableImage } from "./image-src";

describe("isOptimizableImage", () => {
  it("accepts local /images files and Supabase public storage objects", () => {
    expect(isOptimizableImage("/images/products/sony-a7-iv.webp")).toBe(true);
    expect(isOptimizableImage("https://abcd1234.supabase.co/storage/v1/object/public/product-images/a7iv.avif")).toBe(true);
  });

  it("rejects hosts and paths next/image would refuse", () => {
    for (const src of [
      null,
      undefined,
      "",
      "/favicon.ico",
      "/images/a.webp?v=2",
      "http://abcd.supabase.co/storage/v1/object/public/x.webp",
      "https://abcd.supabase.co/storage/v1/object/sign/x.webp",
      "https://evil.example.com/storage/v1/object/public/x.webp",
      "https://supabase.co.evil.com/storage/v1/object/public/x.webp",
      "//abcd.supabase.co/storage/v1/object/public/x.webp",
    ]) {
      expect(isOptimizableImage(src), String(src)).toBe(false);
    }
  });
});
