// Couche publique "hors-ligne d'abord" : les écrans lisent/écrivent toujours
// en local (SQLite) pour un fonctionnement instantané et sans réseau, pendant
// que sync-engine.ts rejoue en arrière-plan les écritures en attente vers
// Supabase (remote-data.ts) dès que la connexion est disponible.
import * as cache from "./local-cache";
import { isOnline } from "./network";
import { deleteLocalPhotoFile, persistPickedPhoto } from "./photo-storage";
import * as remote from "./remote-data";
import { getCachedUserId, refreshSessionCache } from "./session-cache";
import { requestSyncSoon, startSyncEngine } from "./sync-engine";
import { cancelPending, enqueue } from "./sync-queue";
import { generateId } from "./uuid";
import type {
  ActionApe,
  Contrat,
  ContratEquipement,
  ContratListItem,
  EquipementReleve,
  EquipementType,
  LotTechnique,
  Photo,
  PhotoType,
  PriseEnCharge,
} from "./types";

export async function initOfflineSupport(): Promise<void> {
  startSyncEngine();
  if (await isOnline()) {
    await refreshSessionCache();
    getReferentiel().catch(() => {});
  }
}

// --- Référentiel --------------------------------------------------------------

export async function getReferentiel(): Promise<{
  lotsTechniques: LotTechnique[];
  equipementTypes: EquipementType[];
}> {
  if (await isOnline()) {
    try {
      const fresh = await remote.getReferentiel();
      await cache.cacheReferentiel(fresh.lotsTechniques, fresh.equipementTypes);
      return fresh;
    } catch {
      // hors-ligne ou erreur réseau : on retombe sur le cache local
    }
  }
  return cache.readLocalReferentiel();
}

export async function getEquipementType(id: string): Promise<EquipementType | undefined> {
  return cache.readLocalEquipementType(id);
}

// --- Contrats -------------------------------------------------------------------

export async function getContratsWithRelations(): Promise<ContratListItem[]> {
  if (await isOnline()) {
    try {
      const fresh = await remote.getContratsWithRelations();
      await cache.cacheContrats(fresh);
      return fresh;
    } catch {
      // ignore, fallback local
    }
  }
  return cache.readLocalContrats();
}

export async function getContrat(contratId: string): Promise<Contrat | undefined> {
  if (await isOnline()) {
    try {
      const fresh = await remote.getContrat(contratId);
      if (fresh) await cache.cacheContrat(fresh);
      return fresh;
    } catch {
      // ignore, fallback local
    }
  }
  return cache.readLocalContrat(contratId);
}

export async function getMesPrisesEnChargeParContrat(): Promise<Map<string, PriseEnCharge>> {
  if (await isOnline()) {
    try {
      return await remote.getMesPrisesEnChargeParContrat();
    } catch {
      // ignore
    }
  }
  return new Map();
}

// --- Prise en charge : cycle de vie --------------------------------------------

export async function getActivePriseEnCharge(contrat: Contrat): Promise<PriseEnCharge | undefined> {
  const local = await cache.readLocalActivePriseEnCharge(contrat.id);
  if (local) return local;

  if (await isOnline()) {
    try {
      const remotePec = await remote.getActivePriseEnCharge(contrat);
      if (remotePec) await cache.savePriseEnChargeLocal(remotePec);
      return remotePec;
    } catch {
      // ignore
    }
  }
  return undefined;
}

export async function creerNouvellePriseEnCharge(contrat: Contrat): Promise<PriseEnCharge> {
  const id = generateId();
  const technicienId = await getCachedUserId();
  const pec: PriseEnCharge = {
    id,
    contratId: contrat.id,
    siteId: contrat.siteId,
    technicienId,
    statut: "en_cours",
  };
  await cache.savePriseEnChargeLocal(pec);
  await cache.markPecCached(id); // nouvelle PEC : rien à récupérer du serveur
  await enqueue("create_pec", id, { id, contrat });
  requestSyncSoon();
  return pec;
}

