"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { callGoogleVisionOcr, guessPlaqueValues } from "@/lib/plaque-ocr";
import type { EquipementReleve, EtatEquipement, Photo, PhotoType, PlaqueSignaletiqueChamp } from "@/lib/types";

function mapEquipementReleveRow(row: {
  id: string;
  prise_en_charge_id: string;
  contrat_equipement_id: string | null;
  equipement_type_id: string;
  est_hors_contrat: boolean;
  designation: string | null;
  localisation: string | null;
  etat: EtatEquipement | null;
  plaque_signaletique: Record<string, string> | null;
  commentaire: string | null;
}): EquipementReleve {
  return {
    id: row.id,
    priseEnChargeId: row.prise_en_charge_id,
    contratEquipementId: row.contrat_equipement_id ?? undefined,
    equipementTypeId: row.equipement_type_id,
    estHorsContrat: row.est_hors_contrat,
    designation: row.designation ?? undefined,
    localisation: row.localisation ?? undefined,
    etat: row.etat ?? undefined,
    plaqueSignaletique: row.plaque_signaletique ?? {},
    commentaire: row.commentaire ?? undefined,
  };
}

export async function mettreEnPause(pecId: string, contratId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("prises_en_charge").update({ statut: "en_pause" }).eq("id", pecId);
  if (error) throw new Error(error.message);
  revalidatePath(`/contrats/${contratId}/prises-en-charge/${pecId}/saisie`);
}

export async function reprendre(pecId: string, contratId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("prises_en_charge").update({ statut: "en_cours" }).eq("id", pecId);
  if (error) throw new Error(error.message);
  revalidatePath(`/contrats/${contratId}/prises-en-charge/${pecId}/saisie`);
}

export async function terminer(pecId: string, contratId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prises_en_charge")
    .update({ statut: "terminee", date_realisation: new Date().toISOString().slice(0, 10) })
    .eq("id", pecId);
  if (error) throw new Error(error.message);
  revalidatePath(`/contrats/${contratId}/prises-en-charge/${pecId}/saisie`);
  revalidatePath(`/contrats/${contratId}/prises-en-charge`);
}

export interface SaveEquipementReleveInput {
  id?: string;
  priseEnChargeId: string;
  contratEquipementId?: string;
  equipementTypeId: string;
  estHorsContrat: boolean;
  designation?: string;
  localisation?: string;
  etat?: EtatEquipement;
  plaqueSignaletique: Record<string, string>;
  commentaire?: string;
}

export async function saveEquipementReleve(input: SaveEquipementReleveInput): Promise<EquipementReleve> {
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("equipements_releves")
    .upsert(
      {
        id: input.id ?? randomUUID(),
        org_id: orgId,
        prise_en_charge_id: input.priseEnChargeId,
        contrat_equipement_id: input.contratEquipementId ?? null,
        equipement_type_id: input.equipementTypeId,
        est_hors_contrat: input.estHorsContrat,
        designation: input.designation || null,
        localisation: input.localisation || null,
        etat: input.etat ?? null,
        plaque_signaletique: input.plaqueSignaletique,
        commentaire: input.commentaire || null,
        created_by: userData.user?.id,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  return mapEquipementReleveRow(data);
}

export async function uploadPhoto(formData: FormData): Promise<Photo> {
  const supabase = await createClient();
  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) throw new Error("Organisation introuvable.");
  const { data: userData } = await supabase.auth.getUser();

  const file = formData.get("file") as File | null;
  const equipementReleveId = String(formData.get("equipementReleveId") ?? "");
  const type = String(formData.get("type") ?? "generale") as PhotoType;
  if (!file || !equipementReleveId) throw new Error("Fichier ou équipement manquant.");

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const contentType = file.type || (extension === "png" ? "image/png" : "image/jpeg");
  const id = randomUUID();
  const storagePath = `${orgId}/${equipementReleveId}/${id}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(storagePath, arrayBuffer, { contentType, upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("photos")
    .insert({
      id,
      org_id: orgId,
      equipement_releve_id: equipementReleveId,
      storage_path: storagePath,
      type,
      created_by: userData.user?.id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { data: signed } = await supabase.storage.from("photos").createSignedUrl(storagePath, 60 * 60);
  return { id: data.id, equipementReleveId: data.equipement_releve_id, type: data.type, url: signed?.signedUrl ?? "" };
}

export async function deletePhoto(photoId: string): Promise<void> {
  const supabase = await createClient();
  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  if (photo?.storage_path) {
    const { error: storageError } = await supabase.storage.from("photos").remove([photo.storage_path]);
    if (storageError) throw new Error(storageError.message);
  }
  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
}

export async function addActionApeTechnicien(
  priseEnChargeId: string,
  equipementReleveId: string,
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
      prise_en_charge_id: priseEnChargeId,
      equipement_releve_id: equipementReleveId,
      origine: "technicien",
      description: description.trim(),
      created_by: userData.user?.id,
    })
    .select("id, description")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteActionApe(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("actions_ape").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface ReconnaissancePlaqueResult {
  rawText: string;
  guesses: Record<string, string>;
}

export async function reconnaitrePlaque(formData: FormData): Promise<ReconnaissancePlaqueResult> {
  const file = formData.get("file") as File | null;
  const schemaRaw = String(formData.get("schema") ?? "[]");
  if (!file) throw new Error("Aucune photo fournie.");

  const schema = JSON.parse(schemaRaw) as PlaqueSignaletiqueChamp[];
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const rawText = await callGoogleVisionOcr(base64);
  const guesses = guessPlaqueValues(schema, rawText);
  return { rawText, guesses };
}
