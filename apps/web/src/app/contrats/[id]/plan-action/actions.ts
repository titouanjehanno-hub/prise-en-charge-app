"use server";

import { createClient } from "@/lib/supabase/server";
import type { StatutAction } from "@/lib/types";

export interface UpdateActionMaintenancePatch {
  statut?: StatutAction;
  dateDebut?: string | null;
  dateEcheance?: string | null;
}

export async function updateActionMaintenance(id: string, patch: UpdateActionMaintenancePatch): Promise<void> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.statut !== undefined) {
    dbPatch.statut = patch.statut;
    dbPatch.date_realisation = patch.statut === "fait" ? new Date().toISOString().slice(0, 10) : null;
  }
  if (patch.dateDebut !== undefined) dbPatch.date_debut = patch.dateDebut || null;
  if (patch.dateEcheance !== undefined) dbPatch.date_echeance = patch.dateEcheance || null;

  const { error } = await supabase.from("actions_maintenance").update(dbPatch).eq("id", id);
  if (error) throw new Error(error.message);
}
