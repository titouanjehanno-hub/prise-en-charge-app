// Couche d'accès aux données branchée sur Supabase (RLS = isolation par organisation).
import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementType,
  LotTechnique,
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
  localisation_prevue: string | null;
  quantite: number;
  reference_contractuelle: string | null;
  notes: string | null;
}): ContratEquipement {
  return {
    id: row.id,
    contratId: row.contrat_id,
    equipementTypeId: row.equipement_type_id,
    designation: row.designation ?? undefined,
    localisationPrevue: row.localisation_prevue ?? undefined,
    quantite: row.quantite,
    referenceContractuelle: row.reference_contractuelle ?? undefined,
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
