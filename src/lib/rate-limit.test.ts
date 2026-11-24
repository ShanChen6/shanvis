import { describe, expect, it } from "vitest";

import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 100).ok).toBe(true);
    const blocked = check("a", 200);
    expect(blocked).toEqual({ ok: false, retryAfterMs: 800 });
    expect(check("b", 200).ok).toBe(true);
    expect(check("a", 1001).ok).toBe(true);
  });

  it("reads the first forwarded IP", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientKey(new Headers())).toBe("anonymous");
  });
});
