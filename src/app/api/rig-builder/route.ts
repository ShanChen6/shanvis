import { createAgentUIStreamResponse } from "ai";

import { getLanguageModel } from "@/lib/ai/model";
import { createRigAgent } from "@/lib/ai/rig-agent";
import { getCatalog } from "@/lib/catalog/source";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const MAX_MESSAGES = 16;
const MAX_TEXT_CHARS = 2000;

const rateLimit = createRateLimiter({ limit: 12, windowMs: 60_000 });

function json(status: number, error: string, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

/** Total characters of user-typed text in the conversation's latest message. */
function lastUserTextLength(messages: unknown[]) {
  const last = messages.at(-1) as { role?: string; parts?: { type?: string; text?: string }[] } | undefined;
  if (last?.role !== "user" || !Array.isArray(last.parts)) return 0;
  return last.parts.reduce((n, p) => n + (p?.type === "text" && typeof p.text === "string" ? p.text.length : 0), 0);
}

export async function POST(request: Request) {
  const model = getLanguageModel();
  if (!model) {
    return json(503, "The AI Rig Builder is not configured on this server (missing GOOGLE_GENERATIVE_AI_API_KEY).");
  }

  const limited = rateLimit(clientKey(request.headers));
  if (!limited.ok) {
    return json(429, "Too many requests. Please wait a moment and try again.", {
      "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, "Invalid JSON body.");
  }
  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return json(400, "Expected a non-empty messages array.");
  if (lastUserTextLength(messages) > MAX_TEXT_CHARS) return json(413, `Message too long (max ${MAX_TEXT_CHARS} characters).`);

  const agent = createRigAgent({ model, loadCatalog: getCatalog });
  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages.slice(-MAX_MESSAGES),
    abortSignal: request.signal,
  });
}
