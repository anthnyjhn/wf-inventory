"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function PinForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="label" htmlFor="pin">
        Enter PIN to make changes
      </label>
      <div className="flex gap-2">
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          required
          className="input text-center text-2xl tracking-[0.5em]"
        />
        <button className="btn btn-primary btn-lg" disabled={pending}>
          Unlock
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
