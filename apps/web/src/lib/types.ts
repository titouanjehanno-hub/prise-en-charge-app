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
  localisationPrevue?: string;
  quantite: number;
  referenceContractuelle?: string;
  notes?: string;
}
