import { PinForm } from "./PinForm";

/** Shown in place of edit controls until the PIN has been entered. */
export function Locked({ next, title = "Locked" }: { next: string; title?: string }) {
  return (
    <div className="card mx-auto max-w-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <PinForm next={next} />
    </div>
  );
}
