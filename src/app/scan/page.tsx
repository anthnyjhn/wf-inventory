import { ScanForm } from "@/components/ScanForm";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Scan</h1>
      <div className="card">
        <ScanForm />
      </div>
      <p className="text-sm text-zinc-500">
        On a phone, just point the camera at the QR code on the tag – it opens the roll page directly.
      </p>
    </div>
  );
}
