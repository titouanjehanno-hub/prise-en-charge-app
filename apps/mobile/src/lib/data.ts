import { supabase } from "./supabase";
import type {
  Contrat,
  ContratEquipement,
  ContratListItem,
  EquipementReleve,
  EquipementType,
  LotTechnique,
  PriseEnCharge,
} from "./types";

function mapContrat(row: {
  id: string;
  client_id: string;
  site_id: string;
  reference: string;
  date_debut: string | null;
  date_fin: string | null;
  description: string | null;
}): Contrat {
  return {
    id: row.id,
    clientId: row.client_id,
    siteId: row.site_id,
    reference: row.reference,
    dateDebut: row.date_debut ?? undefined,
    dateFin: row.date_fin ?? undefined,
    description: row.description ?? undefined,
  };
}

function mapLot(row: { id: string; code: string; name: string }): LotTechnique {
  return { id: row.id, code: row.code, name: row.name };
}

function mapType(row: {
  id: string;
  lot_technique_id: string;
  code: string;
  name: string;
  plaque_signaletique_schema: EquipementType["plaqueSignaletiqueSchema"];
}): EquipementType {
  return {
    id: row.id,
    lotTechniqueId: row.lot_technique_id,
    code: row.code,
    name: row.name,
    plaqueSignaletiqueSchema: row.plaque_signaletique_schema ?? [],
  };
}

function mapContratEquipement(row: {
  id: string;
  contrat_id: string;
  equipement_type_id: string;
  designation: string | null;
  batiment: string | null;
  etage: string | null;
  local: string | null;
  quantite: number;
  est_ensemble: boolean;
  reference_contractuelle: string | null;
  numero_serie: string | null;
  notes: string | null;
}): ContratEquipement {
  return {
    id: row.id,
    contratId: row.contrat_id,
    equipementTypeId: row.equipement_type_id,
    designation: row.designation ?? undefined,
    batiment: row.batiment ?? undefined,
    etage: row.etage ?? undefined,
    local: row.local ?? undefined,
    quantite: row.quantite,
    estEnsemble: row.est_ensemble,
    referenceContractuelle: row.reference_contractuelle ?? undefined,
    numeroSerie: row.numero_serie ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapPriseEnCharge(row: {
  id: string;
  contrat_id: string;
  site_id: string;
  technicien_id: string | null;
  statut: PriseEnCharge["statut"];
  date_realisation: string | null;
}): PriseEnCharge {
  return {
    id: row.id,
    contratId: row.contrat_id,
    siteId: row.site_id,
    technicienId: row.technicien_id ?? undefined,
    statut: row.statut,
    dateRealisation: row.date_realisation ?? undefined,
  };
}

function mapEquipementReleve(row: {
  id: string;
  prise_en_charge_id: string;
  contrat_equipement_id: string | null;
  equipement_type_id: string;
  est_hors_contrat: boolean;
  designation: string | null;
  localisation: string | null;
  etat: EquipementReleve["etat"] | null;
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

async function getCurrentOrgId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_org_id");
  if (error || !data) throw new Error("Organisation introuvable.");
  return data as string;
}

export async function getContratsWithRelations(): Promise<ContratListItem[]> {
  const { data, error } = await supabase
    .from("contrats")
    .select("*, clients(name), sites(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...mapContrat(row),
    clientName: (row.clients as { name: string } | null)?.name ?? "—",
    siteName: (row.sites as { name: string } | null)?.name ?? "—",
  }));
}

export async function getContrat(contratId: string): Promise<Contrat | undefined> {
  const { data, error } = await supabase.from("contrats").select("*").eq("id", contratId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapContrat(data) : undefined;
}

export async function getReferentiel(): Promise<{
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
}> {
  const [lotsRes, typesRes] = await Promise.all([
    supabase.from("lots_techniques").select("*").order("name"),
    supabase.from("equipement_types").select("*").order("name"),
  ]);
  if (lotsRes.error) throw new Error(lotsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  return {
    lotsTechniques: (lotsRes.data ?? []).map(mapLot),
    equipementTypes: (typesRes.data ?? []).map(mapType),
  };
}

export async function getEquipementType(id: string): Promise<EquipementType | undefined> {
  const { data, error } = await supabase.from("equipement_types").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapType(data) : undefined;
}

export async function getContratEquipements(contratId: string): Promise<ContratEquipement[]> {
  const { data, error } = await supabase
    .from("contrat_equipements")
    .select("*")
    .eq("contrat_id", contratId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContratEquipement);
}

export async function getContratEquipement(id: string): Promise<ContratEquipement | undefined> {
  const { data, error } = await supabase.from("contrat_equipements").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapContratEquipement(data) : undefined;
}

export async function getOrCreatePriseEnCharge(contrat: Contrat): Promise<PriseEnCharge> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Utilisateur non connecté.");

  const { data: existing, error: findError } = await supabase
    .from("prises_en_charge")
    .select("*")
    .eq("contrat_id", contrat.id)
    .eq("technicien_id", userId)
    .neq("statut", "terminee")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existing) return mapPriseEnCharge(existing);

  const orgId = await getCurrentOrgId();
  const { data: created, error: createError } = await supabase
    .from("prises_en_charge")
    .insert({
      org_id: orgId,
      contrat_id: contrat.id,
      site_id: contrat.siteId,
      technicien_id: userId,
      statut: "en_cours",
    })
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return mapPriseEnCharge(created);
}

export async function getPriseEnCharge(id: string): Promise<PriseEnCharge | undefined> {
  const { data, error } = await supabase.from("prises_en_charge").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPriseEnCharge(data) : undefined;
}

export async function getEquipementsReleves(priseEnChargeId: string): Promise<EquipementReleve[]> {
  const { data, error } = await supabase
    .from("equipements_releves")
    .select("*")
    .eq("prise_en_charge_id", priseEnChargeId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipementReleve);
}

export async function getEquipementReleve(id: string): Promise<EquipementReleve | undefined> {
  const { data, error } = await supabase.from("equipements_releves").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapEquipementReleve(data) : undefined;
}

export interface SaveEquipementReleveInput {
  id?: string;
  priseEnChargeId: string;
  contratEquipementId?: string;
  equipementTypeId: string;
  estHorsContrat: boolean;
  designation?: string;
  localisation?: string;
  etat?: EquipementReleve["etat"];
  plaqueSignaletique: Record<string, string>;
  commentaire?: string;
}

export async function saveEquipementReleve(input: SaveEquipementReleveInput): Promise<EquipementReleve> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (input.id) {
    const { data, error } = await supabase
      .from("equipements_releves")
      .update({
        designation: input.designation || null,
        localisation: input.localisation || null,
        etat: input.etat || null,
        plaque_signaletique: input.plaqueSignaletique,
        commentaire: input.commentaire || null,
      })
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapEquipementReleve(data);
  }

  const orgId = await getCurrentOrgId();
  const { data, error } = await supabase
    .from("equipements_releves")
    .insert({
      org_id: orgId,
      prise_en_charge_id: input.priseEnChargeId,
      contrat_equipement_id: input.contratEquipementId ?? null,
      equipement_type_id: input.equipementTypeId,
      est_hors_contrat: input.estHorsContrat,
      designation: input.designation || null,
      localisation: input.localisation || null,
      etat: input.etat || null,
      plaque_signaletique: input.plaqueSignaletique,
      commentaire: input.commentaire || null,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapEquipementReleve(data);
}

export async function terminerPriseEnCharge(id: string): Promise<void> {
  const { error } = await supabase
    .from("prises_en_charge")
    .update({ statut: "terminee", date_realisation: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
