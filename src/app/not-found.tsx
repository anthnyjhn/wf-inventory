import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="mb-2 text-xl font-bold">Not found</h1>
      <p className="mb-4 text-zinc-600">
        That tag or material doesn&rsquo;t exist (it may have been removed).
      </p>
      <div className="flex justify-center gap-2">
        <Link href="/scan" className="btn">
          Scan again
        </Link>
        <Link href="/" className="btn btn-primary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
