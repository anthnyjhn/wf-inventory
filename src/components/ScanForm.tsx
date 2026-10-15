"use client";

import { useActionState } from "react";
import { scanAction } from "@/app/actions";

/** Works with USB/Bluetooth barcode scanners, which type the code and press Enter. */
export function ScanForm() {
  const [state, action, pending] = useActionState(scanAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="q" className="label">
        Scan a tag or type a tag / product code
      </label>
      <div className="flex gap-2">
        <input
          id="q"
          name="q"
          autoFocus
          autoComplete="off"
          placeholder="e.g. 2572-004"
          className="input font-mono text-lg"
        />
        <button className="btn btn-primary" disabled={pending}>
          Go
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
