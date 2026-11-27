"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Polls the order's payment status every 2 s while it is pending, so a paid
 * webhook shows up within a few seconds, and counts down the payment window.
 */
export function PaymentStatusWatcher({
  publicId,
  expiresAt,
  demo,
}: {
  publicId: string;
  expiresAt: string;
  demo: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = React.useState<number | null>(null);
  const [simulating, setSimulating] = React.useState(false);

  React.useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${publicId}`, { cache: "no-store" });
        if (res.ok) {
          const { status } = (await res.json()) as { status: string };
          if (status !== "pending_payment" && !stopped) {
            stopped = true;
            router.refresh();
          }
        }
      } catch {
        // network blip: try again next tick
      }
    };
    const id = setInterval(() => {
      setNow(Date.now());
      if (!stopped) void poll();
    }, 2000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(id);
      clearInterval(tick);
    };
  }, [publicId, router]);

  const remaining = now === null ? null : Math.max(0, new Date(expiresAt).getTime() - now);
  const mm = remaining === null ? "--" : String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = remaining === null ? "--" : String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <Loader2 className="size-4 animate-spin text-primary" />
        Waiting for your transfer… this page updates automatically.
      </p>
      <p className="text-sm text-muted-foreground">
        Time left to pay: <span className="spec-figure text-foreground">{mm}:{ss}</span>
      </p>
      {demo && (
        <Button
          type="button"
          variant="secondary"
          disabled={simulating}
          onClick={async () => {
            setSimulating(true);
            await fetch(`/api/payments/demo/${publicId}`, { method: "POST" });
            // Leave the refresh to the poller, like a real webhook would.
          }}
        >
          {simulating ? <Loader2 className="animate-spin" /> : <Zap />}
          Simulate bank transfer (demo)
        </Button>
      )}
    </div>
  );
}
