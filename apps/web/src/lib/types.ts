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

export interface Client {
  id: string;
  name: string;
  adresse?: string;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  adresse?: string;
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

export interface NewContratEquipementInput {
  equipementTypeId: string;
  designation?: string;
  batiment?: string;
  etage?: string;
  local?: string;
  quantite: number;
  estEnsemble?: boolean;
  referenceContractuelle?: string;
  numeroSerie?: string;
  notes?: string;
}

export type StatutPriseEnCharge = "preparee" | "en_cours" | "en_pause" | "terminee" | "validee";

export interface PriseEnCharge {
  id: string;
  contratId: string;
  siteId: string;
  technicienId?: string;
  technicienNom?: string;
  statut: StatutPriseEnCharge;
  datePrevue?: string;
  dateRealisation?: string;
  synthesePointsForts?: string;
  synthesePointsFaibles?: string;
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
  type: PhotoType;
  url: string;
}

export interface RegleApe {
  id: string;
  orgId?: string;
  equipementTypeId?: string;
  etats?: EtatEquipement[];
  plaqueChampCle?: string;
  plaqueChampValeurs?: string[];
  action: string;
}

export interface NewRegleApeInput {
  equipementTypeId?: string;
  etats?: EtatEquipement[];
  plaqueChampCle?: string;
  plaqueChampValeurs?: string[];
  action: string;
}
