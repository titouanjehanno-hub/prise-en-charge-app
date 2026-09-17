-- ============================================================================
-- Référentiel technique global (org_id = null, partagé par toutes les organisations)
-- Lots techniques + types d'équipements avec schéma de plaque signalétique
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Lots techniques
-- ----------------------------------------------------------------------------
insert into lots_techniques (org_id, code, name) values
  (null, 'CVC', 'Chauffage, Ventilation, Climatisation'),
  (null, 'ELEC', 'Électricité (CFO/CFA)'),
  (null, 'PLOMBERIE', 'Plomberie & Sanitaire'),
  (null, 'SSI', 'Sécurité Incendie'),
  (null, 'LEVAGE', 'Ascenseurs & Levage'),
  (null, 'SURETE', 'Sûreté & Contrôle d''accès');

-- ----------------------------------------------------------------------------
-- Types d'équipements
-- Champs communs à (quasi) tous les types : marque, modele, numero_serie,
-- annee_fabrication. Le reste est spécifique au type d'équipement.
-- ----------------------------------------------------------------------------

-- === CVC ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'CHAUDIERE', 'Chaudière', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"energie","label":"Énergie","type":"select","options":["gaz","fioul","bois","électrique"]},
  {"key":"puissance_kw","label":"Puissance","type":"number","unit":"kW"},
  {"key":"rendement_pct","label":"Rendement","type":"number","unit":"%"}
]'::jsonb from lots_techniques where code = 'CVC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'PAC', 'Pompe à chaleur', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_pac","label":"Type","type":"select","options":["air/eau","air/air","eau/eau"]},
  {"key":"puissance_kw","label":"Puissance","type":"number","unit":"kW"},
  {"key":"fluide_frigorigene","label":"Fluide frigorigène","type":"text"}
]'::jsonb from lots_techniques where code = 'CVC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'CTA', 'Centrale de traitement d''air', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"debit_air_m3h","label":"Débit d''air","type":"number","unit":"m³/h"},
  {"key":"puissance_kw","label":"Puissance","type":"number","unit":"kW"}
]'::jsonb from lots_techniques where code = 'CVC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'VMC', 'VMC', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_vmc","label":"Type","type":"select","options":["simple flux","double flux"]},
  {"key":"debit_air_m3h","label":"Débit d''air","type":"number","unit":"m³/h"}
]'::jsonb from lots_techniques where code = 'CVC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'GROUPE_FROID', 'Groupe froid / Climatiseur', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"puissance_frigorifique_kw","label":"Puissance frigorifique","type":"number","unit":"kW"},
  {"key":"fluide_frigorigene","label":"Fluide frigorigène","type":"text"}
]'::jsonb from lots_techniques where code = 'CVC';

-- === Électricité ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'TGBT', 'Tableau Général Basse Tension', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"intensite_nominale_a","label":"Intensité nominale","type":"number","unit":"A"},
  {"key":"nombre_departs","label":"Nombre de départs","type":"number"}
]'::jsonb from lots_techniques where code = 'ELEC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'ARMOIRE_ELEC', 'Armoire électrique divisionnaire', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"intensite_nominale_a","label":"Intensité nominale","type":"number","unit":"A"}
]'::jsonb from lots_techniques where code = 'ELEC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'GROUPE_ELECTROGENE', 'Groupe électrogène', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"puissance_kva","label":"Puissance","type":"number","unit":"kVA"},
  {"key":"type_carburant","label":"Carburant","type":"select","options":["diesel","essence","gaz"]},
  {"key":"autonomie_h","label":"Autonomie","type":"number","unit":"h"}
]'::jsonb from lots_techniques where code = 'ELEC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'ONDULEUR', 'Onduleur (ASI)', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"puissance_kva","label":"Puissance","type":"number","unit":"kVA"},
  {"key":"autonomie_min","label":"Autonomie","type":"number","unit":"min"}
]'::jsonb from lots_techniques where code = 'ELEC';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'BAES', 'Bloc autonome d''éclairage de sécurité', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_baes","label":"Type","type":"select","options":["SATI","non-SATI"]},
  {"key":"autonomie_h","label":"Autonomie","type":"number","unit":"h"}
]'::jsonb from lots_techniques where code = 'ELEC';

