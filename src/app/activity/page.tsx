import { listActivity } from "@/lib/inventory";
import { ActivityList } from "@/components/ActivityList";

export default function ActivityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Recent activity</h1>
      <div className="card">
        <ActivityList items={listActivity({ limit: 200 })} showMaterial />
      </div>
    </div>
  );
}
