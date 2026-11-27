import type { Metadata } from "next";

import { isAdminConfigured } from "@/lib/admin/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <Container className="flex max-w-sm flex-col gap-6 py-24">
      <div>
        <p className="spec-figure text-[11px] uppercase tracking-[0.18em] text-primary">SHANVIS Admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Sign in</h1>
      </div>
      {isAdminConfigured() ? (
        <LoginForm />
      ) : (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Admin is disabled. Set <code className="spec-figure">ADMIN_PASSWORD</code> (at least 12 characters) in the server environment.
        </p>
      )}
    </Container>
  );
}
