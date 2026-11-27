import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { createSessionToken, passwordMatches, SESSION_TTL_MS, verifySessionToken } from "./session";

const COOKIE = "shanvis_admin";
const MIN_PASSWORD_LENGTH = 12;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

/** Admin is enabled only with a reasonably long ADMIN_PASSWORD. */
export function isAdminConfigured() {
  return (process.env.ADMIN_PASSWORD?.length ?? 0) >= MIN_PASSWORD_LENGTH;
}

export async function isAdmin() {
  await connection(); // per-request: session expiry depends on the current time
  if (!isAdminConfigured()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  return verifySessionToken(token, secret());
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function signIn(password: string) {
  if (!isAdminConfigured() || !passwordMatches(password, process.env.ADMIN_PASSWORD!)) return false;
  (await cookies()).set(COOKIE, createSessionToken(secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}
