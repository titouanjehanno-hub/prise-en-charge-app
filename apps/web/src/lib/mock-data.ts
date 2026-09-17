import type {
  Client,
  Contrat,
  ContratEquipement,
  EquipementType,
  LotTechnique,
  Site,
} from "./types";

// Miroir du référentiel seedé dans supabase/migrations/0002_seed_referentiel.sql
// (mêmes codes/libellés/schémas), en attendant le branchement Supabase.

export const lotsTechniques: LotTechnique[] = [
  { id: "lot-cvc", code: "CVC", name: "Chauffage, Ventilation, Climatisation" },
  { id: "lot-elec", code: "ELEC", name: "Électricité (CFO/CFA)" },
  { id: "lot-plomberie", code: "PLOMBERIE", name: "Plomberie & Sanitaire" },
  { id: "lot-ssi", code: "SSI", name: "Sécurité Incendie" },
  { id: "lot-levage", code: "LEVAGE", name: "Ascenseurs & Levage" },
  { id: "lot-surete", code: "SURETE", name: "Sûreté & Contrôle d'accès" },
];

const communPlaque = [
  { key: "marque", label: "Marque", type: "text" as const },
  { key: "modele", label: "Modèle", type: "text" as const },
  { key: "numero_serie", label: "N° de série", type: "text" as const },
  { key: "annee_fabrication", label: "Année de fabrication", type: "number" as const },
];