export async function getPrisesEnChargePourContrat(contratId: string): Promise<PriseEnCharge[]> {
  if (await isOnline()) {
    try {
      const fresh = await remote.getPrisesEnChargePourContrat(contratId);
      for (const pec of fresh) await cache.savePriseEnChargeLocal(pec);
    } catch {
      // ignore
    }
  }
  return cache.readLocalPrisesEnChargePourContrat(contratId);
}

export async function getPriseEnCharge(id: string): Promise<PriseEnCharge | undefined> {
  const local = await cache.readLocalPriseEnCharge(id);
  if (local) return local;

  if (await isOnline()) {
    try {
      const remotePec = await remote.getPriseEnCharge(id);
      if (remotePec) await cache.savePriseEnChargeLocal(remotePec);
      return remotePec;
    } catch {
      // ignore
    }
  }
  return undefined;
}

// Télécharge une fois pour toutes (si en ligne et pas déjà fait) la check-list
// du contrat et les relevés d'une prise en charge, pour qu'ils restent
// disponibles et modifiables hors-ligne ensuite. Au-delà de ce premier
// chargement, l'appareil devient la source de vérité locale (on ne réécrase
// jamais des modifications locales avec une relecture serveur).
//
// La check-list du contrat (contrat_equipements) est mise en cache par
// CONTRAT, séparément des relevés qui eux sont mis en cache par PRISE EN
// CHARGE — sinon la toute première prise en charge d'un contrat jamais
// ouvert avant se retrouverait avec une check-list vide.
//
// Renvoie false si la check-list du contrat n'a jamais pu être récupérée
// (jamais ouverte avant + hors-ligne maintenant) : l'écran appelant doit
// alors prévenir l'utilisateur plutôt que d'afficher une liste vide trompeuse.
export async function ensurePriseEnChargeCached(priseEnChargeId: string, contratId: string): Promise<boolean> {
  const contratDejaCache = await cache.isContratEquipementsCached(contratId);
  const pecDejaCache = await cache.isPecCached(priseEnChargeId);
  if (contratDejaCache && pecDejaCache) return true;

  if (!(await isOnline())) return contratDejaCache;

  const tasks: Promise<void>[] = [];
  if (!contratDejaCache) {
    tasks.push(
      remote.getContratEquipements(contratId).then(async (items) => {
        await cache.cacheContratEquipements(contratId, items);
        await cache.markContratEquipementsCached(contratId);
      }),
    );
  }
  if (!pecDejaCache) {
    tasks.push(
      Promise.all([
        remote.getEquipementsReleves(priseEnChargeId),
        remote.getActionsApePourPriseEnCharge(priseEnChargeId),
      ]).then(async ([releves, actions]) => {
        await cache.cacheEquipementsReleves(priseEnChargeId, releves);
        await cache.cacheActionsApe(priseEnChargeId, actions);
        await cache.markPecCached(priseEnChargeId);
      }),
    );
  }
  await Promise.all(tasks);
  return true;
}

async function updateStatutLocal(id: string, statut: PriseEnCharge["statut"], dateRealisation?: string) {
  const current = await cache.readLocalPriseEnCharge(id);
  if (!current) return;
  await cache.savePriseEnChargeLocal({
    ...current,
    statut,
    dateRealisation: dateRealisation ?? current.dateRealisation,
  });
}

export async function terminerPriseEnCharge(id: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await updateStatutLocal(id, "terminee", today);
  await cancelPending("pec_statut", id);
  await enqueue("pec_statut", id, { id, action: "terminer" });
  requestSyncSoon();
}

export async function mettreEnPausePriseEnCharge(id: string): Promise<void> {
  await updateStatutLocal(id, "en_pause");
  await cancelPending("pec_statut", id);
  await enqueue("pec_statut", id, { id, action: "pause" });
  requestSyncSoon();
}

export async function reprendrePriseEnCharge(id: string): Promise<void> {
  await updateStatutLocal(id, "en_cours");
  await cancelPending("pec_statut", id);
  await enqueue("pec_statut", id, { id, action: "reprendre" });
  requestSyncSoon();
}

// --- Équipements du contrat / relevés -------------------------------------------

export async function getContratEquipements(contratId: string): Promise<ContratEquipement[]> {
  return cache.readLocalContratEquipements(contratId);
}

