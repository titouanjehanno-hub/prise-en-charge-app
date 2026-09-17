-- Règles d'actions de performance énergétique (APE) : suggestions automatiques
-- basées sur le type d'équipement, son état, et/ou un champ de sa plaque
-- signalétique (ex : type de lampe, énergie...). Référentiel global partagé
-- (org_id = null), comme lots_techniques/equipement_types.
create table regles_ape (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations (id), -- null = règle globale partagée
  equipement_type_id uuid references equipement_types (id), -- null = s'applique à tous les types
  etats etat_equipement[], -- null/vide = s'applique quel que soit l'état
  plaque_champ_cle text, -- ex: 'type_lampe' ; null = pas de condition sur la plaque
  plaque_champ_valeurs text[], -- valeurs qui déclenchent la règle (si plaque_champ_cle renseigné)
  action text not null,
  created_at timestamptz not null default now()
);

alter table regles_ape enable row level security;

create policy "read shared or own" on regles_ape
  for select using (org_id is null or org_id = current_org_id());
create policy "admin write own org" on regles_ape
  for insert with check (org_id = current_org_id() and current_user_role() = 'admin');
create policy "admin update own org" on regles_ape
  for update using (org_id = current_org_id() and current_user_role() = 'admin');
create policy "admin delete own org" on regles_ape
  for delete using (org_id = current_org_id() and current_user_role() = 'admin');

-- Nouveau type d'équipement "Luminaire" (lot Électricité), nécessaire pour
-- illustrer la règle de l'exemple (ampoule -> LED).
insert into equipement_types (org_id, lot_technique_id, code, name, plaque_signaletique_schema)
select null, id, 'LUMINAIRE', 'Luminaire', '[
  {"key":"marque","label":"Marque","type":"text"},
  {"key":"modele","label":"Modèle","type":"text"},
  {"key":"numero_serie","label":"N° de série","type":"text"},
  {"key":"annee_fabrication","label":"Année de fabrication","type":"number"},
  {"key":"type_lampe","label":"Type de lampe","type":"select","options":["Incandescence","Halogène","Fluocompacte","LED","Autre"]},
  {"key":"puissance_w","label":"Puissance","type":"number","unit":"W"}
]'::jsonb
from lots_techniques where code = 'ELEC';

-- Quelques règles de départ, éditables/complétables plus tard.
insert into regles_ape (org_id, equipement_type_id, plaque_champ_cle, plaque_champ_valeurs, action)
select null, id, 'type_lampe', array['Incandescence','Halogène','Fluocompacte'],
  'Remplacer par un éclairage LED : gain énergétique important et durée de vie accrue.'
from equipement_types where code = 'LUMINAIRE';

insert into regles_ape (org_id, equipement_type_id, plaque_champ_cle, plaque_champ_valeurs, action)
select null, id, 'energie', array['fioul'],
  'Envisager un remplacement par une chaudière gaz à condensation ou une pompe à chaleur, plus performante énergétiquement.'
from equipement_types where code = 'CHAUDIERE';

insert into regles_ape (org_id, equipement_type_id, etats, action)
select null, id, array['moyen','mauvais']::etat_equipement[],
  'Chaudière en état dégradé : un entretien ou un remplacement peut améliorer significativement le rendement énergétique.'
from equipement_types where code = 'CHAUDIERE';

insert into regles_ape (org_id, equipement_type_id, plaque_champ_cle, plaque_champ_valeurs, action)
select null, id, 'type_vmc', array['simple flux'],
  'Envisager le passage à une VMC double flux avec récupération de chaleur pour réduire les déperditions énergétiques.'
from equipement_types where code = 'VMC';

insert into regles_ape (org_id, equipement_type_id, plaque_champ_cle, plaque_champ_valeurs, action)
select null, id, 'energie', array['électrique'],
  'Envisager un chauffe-eau thermodynamique, plus économe en énergie qu''une résistance électrique classique.'
from equipement_types where code = 'BALLON_ECS';

insert into regles_ape (org_id, equipement_type_id, etats, action)
values (null, null, array['mauvais','hors_service']::etat_equipement[],
  'Équipement en mauvais état : sa remise en état ou son remplacement peut réduire la surconsommation énergétique liée à la perte de rendement.');
