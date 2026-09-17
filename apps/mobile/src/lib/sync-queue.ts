import { getDb } from "./local-db";

export interface QueueRow {
  id: number;
  kind: string;
  entity_id: string;
  payload: string;
  created_at: string;
}

export async function enqueue(kind: string, entityId: string, payload: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sync_queue (kind, entity_id, payload, created_at) VALUES (?, ?, ?, ?)",
    kind,
    entityId,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}

// Retire les opérations en attente pour une même entité (ex : une photo dont
// l'upload n'a pas encore eu lieu qu'on supprime finalement) — évite d'envoyer
// des écritures devenues inutiles une fois de retour en ligne.
export async function cancelPending(kind: string, entityId: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM sync_queue WHERE kind = ? AND entity_id = ? LIMIT 1",
    kind,
    entityId,
  );
  if (!existing) return false;
  await db.runAsync("DELETE FROM sync_queue WHERE kind = ? AND entity_id = ?", kind, entityId);
  return true;
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) as n FROM sync_queue");
  return row?.n ?? 0;
}

export async function getNextPending(): Promise<QueueRow | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<QueueRow>("SELECT * FROM sync_queue ORDER BY id ASC LIMIT 1");
  return row ?? undefined;
}

export async function removePending(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sync_queue WHERE id = ?", id);
}
