"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createContrat(_prevState: string | null, formData: FormData): Promise<string | null> {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientAdresse = String(formData.get("clientAdresse") ?? "").trim();
  const siteName = String(formData.get("siteName") ?? "").trim();
  const siteAdresse = String(formData.get("siteAdresse") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();
  const dateDebut = String(formData.get("dateDebut") ?? "").trim();
  const dateFin = String(formData.get("dateFin") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!clientName || !siteName || !reference) {
    return "Le client, le site et la référence du contrat sont obligatoires.";
  }

  const supabase = await createClient();

  const { data: orgId, error: orgError } = await supabase.rpc("current_org_id");
  if (orgError || !orgId) {
    return "Impossible de déterminer votre organisation. Contacte un administrateur.";
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ org_id: orgId, name: clientName, adresse: clientAdresse || null })
    .select("id")
    .single();
  if (clientError) return `Erreur lors de la création du client : ${clientError.message}`;

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .insert({ org_id: orgId, client_id: client.id, name: siteName, adresse: siteAdresse || null })
    .select("id")
    .single();
  if (siteError) return `Erreur lors de la création du site : ${siteError.message}`;

  const { data: contrat, error: contratError } = await supabase
    .from("contrats")
    .insert({
      org_id: orgId,
      client_id: client.id,
      site_id: site.id,
      reference,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      description: description || null,
    })
    .select("id")
    .single();
  if (contratError) return `Erreur lors de la création du contrat : ${contratError.message}`;

  redirect(`/contrats/${contrat.id}/preparation`);
}
