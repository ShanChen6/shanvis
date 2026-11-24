import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getStore, ORDER_STATUSES, type OrderStatus } from "@/lib/store";
import { cn, formatVnd } from "@/lib/utils";
import { OrderStatusBadge, STATUS_LABEL } from "@/components/admin/status-badge";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const raw = (await searchParams).status;
  const status = ORDER_STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : undefined;

  const store = getStore();
  await store.expireStaleOrders();
  const [orders, all] = await Promise.all([store.listOrders({ status, limit: 200 }), store.listOrders({ limit: 500 })]);
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;
  const attention = all.filter((o) => o.needsAttention).length;
  const revenue = all.filter((o) => ["paid", "shipped", "completed"].includes(o.status)).reduce((n, o) => n + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["To ship", count("paid")],
          ["Awaiting payment", count("pending_payment")],
          ["Needs attention", attention],
          ["Paid revenue (last 500)", formatVnd(revenue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("spec-figure mt-1 text-2xl font-semibold", label === "Needs attention" && Number(value) > 0 && "text-warning")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin?status=${s}` : "/admin"}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              status === s ? "bg-secondary text-foreground ring-1 ring-border-strong" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s ? STATUS_LABEL[s] : "All"}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-card text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Placed</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-card/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.publicId}`} className="spec-figure font-medium hover:text-primary">
                    #{o.orderCode}
                  </Link>
                  {o.needsAttention && <AlertTriangle className="ml-2 inline size-3.5 text-warning" aria-label="Needs attention" />}
                </td>
                <td className="spec-figure px-4 py-3 text-muted-foreground">{dateFmt.format(new Date(o.createdAt))}</td>
                <td className="px-4 py-3">
                  {o.customer.name} <span className="spec-figure text-xs text-muted-foreground">{o.customer.phone}</span>
                </td>
                <td className="spec-figure px-4 py-3 text-right">{formatVnd(o.total)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
