/**
 * Image sources that next/image is configured to optimize (see
 * `images.localPatterns` / `images.remotePatterns` in next.config.ts).
 * Anything else would make next/image throw while rendering, so callers fall
 * back to a placeholder instead of breaking the page over one bad URL.
 */
const LOCAL = /^\/images\/[^?#]+$/;
const SUPABASE_PUBLIC = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^?#]+$/i;

export function isOptimizableImage(src: string | null | undefined): src is string {
  if (!src) return false;
  return LOCAL.test(src) || SUPABASE_PUBLIC.test(src);
}
