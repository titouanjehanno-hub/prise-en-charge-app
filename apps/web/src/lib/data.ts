// Couche d'accès aux données : v1 en mémoire (mock-data). Les signatures sont
// pensées pour être remplacées par des appels Supabase sans changer les écrans.
import {
  clients,
  contratEquipements,
  contrats,
  equipementTypes,
  lotsTechniques,
  sites,
} from "./mock-data";
import type { Contrat, ContratEquipement } from "./types";

export function getContrats() {
  return contrats;
}

export function getContrat(contratId: string): Contrat | undefined {
  return contrats.find((c) => c.id === contratId);
}

export function getClient(clientId: string) {
  return clients.find((c) => c.id === clientId);
}

export function getSite(siteId: string) {
  return sites.find((s) => s.id === siteId);
}

export function getReferentiel() {
  return { lotsTechniques, equipementTypes };
}

export function getContratEquipements(contratId: string): ContratEquipement[] {
  return contratEquipements.filter((ce) => ce.contratId === contratId);
}
