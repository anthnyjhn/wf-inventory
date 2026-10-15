"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="mb-2 text-xl font-bold">Something went wrong</h1>
      <p className="mb-4 text-sm text-zinc-600">{error.message}</p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
