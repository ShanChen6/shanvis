import { describe, expect, it } from "vitest";

import { createSessionToken, passwordMatches, SESSION_TTL_MS, verifySessionToken } from "./session";

describe("admin session tokens", () => {
  it("accepts a fresh token signed with the same secret", () => {
    expect(verifySessionToken(createSessionToken("s3cret-password"), "s3cret-password")).toBe(true);
  });

  it("rejects expired, tampered, foreign or malformed tokens", () => {
    const now = 1_000_000;
    const token = createSessionToken("secret", now);
    expect(verifySessionToken(token, "secret", now + SESSION_TTL_MS + 1)).toBe(false);
    expect(verifySessionToken(token, "other-secret", now)).toBe(false);
    const [exp, mac] = token.split(".");
    expect(verifySessionToken(`${Number(exp) + 999_999}.${mac}`, "secret", now)).toBe(false);
    expect(verifySessionToken(undefined, "secret")).toBe(false);
    expect(verifySessionToken("garbage", "secret")).toBe(false);
    expect(verifySessionToken(`${exp}.zz`, "secret", now)).toBe(false);
  });

  it("compares passwords exactly", () => {
    expect(passwordMatches("correct horse", "correct horse")).toBe(true);
    expect(passwordMatches("correct hors", "correct horse")).toBe(false);
  });
});
