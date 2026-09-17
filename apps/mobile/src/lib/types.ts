export type ChampType = "text" | "number" | "select" | "date";

export interface PlaqueSignaletiqueChamp {
  key: string;
  label: string;
  type: ChampType;
  unit?: string;
  options?: string[];
}

export interface LotTechnique {
  id: string;
  code: string;
  name: string;
}

export interface EquipementType {
  id: string;
  lotTechniqueId: string;
  code: string;
  name: string;
  plaqueSignaletiqueSchema: PlaqueSignaletiqueChamp[];
}

export interface Contrat {
  id: string;
  clientId: string;
  siteId: string;
  reference: string;
  dateDebut?: string;
  dateFin?: string;
  description?: string;
}

export interface ContratListItem extends Contrat {
  clientName: string;
  siteName: string;
}

export interface ContratEquipement {
  id: string;
  contratId: string;
  equipementTypeId: string;
  designation?: string;
  batiment?: string;
  etage?: string;
  local?: string;
  quantite: number;
  estEnsemble: boolean;
  referenceContractuelle?: string;
  numeroSerie?: string;
  notes?: string;
}

export type StatutPriseEnCharge = "preparee" | "en_cours" | "terminee" | "validee";

export interface PriseEnCharge {
  id: string;
  contratId: string;
  siteId: string;
  technicienId?: string;
  statut: StatutPriseEnCharge;
  dateRealisation?: string;
}

export type EtatEquipement = "bon" | "moyen" | "mauvais" | "hors_service" | "non_trouve";

export interface EquipementReleve {
  id: string;
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

export type PhotoType = "generale" | "plaque_signaletique" | "defaut";

export interface Photo {
  id: string;
  equipementReleveId: string;
  storagePath: string;
  type: PhotoType;
  url: string;
}
