import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getMaterialStock, listCategories, listUnits } from "@/lib/inventory";
import { setArchivedAction, updateMaterialAction } from "@/app/actions";
import { MaterialForm } from "@/components/MaterialForm";
import { Locked } from "@/components/Locked";
import { ActionForm } from "@/components/ActionForm";

export default async function EditMaterialPage({ params }: PageProps<"/materials/[id]/edit">) {
  const { id } = await params;
  const material = getMaterialStock(Number(id));
  if (!material) notFound();
  if (!(await isAuthed())) return <Locked next={`/materials/${id}/edit`} title="Enter PIN to edit" />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">
        Edit <span className="font-mono">{material.code}</span>
      </h1>
      <div className="card">
        <MaterialForm
          action={updateMaterialAction}
          units={listUnits()}
          categories={listCategories()}
          material={material}
        />
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{material.archived ? "Archived" : "Archive material"}</h2>
          <p className="text-sm text-zinc-500">
            {material.archived
              ? "Hidden from the dashboard. Restore it to track it again."
              : "Hide a material you no longer stock. History is kept."}
          </p>
        </div>
        <ActionForm
          action={setArchivedAction}
          confirm={
            material.archived ? undefined : `Archive ${material.code}? It will be hidden from the dashboard.`
          }
        >
          <input type="hidden" name="id" value={material.id} />
          <input type="hidden" name="archived" value={material.archived ? "0" : "1"} />
          <button className={material.archived ? "btn" : "btn btn-danger"}>
            {material.archived ? "Restore" : "Archive"}
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
