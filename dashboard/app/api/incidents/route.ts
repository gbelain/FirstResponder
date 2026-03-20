import { NextResponse } from "next/server";
import { listIncidents, loadMemory } from "@/utils/memory/storage";

export async function GET() {
  const incidentIds = await listIncidents();

  const incidents = await Promise.all(
    incidentIds.map(async (id) => {
      const memory = await loadMemory(id);
      return memory
        ? {
            id: memory.incident_id,
            name: memory.incident_name,
            status: memory.metadata.status,
            severity: memory.metadata.severity,
            started_at: memory.metadata.started_at,
          }
        : null;
    })
  );

  return NextResponse.json(incidents.filter(Boolean));
}
