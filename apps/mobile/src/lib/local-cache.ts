import { getDb, kvGet, kvSet } from "./local-db";
import type {
  ActionApe,
  Contrat,
  ContratEquipement,
  ContratListItem,
  EquipementReleve,
  EquipementType,
  LotTechnique,
  Photo,
  PriseEnCharge,
} from "./types";

function toInt(value: boolean): number {
  return value ? 1 : 0;
}
function toBool(value: number | null | undefined): boolean {
  return !!value;
}

// --- Référentiel (lots + types) -------------------------------------------

export async function cacheReferentiel(lots: LotTechnique[], types: EquipementType[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM lots");
    await db.runAsync("DELETE FROM equipement_types");
    for (const lot of lots) {
      await db.runAsync("INSERT INTO lots (id, code, name) VALUES (?, ?, ?)", lot.id, lot.code, lot.name);
    }
    for (const type of types) {
      await db.runAsync(
        "INSERT INTO equipement_types (id, lot_technique_id, code, name, plaque_schema) VALUES (?, ?, ?, ?, ?)",
        type.id,
        type.lotTechniqueId,
        type.code,
        type.name,
        JSON.stringify(type.plaqueSignaletiqueSchema),
      );
    }
  });
}

export async function readLocalReferentiel(): Promise<{ lotsTechniques: LotTechnique[]; equipementTypes: EquipementType[] }> {
  const db = await getDb();
  const lotRows = await db.getAllAsync<{ id: string; code: string; name: string }>("SELECT * FROM lots ORDER BY name");
  const typeRows = await db.getAllAsync<{
    id: string;
    lot_technique_id: string;
    code: string;
    name: string;
    plaque_schema: string;
  }>("SELECT * FROM equipement_types ORDER BY name");
  return {
    lotsTechniques: lotRows.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    equipementTypes: typeRows.map((r) => ({
      id: r.id,
      lotTechniqueId: r.lot_technique_id,
      code: r.code,
      name: r.name,
      plaqueSignaletiqueSchema: JSON.parse(r.plaque_schema || "[]"),
    })),
  };
}

export async function readLocalEquipementType(id: string): Promise<EquipementType | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    lot_technique_id: string;
    code: string;
    name: string;
    plaque_schema: string;
  }>("SELECT * FROM equipement_types WHERE id = ?", id);
  if (!row) return undefined;
  return {
    id: row.id,
    lotTechniqueId: row.lot_technique_id,
    code: row.code,
    name: row.name,
    plaqueSignaletiqueSchema: JSON.parse(row.plaque_schema || "[]"),
  };
}

// --- Contrats ---------------------------------------------------------------

export async function cacheContrats(items: ContratListItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const c of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO contrats (id, client_id, site_id, reference, client_name, site_name, date_debut, date_fin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id,
        c.clientId,
        c.siteId,
        c.reference,
        c.clientName,
        c.siteName,
        c.dateDebut ?? null,
        c.dateFin ?? null,
      );
    }
  });
}

export async function cacheContrat(c: Contrat): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO contrats (id, client_id, site_id, reference, date_debut, date_fin)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id, site_id = excluded.site_id,
       reference = excluded.reference, date_debut = excluded.date_debut, date_fin = excluded.date_fin`,
    c.id,
    c.clientId,
    c.siteId,
    c.reference,
    c.dateDebut ?? null,
    c.dateFin ?? null,
  );
}

export async function readLocalContrats(): Promise<ContratListItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    client_id: string;
    site_id: string;
    reference: string;
    client_name: string | null;
    site_name: string | null;
    date_debut: string | null;
    date_fin: string | null;
  }>("SELECT * FROM contrats ORDER BY reference");
  return rows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    siteId: r.site_id,
    reference: r.reference,
    clientName: r.client_name ?? "—",
    siteName: r.site_name ?? "—",
    dateDebut: r.date_debut ?? undefined,
    dateFin: r.date_fin ?? undefined,
  }));
}

export async function readLocalContrat(id: string): Promise<Contrat | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    client_id: string;
    site_id: string;
    reference: string;
    date_debut: string | null;
    date_fin: string | null;
  }>("SELECT * FROM contrats WHERE id = ?", id);
  if (!row) return undefined;
  return {
    id: row.id,
    clientId: row.client_id,
    siteId: row.site_id,
    reference: row.reference,
    dateDebut: row.date_debut ?? undefined,
    dateFin: row.date_fin ?? undefined,
  };
}

// --- Contrat équipements -----------------------------------------------------

export async function cacheContratEquipements(contratId: string, items: ContratEquipement[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM contrat_equipements WHERE contrat_id = ?", contratId);
    for (const ce of items) {
      await db.runAsync(
        `INSERT INTO contrat_equipements
         (id, contrat_id, equipement_type_id, designation, batiment, etage, local, quantite, est_ensemble, reference_contractuelle, numero_serie, annee_fabrication, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ce.id,
        ce.contratId,
        ce.equipementTypeId,
        ce.designation ?? null,
        ce.batiment ?? null,
        ce.etage ?? null,
        ce.local ?? null,
        ce.quantite,
        toInt(ce.estEnsemble),
        ce.referenceContractuelle ?? null,
        ce.numeroSerie ?? null,
        ce.anneeFabrication ?? null,
        ce.notes ?? null,
      );
    }
  });
}

