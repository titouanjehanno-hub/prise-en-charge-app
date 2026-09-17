"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtatEquipement } from "@/lib/types";

function parseInputFromFormData(formData: FormData) {
  const equipementTypeId = String(formData.get("equipementTypeId") ?? "").trim();
  const etats = formData.getAll("etats").map(String) as EtatEquipement[];
  const plaqueChampCle = String(formData.get("plaqueChampCle") ?? "").trim();
  const plaqueChampValeursRaw = String(formData.get("plaqueChampValeurs") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "energie").trim();
  const priorite = String(formData.get("priorite") ?? "").trim();

  const plaqueChampValeurs = plaqueChampValeursRaw
    ? plaqueChampValeursRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  return {
    equipement_type_id: equipementTypeId || null,
    etats: etats.length > 0 ? etats : null,
    plaque_champ_cle: plaqueChampCle || null,
    plaque_champ_valeurs: plaqueChampCle && plaqueChampValeurs.length > 0 ? plaqueChampValeurs : null,
    action,
    categorie,
    priorite: categorie === "securite" && priorite ? priorite : null,
  };
}

export async function createRegleApe(_prevState: string | null, formData: FormData): Promise<string | null> {
  const input = parseInputFromFormData(formData);
  if (!input.action) return "L'action est obligatoire.";

  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) return "Impossible de déterminer votre organisation.";

  const { error } = await supabase.from("regles_ape").insert({ ...input, org_id: orgId });
  if (error) return `Erreur : ${error.message}`;

  redirect("/regles-ape");
}

export async function updateRegleApe(
  id: string,
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const input = parseInputFromFormData(formData);
  if (!input.action) return "L'action est obligatoire.";

  const supabase = await createClient();
  const { error } = await supabase.from("regles_ape").update(input).eq("id", id);
  if (error) return `Erreur : ${error.message}`;

  redirect("/regles-ape");
}

export async function deleteRegleApe(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("regles_ape").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
