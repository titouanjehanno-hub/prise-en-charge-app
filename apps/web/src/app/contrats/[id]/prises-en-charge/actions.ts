"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function creerNouvellePriseEnCharge(contratId: string): Promise<string> {
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");
  const { data: contrat, error: contratError } = await supabase
    .from("contrats")
    .select("site_id")
    .eq("id", contratId)
    .single();
  if (contratError || !contrat) throw new Error("Contrat introuvable.");
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("prises_en_charge")
    .insert({
      id: randomUUID(),
      org_id: orgId,
      contrat_id: contratId,
      site_id: contrat.site_id,
      technicien_id: userData.user?.id,
      preparateur_id: userData.user?.id,
      statut: "en_cours",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/contrats/${contratId}/prises-en-charge`);
  return data.id;
}
