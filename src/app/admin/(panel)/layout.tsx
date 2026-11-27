import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/admin/auth";
import { isDemoStore } from "@/lib/store";
import { logoutAction } from "@/app/admin/actions";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/products/new", label: "New product" },
];

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container className="py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
          <span className="spec-figure mr-3 text-[11px] uppercase tracking-[0.18em] text-primary">Admin</span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <Button size="sm" variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </div>
      {isDemoStore() && (
        <p className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          Demo store: data lives in server memory and resets on restart. Connect Supabase to persist it.
        </p>
      )}
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-card" />}>
        <Guard>{children}</Guard>
      </Suspense>
    </Container>
  );
}