export async function readLocalContratEquipements(contratId: string): Promise<ContratEquipement[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    contrat_id: string;
    equipement_type_id: string;
    designation: string | null;
    batiment: string | null;
    etage: string | null;
    local: string | null;
    quantite: number;
    est_ensemble: number;
    reference_contractuelle: string | null;
    numero_serie: string | null;
    annee_fabrication: number | null;
    notes: string | null;
  }>("SELECT * FROM contrat_equipements WHERE contrat_id = ?", contratId);
  return rows.map((r) => ({
    id: r.id,
    contratId: r.contrat_id,
    equipementTypeId: r.equipement_type_id,
    designation: r.designation ?? undefined,
    batiment: r.batiment ?? undefined,
    etage: r.etage ?? undefined,
    local: r.local ?? undefined,
    quantite: r.quantite,
    estEnsemble: toBool(r.est_ensemble),
    referenceContractuelle: r.reference_contractuelle ?? undefined,
    numeroSerie: r.numero_serie ?? undefined,
    anneeFabrication: r.annee_fabrication ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

export async function readLocalContratEquipement(id: string): Promise<ContratEquipement | undefined> {
  const db = await getDb();
  const r = await db.getFirstAsync<{
    id: string;
    contrat_id: string;
    equipement_type_id: string;
    designation: string | null;
    batiment: string | null;
    etage: string | null;
    local: string | null;
    quantite: number;
    est_ensemble: number;
    reference_contractuelle: string | null;
    numero_serie: string | null;
    annee_fabrication: number | null;
    notes: string | null;
  }>("SELECT * FROM contrat_equipements WHERE id = ?", id);
  if (!r) return undefined;
  return {
    id: r.id,
    contratId: r.contrat_id,
    equipementTypeId: r.equipement_type_id,
    designation: r.designation ?? undefined,
    batiment: r.batiment ?? undefined,
    etage: r.etage ?? undefined,
    local: r.local ?? undefined,
    quantite: r.quantite,
    estEnsemble: toBool(r.est_ensemble),
    referenceContractuelle: r.reference_contractuelle ?? undefined,
    numeroSerie: r.numero_serie ?? undefined,
    anneeFabrication: r.annee_fabrication ?? undefined,
    notes: r.notes ?? undefined,
  };
}

// --- Prises en charge ---------------------------------------------------------

export async function savePriseEnChargeLocal(pec: PriseEnCharge): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO prises_en_charge (id, contrat_id, site_id, technicien_id, technicien_nom, statut, date_realisation)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET statut = excluded.statut, date_realisation = excluded.date_realisation,
       technicien_nom = excluded.technicien_nom`,
    pec.id,
    pec.contratId,
    pec.siteId,
    pec.technicienId ?? null,
    pec.technicienNom ?? null,
    pec.statut,
    pec.dateRealisation ?? null,
  );
}

function mapPecRow(r: {
  id: string;
  contrat_id: string;
  site_id: string;
  technicien_id: string | null;
  technicien_nom: string | null;
  statut: PriseEnCharge["statut"];
  date_realisation: string | null;
}): PriseEnCharge {
  return {
    id: r.id,
    contratId: r.contrat_id,
    siteId: r.site_id,
    technicienId: r.technicien_id ?? undefined,
    technicienNom: r.technicien_nom ?? undefined,
    statut: r.statut,
    dateRealisation: r.date_realisation ?? undefined,
  };
}

export async function readLocalPriseEnCharge(id: string): Promise<PriseEnCharge | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    contrat_id: string;
    site_id: string;
    technicien_id: string | null;
    technicien_nom: string | null;
    statut: PriseEnCharge["statut"];
    date_realisation: string | null;
  }>("SELECT * FROM prises_en_charge WHERE id = ?", id);
  return row ? mapPecRow(row) : undefined;
}

export async function readLocalActivePriseEnCharge(contratId: string): Promise<PriseEnCharge | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    contrat_id: string;
    site_id: string;
    technicien_id: string | null;
    technicien_nom: string | null;
    statut: PriseEnCharge["statut"];
    date_realisation: string | null;
  }>(
    `SELECT * FROM prises_en_charge WHERE contrat_id = ? AND statut IN ('preparee', 'en_cours', 'en_pause')
     ORDER BY rowid DESC LIMIT 1`,
    contratId,
  );
  return row ? mapPecRow(row) : undefined;
}

export async function readLocalPrisesEnChargePourContrat(contratId: string): Promise<PriseEnCharge[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    contrat_id: string;
    site_id: string;
    technicien_id: string | null;
    technicien_nom: string | null;
    statut: PriseEnCharge["statut"];
    date_realisation: string | null;
  }>("SELECT * FROM prises_en_charge WHERE contrat_id = ? ORDER BY rowid DESC", contratId);
  return rows.map(mapPecRow);
}

export async function isPecCached(pecId: string): Promise<boolean> {
  const flag = await kvGet(`cached_pec:${pecId}`);
  return flag === "1";
}

export async function markPecCached(pecId: string): Promise<void> {
  await kvSet(`cached_pec:${pecId}`, "1");
}

// Distinct du cache "PEC" : la check-list d'un contrat (contrat_equipements)
// doit être téléchargée une fois par CONTRAT, pas une fois par prise en
// charge — sinon la toute première prise en charge d'un contrat jamais
// ouvert avant se retrouverait avec une check-list vide.
export async function isContratEquipementsCached(contratId: string): Promise<boolean> {
  const flag = await kvGet(`cached_contrat_equipements:${contratId}`);
  return flag === "1";
}

export async function markContratEquipementsCached(contratId: string): Promise<void> {
  await kvSet(`cached_contrat_equipements:${contratId}`, "1");
}

// --- Équipements relevés -------------------------------------------------------

export async function saveEquipementReleveLocal(releve: EquipementReleve): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO equipements_releves
     (id, prise_en_charge_id, contrat_equipement_id, equipement_type_id, est_hors_contrat, designation, localisation, etat, plaque_signaletique, commentaire, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET designation = excluded.designation, localisation = excluded.localisation,
       etat = excluded.etat, plaque_signaletique = excluded.plaque_signaletique, commentaire = excluded.commentaire,
       deleted = 0`,
    releve.id,
    releve.priseEnChargeId,
    releve.contratEquipementId ?? null,
    releve.equipementTypeId,
    toInt(releve.estHorsContrat),
    releve.designation ?? null,
    releve.localisation ?? null,
    releve.etat ?? null,
    JSON.stringify(releve.plaqueSignaletique ?? {}),
    releve.commentaire ?? null,
  );
}

export async function cacheEquipementsReleves(pecId: string, items: EquipementReleve[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM equipements_releves WHERE prise_en_charge_id = ?", pecId);
    for (const r of items) {
      await db.runAsync(
        `INSERT INTO equipements_releves
         (id, prise_en_charge_id, contrat_equipement_id, equipement_type_id, est_hors_contrat, designation, localisation, etat, plaque_signaletique, commentaire, deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        r.id,
        r.priseEnChargeId,
        r.contratEquipementId ?? null,
        r.equipementTypeId,
        toInt(r.estHorsContrat),
        r.designation ?? null,
        r.localisation ?? null,
        r.etat ?? null,
        JSON.stringify(r.plaqueSignaletique ?? {}),
        r.commentaire ?? null,
      );
    }
  });
}

function mapReleveRow(r: {
  id: string;
  prise_en_charge_id: string;
  contrat_equipement_id: string | null;
  equipement_type_id: string;
  est_hors_contrat: number;
  designation: string | null;
  localisation: string | null;
  etat: EquipementReleve["etat"] | null;
  plaque_signaletique: string | null;
  commentaire: string | null;
}): EquipementReleve {
  return {
    id: r.id,
    priseEnChargeId: r.prise_en_charge_id,
    contratEquipementId: r.contrat_equipement_id ?? undefined,
    equipementTypeId: r.equipement_type_id,
    estHorsContrat: toBool(r.est_hors_contrat),
    designation: r.designation ?? undefined,
    localisation: r.localisation ?? undefined,
    etat: r.etat ?? undefined,
    plaqueSignaletique: JSON.parse(r.plaque_signaletique || "{}"),
    commentaire: r.commentaire ?? undefined,
  };
}

export async function readLocalEquipementsReleves(pecId: string): Promise<EquipementReleve[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Parameters<typeof mapReleveRow>[0]>(
    "SELECT * FROM equipements_releves WHERE prise_en_charge_id = ? AND deleted = 0",
    pecId,
  );
  return rows.map(mapReleveRow);
}

export async function readLocalEquipementReleve(id: string): Promise<EquipementReleve | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<Parameters<typeof mapReleveRow>[0]>(
    "SELECT * FROM equipements_releves WHERE id = ? AND deleted = 0",
    id,
  );
  return row ? mapReleveRow(row) : undefined;
}

// --- Photos ---------------------------------------------------------------------

export async function savePhotoLocal(photo: {
  id: string;
  equipementReleveId: string;
  localUri: string;
  storagePath: string | null;
  type: string;
  uploaded: boolean;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO photos (id, equipement_releve_id, local_uri, storage_path, type, uploaded, deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET storage_path = excluded.storage_path, uploaded = excluded.uploaded`,
    photo.id,
    photo.equipementReleveId,
    photo.localUri,
    photo.storagePath,
    photo.type,
    toInt(photo.uploaded),
  );
}

export async function markPhotoUploadedLocal(id: string, storagePath: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE photos SET uploaded = 1, storage_path = ? WHERE id = ?", storagePath, id);
}

export async function deletePhotoLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE photos SET deleted = 1 WHERE id = ?", id);
}

export async function readLocalPhotoRow(
  id: string,
): Promise<{ id: string; equipementReleveId: string; localUri: string; storagePath: string | null; uploaded: boolean } | undefined> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    equipement_releve_id: string;
    local_uri: string;
    storage_path: string | null;
    uploaded: number;
  }>("SELECT * FROM photos WHERE id = ?", id);
  if (!row) return undefined;
  return {
    id: row.id,
    equipementReleveId: row.equipement_releve_id,
    localUri: row.local_uri,
    storagePath: row.storage_path,
    uploaded: toBool(row.uploaded),
  };
}

