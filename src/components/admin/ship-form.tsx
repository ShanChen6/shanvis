"use client";

import { useActionState } from "react";
import { Truck } from "lucide-react";

import { markShippedAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/checkout/address-fields";

export function ShipForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(markShippedAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
        Carrier tracking code
        <input name="trackingCode" required maxLength={40} className={fieldClass} placeholder="e.g. GHN tracking code" />
      </label>
      <Button type="submit" disabled={pending}>
        <Truck /> Mark shipped
      </Button>
      {state && <p className={`w-full text-sm ${state.ok ? "text-success" : "text-destructive"}`}>{state.message}</p>}
    </form>
  );
}
