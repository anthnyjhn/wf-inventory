"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/actions";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  /** Ask before submitting. */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <p role="alert" className="mt-2 w-full basis-full text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      {state?.message && !state.error && (
        <p role="status" className="mt-2 w-full basis-full text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