export async function getContratEquipement(id: string): Promise<ContratEquipement | undefined> {
  return cache.readLocalContratEquipement(id);
}

export async function getEquipementsReleves(priseEnChargeId: string): Promise<EquipementReleve[]> {
  return cache.readLocalEquipementsReleves(priseEnChargeId);
}

export async function getEquipementReleve(id: string): Promise<EquipementReleve | undefined> {
  return cache.readLocalEquipementReleve(id);
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
  quantite: number;
  estEnsemble: boolean;
  plaqueSignaletique: Record<string, string>;
  commentaire?: string;
}

export async function saveEquipementReleve(input: SaveEquipementReleveInput): Promise<EquipementReleve> {
  const id = input.id ?? generateId();
  const releve: EquipementReleve = {
    id,
    priseEnChargeId: input.priseEnChargeId,
    contratEquipementId: input.contratEquipementId,
    equipementTypeId: input.equipementTypeId,
    estHorsContrat: input.estHorsContrat,
    designation: input.designation,
    localisation: input.localisation,
    etat: input.etat,
    quantite: input.quantite,
    estEnsemble: input.estEnsemble,
    plaqueSignaletique: input.plaqueSignaletique,
    commentaire: input.commentaire,
  };
  await cache.saveEquipementReleveLocal(releve);
  await cancelPending("save_equipement_releve", id);
  await enqueue("save_equipement_releve", id, { ...input, id });
  requestSyncSoon();
  return releve;
}

// --- Photos ---------------------------------------------------------------------

export async function getPhotos(equipementReleveId: string): Promise<Photo[]> {
  return cache.readLocalPhotos(equipementReleveId);
}

export async function uploadPhoto(equipementReleveId: string, type: PhotoType, pickedUri: string): Promise<Photo> {
  const id = generateId();
  const extensionMatch = /\.(\w+)$/.exec(pickedUri);
  const extension = (extensionMatch?.[1] ?? "jpg").toLowerCase();
  const persistedUri = persistPickedPhoto(pickedUri, id, extension);

  await cache.savePhotoLocal({
    id,
    equipementReleveId,
    localUri: persistedUri,
    storagePath: null,
    type,
    uploaded: false,
  });
  await enqueue("upload_photo", id, { id, equipementReleveId, type, localUri: persistedUri });
  requestSyncSoon();

  return { id, equipementReleveId, storagePath: "", type, url: persistedUri };
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const cancelled = await cancelPending("upload_photo", photo.id);
  const local = await cache.readLocalPhotoRow(photo.id);
  await cache.deletePhotoLocal(photo.id);
  if (local) deleteLocalPhotoFile(local.localUri);

  if (!cancelled && local?.uploaded) {
    await enqueue("delete_photo", photo.id, { id: photo.id, storagePath: local.storagePath });
    requestSyncSoon();
  }
}

// --- Actions de performance énergétique (manuelles) -----------------------------

export async function getActionsApeParEquipementReleve(equipementReleveId: string): Promise<ActionApe[]> {
  return cache.readLocalActionsApeParEquipement(equipementReleveId);
}

export async function getActionsApeGenerales(priseEnChargeId: string): Promise<ActionApe[]> {
  return cache.readLocalActionsApeGenerales(priseEnChargeId);
}

export async function addActionApe(input: {
  priseEnChargeId: string;
  equipementReleveId?: string;
  description: string;
}): Promise<ActionApe> {
  const id = generateId();
  const action: ActionApe = {
    id,
    priseEnChargeId: input.priseEnChargeId,
    equipementReleveId: input.equipementReleveId,
    origine: "technicien",
    description: input.description,
  };
  await cache.saveActionApeLocal(action);
  await enqueue("add_action_ape", id, {
    id,
    priseEnChargeId: input.priseEnChargeId,
    equipementReleveId: input.equipementReleveId,
    description: input.description,
  });
  requestSyncSoon();
  return action;
}

export async function deleteActionApe(id: string): Promise<void> {
  const cancelled = await cancelPending("add_action_ape", id);
  await cache.deleteActionApeLocal(id);
  if (!cancelled) {
    await enqueue("delete_action_ape", id, { id });
    requestSyncSoon();
  }
}
