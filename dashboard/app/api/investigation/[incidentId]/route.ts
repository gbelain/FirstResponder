import { NextResponse } from "next/server";
import { loadMemory } from "@shared/memory/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const { incidentId } = await params;
  const memory = await loadMemory(incidentId);

  if (!memory) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  return NextResponse.json(memory);
}
