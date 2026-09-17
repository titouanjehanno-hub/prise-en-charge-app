"use server";

import { revalidatePath } from "next/cache";
import { mapContratEquipement } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ContratEquipement, NewContratEquipementInput } from "@/lib/types";

export async function addContratEquipement(
  contratId: string,
  equipementTypeId: string,
  designation: string,
): Promise<ContratEquipement> {
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");

  const { data, error } = await supabase
    .from("contrat_equipements")
    .insert({
      org_id: orgId,
      contrat_id: contratId,
      equipement_type_id: equipementTypeId,
      designation,
      quantite: 1,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/contrats/${contratId}/preparation`);
  return mapContratEquipement(data);
}

export async function updateContratEquipement(
  id: string,
  patch: {
    designation?: string;
    batiment?: string;
    etage?: string;
    local?: string;
    quantite?: number;
    estEnsemble?: boolean;
    referenceContractuelle?: string;
    numeroSerie?: string;
    notes?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.designation !== undefined) dbPatch.designation = patch.designation || null;
  if (patch.batiment !== undefined) dbPatch.batiment = patch.batiment || null;
  if (patch.etage !== undefined) dbPatch.etage = patch.etage || null;
  if (patch.local !== undefined) dbPatch.local = patch.local || null;
  if (patch.quantite !== undefined) dbPatch.quantite = patch.quantite;
  if (patch.estEnsemble !== undefined) dbPatch.est_ensemble = patch.estEnsemble;
  if (patch.referenceContractuelle !== undefined) {
    dbPatch.reference_contractuelle = patch.referenceContractuelle || null;
  }
  if (patch.numeroSerie !== undefined) dbPatch.numero_serie = patch.numeroSerie || null;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes || null;

  const { error } = await supabase.from("contrat_equipements").update(dbPatch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeContratEquipement(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contrat_equipements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkAddContratEquipements(
  contratId: string,
  items: NewContratEquipementInput[],
): Promise<ContratEquipement[]> {
  if (items.length === 0) return [];
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");

  const rows = items.map((item) => ({
    org_id: orgId,
    contrat_id: contratId,
    equipement_type_id: item.equipementTypeId,
    designation: item.designation || null,
    batiment: item.batiment || null,
    etage: item.etage || null,
    local: item.local || null,
    quantite: item.quantite,
    est_ensemble: item.estEnsemble ?? false,
    reference_contractuelle: item.referenceContractuelle || null,
    numero_serie: item.numeroSerie || null,
    notes: item.notes || null,
  }));

  const { data, error } = await supabase.from("contrat_equipements").insert(rows).select("*");
  if (error) throw new Error(error.message);

  revalidatePath(`/contrats/${contratId}/preparation`);
  return (data ?? []).map(mapContratEquipement);
}
