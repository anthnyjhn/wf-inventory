import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { PinForm } from "@/components/PinForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await isAuthed()) redirect(nextPath);
  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="mb-4 text-xl font-bold">Unlock editing</h1>
        <PinForm next={nextPath} />
      </div>
    </div>
  );
}
