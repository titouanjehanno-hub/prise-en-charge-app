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
