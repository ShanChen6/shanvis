"use client";

import { useActionState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { generateMissingEmbeddingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function EmbeddingsButton({ missing }: { missing: number }) {
  const [state, action, pending] = useActionState(generateMissingEmbeddingsAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="secondary" size="sm" disabled={pending || missing === 0}>
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate {missing} missing embedding{missing === 1 ? "" : "s"}
      </Button>
      {state && <span className={`text-xs ${state.ok ? "text-success" : "text-warning"}`}>{state.message}</span>}
    </form>
  );
}
