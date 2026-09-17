import { AppState } from "react-native";
import * as cache from "./local-cache";
import { isOnline } from "./network";
import * as remote from "./remote-data";
import { getNextPending, getPendingCount, removePending } from "./sync-queue";
import type { Contrat } from "./types";

type Listener = () => void;
const listeners = new Set<Listener>();

export function onSyncChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

let isSyncing = false;

export async function triggerSync(): Promise<void> {
  if (isSyncing) return;
  if (!(await isOnline())) return;

  isSyncing = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const row = await getNextPending();
      if (!row) break;

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(row.payload);
      } catch {
        // payload corrompu : on ne peut rien en faire, on l'abandonne pour ne pas bloquer la file
        await removePending(row.id);
        continue;
      }

      try {
        await processItem(row.kind, payload);
        await removePending(row.id);
        notify();
      } catch (err) {
        console.warn(`[sync] échec sur "${row.kind}", nouvelle tentative plus tard`, err);
        break; // on garde l'ordre : on retentera celui-ci (et les suivants) plus tard
      }
    }
  } finally {
    isSyncing = false;
  }
}

async function processItem(kind: string, payload: Record<string, unknown>): Promise<void> {
  switch (kind) {
    case "create_pec": {
      const contrat = payload.contrat as Contrat;
      const id = payload.id as string;
      const created = await remote.creerNouvellePriseEnCharge(contrat, id);
      await cache.savePriseEnChargeLocal(created);
      return;
    }
    case "pec_statut": {
      const id = payload.id as string;
      const action = payload.action as "terminer" | "pause" | "reprendre";
      if (action === "terminer") await remote.terminerPriseEnCharge(id);
      else if (action === "pause") await remote.mettreEnPausePriseEnCharge(id);
      else await remote.reprendrePriseEnCharge(id);
      return;
    }
    case "save_equipement_releve": {
      await remote.saveEquipementReleve(payload as unknown as remote.SaveEquipementReleveInput);
      return;
    }
    case "add_action_ape": {
      await remote.addActionApe(
        payload as { id: string; priseEnChargeId: string; equipementReleveId?: string; description: string },
      );
      return;
    }
    case "delete_action_ape": {
      await remote.deleteActionApe(payload.id as string);
      return;
    }
    case "upload_photo": {
      const { id, equipementReleveId, type, localUri } = payload as {
        id: string;
        equipementReleveId: string;
        type: "generale" | "plaque_signaletique" | "defaut";
        localUri: string;
      };
      const uploaded = await remote.uploadPhoto(id, equipementReleveId, type, localUri);
      await cache.markPhotoUploadedLocal(id, uploaded.storagePath);
      return;
    }
    case "delete_photo": {
      await remote.deletePhoto(payload as { id: string; storagePath: string });
      return;
    }
    default:
      throw new Error(`Type d'opération de synchro inconnu : ${kind}`);
  }
}

export async function getPendingSyncCount(): Promise<number> {
  return getPendingCount();
}

let started = false;

export function startSyncEngine(): void {
  if (started) return;
  started = true;

  // NetInfo est chargé paresseusement pour ne jamais bloquer le démarrage de l'app.
  import("@react-native-community/netinfo").then(({ default: NetInfo }) => {
    NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        triggerSync().then(notify);
      }
    });
  });

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      triggerSync().then(notify);
    }
  });

  triggerSync().then(notify);
}

export function requestSyncSoon(): void {
  // best-effort, sans bloquer l'appelant
  triggerSync().then(notify);
}
