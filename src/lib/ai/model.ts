import "server-only";

import { createGoogle } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

/** Default Gemini model; override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export function isAiConfigured() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

/** Gemini language model, or null when no API key is configured. */
export function getLanguageModel(): LanguageModel | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  const google = createGoogle({ apiKey });
  return google(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
}
