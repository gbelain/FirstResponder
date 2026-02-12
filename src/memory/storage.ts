/**
 * Memory file persistence layer
 * Handles reading/writing incident memory JSON files
 */

import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { IncidentMemory } from "../types/memory.js";

const MEMORY_DIR = "investigations";

function getMemoryFilePath(incidentId: string): string {
  return join(process.cwd(), MEMORY_DIR, `${incidentId}.json`);
}

export async function ensureMemoryDir(): Promise<void> {
  const dir = join(process.cwd(), MEMORY_DIR);
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadMemory(incidentId: string): Promise<IncidentMemory | null> {
  const filePath = getMemoryFilePath(incidentId);
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as IncidentMemory;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveMemory(memory: IncidentMemory): Promise<void> {
  await ensureMemoryDir();
  const filePath = getMemoryFilePath(memory.incident_id);
  const content = JSON.stringify(memory, null, 2);
  await writeFile(filePath, content, "utf-8");
}

export async function memoryExists(incidentId: string): Promise<boolean> {
  const filePath = getMemoryFilePath(incidentId);
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listIncidents(): Promise<string[]> {
  const dir = join(process.cwd(), MEMORY_DIR);
  try {
    const files = await readdir(dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}
