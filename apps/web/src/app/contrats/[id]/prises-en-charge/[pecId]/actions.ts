"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateSynthese(
  pecId: string,
  patch: { synthesePointsForts?: string; synthesePointsFaibles?: string },
): Promise<void> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.synthesePointsForts !== undefined) dbPatch.synthese_points_forts = patch.synthesePointsForts || null;
  if (patch.synthesePointsFaibles !== undefined) {
    dbPatch.synthese_points_faibles = patch.synthesePointsFaibles || null;
  }
  const { error } = await supabase.from("prises_en_charge").update(dbPatch).eq("id", pecId);
  if (error) throw new Error(error.message);
}

export async function validerPriseEnCharge(pecId: string, contratId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("prises_en_charge").update({ statut: "validee" }).eq("id", pecId);
  if (error) throw new Error(error.message);
  revalidatePath(`/contrats/${contratId}/prises-en-charge/${pecId}`);
}

export async function addPropositionIngenieur(
  pecId: string,
  description: string,
): Promise<{ id: string; description: string }> {
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("actions_ape")
    .insert({
      org_id: orgId,
      prise_en_charge_id: pecId,
      equipement_releve_id: null,
      origine: "ingenieur",
      description: description.trim(),
      created_by: userData.user?.id,
    })
    .select("id, description")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteActionApeManuelle(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("actions_ape").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
