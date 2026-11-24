import type { OrderStatus } from "@/lib/store/types";
import { Badge } from "@/components/ui/badge";

const VARIANT: Record<OrderStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  pending_payment: "warning",
  paid: "default",
  shipped: "success",
  completed: "success",
  cancelled: "secondary",
  expired: "secondary",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid — to ship",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
