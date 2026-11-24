"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";

import { loginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/checkout/address-fields";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
        Admin password
      </label>
      <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus className={fieldClass} />
      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Lock />} Sign in
      </Button>
    </form>
  );
}
