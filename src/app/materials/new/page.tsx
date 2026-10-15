import { isAuthed } from "@/lib/auth";
import { listCategories, listUnits } from "@/lib/inventory";
import { createMaterialAction } from "@/app/actions";
import { MaterialForm } from "@/components/MaterialForm";
import { Locked } from "@/components/Locked";

export default async function NewMaterialPage() {
  if (!(await isAuthed())) return <Locked next="/materials/new" title="Enter PIN to add a material" />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Add material</h1>
      <div className="card">
        <MaterialForm action={createMaterialAction} units={listUnits()} categories={listCategories()} />
      </div>
    </div>
  );
}