export const equipementTypes: EquipementType[] = [
  // CVC
  {
    id: "type-chaudiere",
    lotTechniqueId: "lot-cvc",
    code: "CHAUDIERE",
    name: "Chaudière",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "energie", label: "Énergie", type: "select", options: ["gaz", "fioul", "bois", "électrique"] },
      { key: "puissance_kw", label: "Puissance", type: "number", unit: "kW" },
      { key: "rendement_pct", label: "Rendement", type: "number", unit: "%" },
    ],
  },
  {
    id: "type-pac",
    lotTechniqueId: "lot-cvc",
    code: "PAC",
    name: "Pompe à chaleur",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_pac", label: "Type", type: "select", options: ["air/eau", "air/air", "eau/eau"] },
      { key: "puissance_kw", label: "Puissance", type: "number", unit: "kW" },
      { key: "fluide_frigorigene", label: "Fluide frigorigène", type: "text" },
    ],
  },
  {
    id: "type-cta",
    lotTechniqueId: "lot-cvc",
    code: "CTA",
    name: "Centrale de traitement d'air",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "debit_air_m3h", label: "Débit d'air", type: "number", unit: "m³/h" },
      { key: "puissance_kw", label: "Puissance", type: "number", unit: "kW" },
    ],
  },
  {
    id: "type-vmc",
    lotTechniqueId: "lot-cvc",
    code: "VMC",
    name: "VMC",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_vmc", label: "Type", type: "select", options: ["simple flux", "double flux"] },
      { key: "debit_air_m3h", label: "Débit d'air", type: "number", unit: "m³/h" },
    ],
  },
  {
    id: "type-groupe-froid",
    lotTechniqueId: "lot-cvc",
    code: "GROUPE_FROID",
    name: "Groupe froid / Climatiseur",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "puissance_frigorifique_kw", label: "Puissance frigorifique", type: "number", unit: "kW" },
      { key: "fluide_frigorigene", label: "Fluide frigorigène", type: "text" },
    ],
  },
  // Électricité
  {
    id: "type-tgbt",
    lotTechniqueId: "lot-elec",
    code: "TGBT",
    name: "Tableau Général Basse Tension",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "intensite_nominale_a", label: "Intensité nominale", type: "number", unit: "A" },
      { key: "nombre_departs", label: "Nombre de départs", type: "number" },
    ],
  },
  {
    id: "type-armoire-elec",
    lotTechniqueId: "lot-elec",
    code: "ARMOIRE_ELEC",
    name: "Armoire électrique divisionnaire",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "intensite_nominale_a", label: "Intensité nominale", type: "number", unit: "A" },
    ],
  },
  {
    id: "type-groupe-electrogene",
    lotTechniqueId: "lot-elec",
    code: "GROUPE_ELECTROGENE",
    name: "Groupe électrogène",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "puissance_kva", label: "Puissance", type: "number", unit: "kVA" },
      { key: "type_carburant", label: "Carburant", type: "select", options: ["diesel", "essence", "gaz"] },
      { key: "autonomie_h", label: "Autonomie", type: "number", unit: "h" },
    ],
  },
  {
    id: "type-onduleur",
    lotTechniqueId: "lot-elec",
    code: "ONDULEUR",
    name: "Onduleur (ASI)",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "puissance_kva", label: "Puissance", type: "number", unit: "kVA" },
      { key: "autonomie_min", label: "Autonomie", type: "number", unit: "min" },
    ],
  },
  {
    id: "type-baes",
    lotTechniqueId: "lot-elec",
    code: "BAES",
    name: "Bloc autonome d'éclairage de sécurité",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_baes", label: "Type", type: "select", options: ["SATI", "non-SATI"] },
      { key: "autonomie_h", label: "Autonomie", type: "number", unit: "h" },
    ],
  },
  // Plomberie & Sanitaire
  {
    id: "type-ballon-ecs",
    lotTechniqueId: "lot-plomberie",
    code: "BALLON_ECS",
    name: "Ballon d'eau chaude sanitaire",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "volume_litres", label: "Volume", type: "number", unit: "L" },
      { key: "energie", label: "Énergie", type: "select", options: ["électrique", "gaz", "thermodynamique", "solaire"] },
    ],
  },
  {
    id: "type-surpresseur",
    lotTechniqueId: "lot-plomberie",
    code: "SURPRESSEUR",
    name: "Surpresseur",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "debit_m3h", label: "Débit", type: "number", unit: "m³/h" },
      { key: "pression_bar", label: "Pression", type: "number", unit: "bar" },
    ],
  },
  {
    id: "type-adoucisseur",
    lotTechniqueId: "lot-plomberie",
    code: "ADOUCISSEUR",
    name: "Adoucisseur d'eau",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "capacite_litres", label: "Capacité", type: "number", unit: "L" },
    ],
  },
  {
    id: "type-pompe-relevage",
    lotTechniqueId: "lot-plomberie",
    code: "POMPE_RELEVAGE",
    name: "Pompe de relevage",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "debit_m3h", label: "Débit", type: "number", unit: "m³/h" },
      { key: "puissance_kw", label: "Puissance", type: "number", unit: "kW" },
    ],
  },
  // Sécurité Incendie
  {
    id: "type-centrale-incendie",
    lotTechniqueId: "lot-ssi",
    code: "CENTRALE_INCENDIE",
    name: "Centrale de détection incendie (SDI/CMSI)",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_systeme", label: "Type de système", type: "select", options: ["Type A", "Type B", "Type C", "Type D", "Type E"] },
      { key: "nombre_zones", label: "Nombre de zones", type: "number" },
    ],
  },
  {
    id: "type-extincteur",
    lotTechniqueId: "lot-ssi",
    code: "EXTINCTEUR",
    name: "Extincteur",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_agent", label: "Agent extincteur", type: "select", options: ["eau pulvérisée", "CO2", "poudre", "mousse"] },
      { key: "capacite", label: "Capacité", type: "number", unit: "kg/L" },
      { key: "date_derniere_verification", label: "Dernière vérification", type: "date" },
    ],
  },
  {
    id: "type-desenfumage",
    lotTechniqueId: "lot-ssi",
    code: "DESENFUMAGE",
    name: "Désenfumage (exutoire/volet)",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_desenfumage", label: "Type", type: "select", options: ["exutoire", "volet", "ventilateur"] },
    ],
  },
  {
    id: "type-ria",
    lotTechniqueId: "lot-ssi",
    code: "RIA",
    name: "Robinet d'incendie armé",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "diametre_mm", label: "Diamètre", type: "number", unit: "mm" },
      { key: "longueur_tuyau_m", label: "Longueur de tuyau", type: "number", unit: "m" },
    ],
  },
  // Ascenseurs & Levage
  {
    id: "type-ascenseur",
    lotTechniqueId: "lot-levage",
    code: "ASCENSEUR",
    name: "Ascenseur",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "numero_installation", label: "N° d'immatriculation", type: "text" },
      { key: "charge_max_kg", label: "Charge maximale", type: "number", unit: "kg" },
      { key: "nombre_niveaux", label: "Nombre de niveaux desservis", type: "number" },
    ],
  },
  {
    id: "type-monte-charge",
    lotTechniqueId: "lot-levage",
    code: "MONTE_CHARGE",
    name: "Monte-charge",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "charge_max_kg", label: "Charge maximale", type: "number", unit: "kg" },
    ],
  },
  {
    id: "type-porte-auto",
    lotTechniqueId: "lot-levage",
    code: "PORTE_AUTO",
    name: "Porte automatique",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_porte", label: "Type", type: "select", options: ["coulissante", "battante", "tourniquet"] },
    ],
  },
  // Sûreté & Contrôle d'accès
  {
    id: "type-controle-acces",
    lotTechniqueId: "lot-surete",
    code: "CONTROLE_ACCES",
    name: "Contrôle d'accès",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "nombre_points_acces", label: "Nombre de points d'accès", type: "number" },
    ],
  },
  {
    id: "type-videosurveillance",
    lotTechniqueId: "lot-surete",
    code: "VIDEOSURVEILLANCE",
    name: "Vidéosurveillance",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "nombre_cameras", label: "Nombre de caméras", type: "number" },
      { key: "capacite_stockage_jours", label: "Capacité de stockage", type: "number", unit: "jours" },
    ],
  },
  {
    id: "type-portail-auto",
    lotTechniqueId: "lot-surete",
    code: "PORTAIL_AUTO",
    name: "Portail automatique",
    plaqueSignaletiqueSchema: [
      ...communPlaque,
      { key: "type_motorisation", label: "Type de motorisation", type: "select", options: ["coulissant", "battant"] },
    ],
  },
];

export const clients: Client[] = [
  { id: "client-1", name: "SCI Les Terrasses", adresse: "12 avenue Foch, 69006 Lyon" },
];

export const sites: Site[] = [
  { id: "site-1", clientId: "client-1", name: "Immeuble Les Terrasses", adresse: "12 avenue Foch, 69006 Lyon" },
];

export const contrats: Contrat[] = [
  {
    id: "contrat-1",
    clientId: "client-1",
    siteId: "site-1",
    reference: "CT-2026-0142",
    dateDebut: "2026-01-01",
    dateFin: "2026-12-31",
    description: "Contrat multi-technique (CVC, Élec, SSI, Ascenseurs)",
  },
];

export const contratEquipements: ContratEquipement[] = [
  {
    id: "ce-1",
    contratId: "contrat-1",
    equipementTypeId: "type-chaudiere",
    designation: "Chaudière chaufferie principale",
    localisationPrevue: "Sous-sol - Local chaufferie",
    quantite: 2,
    referenceContractuelle: "LOT-CVC-01",
  },
  {
    id: "ce-2",
    contratId: "contrat-1",
    equipementTypeId: "type-ascenseur",
    designation: "Ascenseur bâtiment A",
    localisationPrevue: "Hall A",
    quantite: 1,
    referenceContractuelle: "LOT-LEVAGE-01",
  },
];
