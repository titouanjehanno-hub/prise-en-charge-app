// Couche d'accès aux données branchée sur Supabase (RLS = isolation par organisation).
import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementReleve,
  EquipementType,
  EtatEquipement,
  LotTechnique,
  Photo,
  PriseEnCharge,
  RegleApe,
  Site,
} from "./types";

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

function mapClient(row: { id: string; name: string; adresse: string | null }): Client {
  return { id: row.id, name: row.name, adresse: row.adresse ?? undefined };
}

function mapSite(row: {
  id: string;
  client_id: string;
  name: string;
  adresse: string | null;
}): Site {
  return { id: row.id, clientId: row.client_id, name: row.name, adresse: row.adresse ?? undefined };
}

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

export function mapContratEquipement(row: {
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

export interface ContratListItem extends Contrat {
  clientName: string;
  siteName: string;
}

export async function getContratsWithRelations(): Promise<ContratListItem[]> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data, error } = await supabase.from("contrats").select("*").eq("id", contratId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapContrat(data) : undefined;
}

export async function getClient(clientId: string): Promise<Client | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapClient(data) : undefined;
}

export async function getSite(siteId: string): Promise<Site | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSite(data) : undefined;
}

export async function getReferentiel(): Promise<{
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
}> {
  const supabase = await createClient();
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

export async function getContratEquipements(contratId: string): Promise<ContratEquipement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contrat_equipements")
    .select("*")
    .eq("contrat_id", contratId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContratEquipement);
}

function mapPriseEnCharge(row: {
  id: string;
  contrat_id: string;
  site_id: string;
  technicien_id: string | null;
  statut: PriseEnCharge["statut"];
  date_prevue: string | null;
  date_realisation: string | null;
  synthese_points_forts: string | null;
  synthese_points_faibles: string | null;
  app_users?: { full_name: string } | null;
}): PriseEnCharge {
  return {
    id: row.id,
    contratId: row.contrat_id,
    siteId: row.site_id,
    technicienId: row.technicien_id ?? undefined,
    technicienNom: row.app_users?.full_name ?? undefined,
    statut: row.statut,
    datePrevue: row.date_prevue ?? undefined,
    dateRealisation: row.date_realisation ?? undefined,
    synthesePointsForts: row.synthese_points_forts ?? undefined,
    synthesePointsFaibles: row.synthese_points_faibles ?? undefined,
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

export interface PriseEnChargeListItem extends PriseEnCharge {
  nbEquipementsReleves: number;
}

export async function getPrisesEnChargePourContrat(contratId: string): Promise<PriseEnChargeListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prises_en_charge")
    .select("*, app_users!technicien_id(full_name), equipements_releves(count)")
    .eq("contrat_id", contratId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...mapPriseEnCharge(row),
    nbEquipementsReleves: (row.equipements_releves as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function getPriseEnCharge(id: string): Promise<PriseEnCharge | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prises_en_charge")
    .select("*, app_users!technicien_id(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPriseEnCharge(data) : undefined;
}

export async function getEquipementsReleves(priseEnChargeId: string): Promise<EquipementReleve[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipements_releves")
    .select("*")
    .eq("prise_en_charge_id", priseEnChargeId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEquipementReleve);
}

export async function getPhotosPourEquipementsReleves(equipementReleveIds: string[]): Promise<Map<string, Photo[]>> {
  const map = new Map<string, Photo[]>();
  if (equipementReleveIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .in("equipement_releve_id", equipementReleveIds)
    .order("taken_at");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return map;

  const paths = rows.map((r) => r.storage_path as string);
  const { data: signedUrls, error: signError } = await supabase.storage
    .from("photos")
    .createSignedUrls(paths, 60 * 60);
  if (signError) throw new Error(signError.message);
  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  for (const row of rows) {
    const photo: Photo = {
      id: row.id,
      equipementReleveId: row.equipement_releve_id,
      type: row.type,
      url: urlByPath.get(row.storage_path) ?? "",
    };
    const list = map.get(photo.equipementReleveId) ?? [];
    list.push(photo);
    map.set(photo.equipementReleveId, list);
  }
  return map;
}

function mapRegleApe(row: {
  id: string;
  org_id: string | null;
  equipement_type_id: string | null;
  etats: string[] | null;
  plaque_champ_cle: string | null;
  plaque_champ_valeurs: string[] | null;
  action: string;
}): RegleApe {
  return {
    id: row.id,
    orgId: row.org_id ?? undefined,
    equipementTypeId: row.equipement_type_id ?? undefined,
    etats: (row.etats as EtatEquipement[] | null) ?? undefined,
    plaqueChampCle: row.plaque_champ_cle ?? undefined,
    plaqueChampValeurs: row.plaque_champ_valeurs ?? undefined,
    action: row.action,
  };
}

export async function getReglesApe(): Promise<RegleApe[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("regles_ape").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRegleApe);
}

export async function getRegleApe(id: string): Promise<RegleApe | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("regles_ape").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRegleApe(data) : undefined;
}

export async function getCurrentUserRole(): Promise<string | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data, error } = await supabase.from("app_users").select("role").eq("id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role ?? undefined;
}