export async function readLocalPhotos(equipementReleveId: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    equipement_releve_id: string;
    local_uri: string;
    storage_path: string | null;
    type: Photo["type"];
  }>(
    "SELECT * FROM photos WHERE equipement_releve_id = ? AND deleted = 0 ORDER BY rowid",
    equipementReleveId,
  );
  return rows.map((r) => ({
    id: r.id,
    equipementReleveId: r.equipement_releve_id,
    storagePath: r.storage_path ?? "",
    type: r.type,
    url: r.local_uri,
  }));
}

// --- Actions APE ------------------------------------------------------------------

export async function saveActionApeLocal(action: ActionApe): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO actions_ape (id, prise_en_charge_id, equipement_releve_id, origine, description, deleted)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET description = excluded.description, deleted = 0`,
    action.id,
    action.priseEnChargeId,
    action.equipementReleveId ?? null,
    action.origine,
    action.description,
  );
}

export async function cacheActionsApe(pecId: string, items: ActionApe[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM actions_ape WHERE prise_en_charge_id = ?", pecId);
    for (const a of items) {
      await db.runAsync(
        `INSERT INTO actions_ape (id, prise_en_charge_id, equipement_releve_id, origine, description, deleted)
         VALUES (?, ?, ?, ?, ?, 0)`,
        a.id,
        a.priseEnChargeId,
        a.equipementReleveId ?? null,
        a.origine,
        a.description,
      );
    }
  });
}

function mapActionRow(r: {
  id: string;
  prise_en_charge_id: string;
  equipement_releve_id: string | null;
  origine: ActionApe["origine"];
  description: string;
}): ActionApe {
  return {
    id: r.id,
    priseEnChargeId: r.prise_en_charge_id,
    equipementReleveId: r.equipement_releve_id ?? undefined,
    origine: r.origine,
    description: r.description,
  };
}

export async function readLocalActionsApeGenerales(pecId: string): Promise<ActionApe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Parameters<typeof mapActionRow>[0]>(
    "SELECT * FROM actions_ape WHERE prise_en_charge_id = ? AND equipement_releve_id IS NULL AND deleted = 0",
    pecId,
  );
  return rows.map(mapActionRow);
}

export async function readLocalActionsApeParEquipement(equipementReleveId: string): Promise<ActionApe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Parameters<typeof mapActionRow>[0]>(
    "SELECT * FROM actions_ape WHERE equipement_releve_id = ? AND deleted = 0",
    equipementReleveId,
  );
  return rows.map(mapActionRow);
}

export async function deleteActionApeLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE actions_ape SET deleted = 1 WHERE id = ?", id);
}