-- === Plomberie & Sanitaire ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'BALLON_ECS', 'Ballon d''eau chaude sanitaire', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"volume_litres","label":"Volume","type":"number","unit":"L"},
  {"key":"energie","label":"Énergie","type":"select","options":["électrique","gaz","thermodynamique","solaire"]}
]'::jsonb from lots_techniques where code = 'PLOMBERIE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'SURPRESSEUR', 'Surpresseur', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"debit_m3h","label":"Débit","type":"number","unit":"m³/h"},
  {"key":"pression_bar","label":"Pression","type":"number","unit":"bar"}
]'::jsonb from lots_techniques where code = 'PLOMBERIE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'ADOUCISSEUR', 'Adoucisseur d''eau', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"capacite_litres","label":"Capacité","type":"number","unit":"L"}
]'::jsonb from lots_techniques where code = 'PLOMBERIE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'POMPE_RELEVAGE', 'Pompe de relevage', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"debit_m3h","label":"Débit","type":"number","unit":"m³/h"},
  {"key":"puissance_kw","label":"Puissance","type":"number","unit":"kW"}
]'::jsonb from lots_techniques where code = 'PLOMBERIE';

-- === Sécurité Incendie ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'CENTRALE_INCENDIE', 'Centrale de détection incendie (SDI/CMSI)', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_systeme","label":"Type de système","type":"select","options":["Type A","Type B","Type C","Type D","Type E"]},
  {"key":"nombre_zones","label":"Nombre de zones","type":"number"}
]'::jsonb from lots_techniques where code = 'SSI';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'EXTINCTEUR', 'Extincteur', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_agent","label":"Agent extincteur","type":"select","options":["eau pulvérisée","CO2","poudre","mousse"]},
  {"key":"capacite","label":"Capacité","type":"number","unit":"kg/L"},
  {"key":"date_derniere_verification","label":"Dernière vérification","type":"date"}
]'::jsonb from lots_techniques where code = 'SSI';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'DESENFUMAGE', 'Désenfumage (exutoire/volet)', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_desenfumage","label":"Type","type":"select","options":["exutoire","volet","ventilateur"]}
]'::jsonb from lots_techniques where code = 'SSI';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'RIA', 'Robinet d''incendie armé', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"diametre_mm","label":"Diamètre","type":"number","unit":"mm"},
  {"key":"longueur_tuyau_m","label":"Longueur de tuyau","type":"number","unit":"m"}
]'::jsonb from lots_techniques where code = 'SSI';

-- === Ascenseurs & Levage ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'ASCENSEUR', 'Ascenseur', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"numero_installation","label":"N° d''immatriculation","type":"text"},
  {"key":"charge_max_kg","label":"Charge maximale","type":"number","unit":"kg"},
  {"key":"nombre_niveaux","label":"Nombre de niveaux desservis","type":"number"}
]'::jsonb from lots_techniques where code = 'LEVAGE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'MONTE_CHARGE', 'Monte-charge', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"charge_max_kg","label":"Charge maximale","type":"number","unit":"kg"}
]'::jsonb from lots_techniques where code = 'LEVAGE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'PORTE_AUTO', 'Porte automatique', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_porte","label":"Type","type":"select","options":["coulissante","battante","tourniquet"]}
]'::jsonb from lots_techniques where code = 'LEVAGE';

-- === Sûreté & Contrôle d'accès ===
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'CONTROLE_ACCES', 'Contrôle d''accès', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"nombre_points_acces","label":"Nombre de points d''accès","type":"number"}
]'::jsonb from lots_techniques where code = 'SURETE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'VIDEOSURVEILLANCE', 'Vidéosurveillance', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"nombre_cameras","label":"Nombre de caméras","type":"number"},
  {"key":"capacite_stockage_jours","label":"Capacité de stockage","type":"number","unit":"jours"}
]'::jsonb from lots_techniques where code = 'SURETE';

insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'PORTAIL_AUTO', 'Portail automatique', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_motorisation","label":"Type de motorisation","type":"select","options":["coulissant","battant"]}
]'::jsonb from lots_techniques where code = 'SURETE';
