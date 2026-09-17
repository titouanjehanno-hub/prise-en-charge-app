-- Indique si un type d'équipement est soumis à une obligation réglementaire
-- (contrôle périodique, mise en conformité...). Utilisé sur le rapport pour
-- signaler ces équipements et déclencher une alerte s'ils sont dégradés.
alter table equipement_types add column if not exists est_reglementaire boolean not null default false;

update equipement_types set est_reglementaire = true
where code in (
  'CENTRALE_INCENDIE', 'EXTINCTEUR', 'DESENFUMAGE', 'RIA', 'BAES',
  'ASCENSEUR', 'MONTE_CHARGE',
  'TGBT', 'ARMOIRE_ELEC', 'GROUPE_ELECTROGENE'
);

-- Les règles servaient uniquement à l'efficacité énergétique (APE). On les
-- étend pour couvrir aussi les actions de sécurité/conformité obligatoires
-- (plan d'action), avec un niveau de priorité pour ces dernières.
alter table regles_ape
  add column if not exists categorie text not null default 'energie' check (categorie in ('energie', 'securite')),
  add column if not exists priorite text check (priorite in ('urgent', 'a_prevoir', 'surveiller'));

-- Quelques règles de sécurité de départ, éditables/complétables depuis
-- l'interface "Règles APE".
insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'urgent',
  'Installation électrique en mauvais état : non-conformité potentielle, mise en sécurité à prévoir en urgence.'
from equipement_types where code in ('TGBT', 'ARMOIRE_ELEC');

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'urgent',
  'Équipement de sécurité incendie hors service : remise en conformité immédiate requise (obligation réglementaire).'
from equipement_types where code in ('CENTRALE_INCENDIE', 'EXTINCTEUR', 'DESENFUMAGE', 'RIA');

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'urgent',
  'Ascenseur en mauvais état : contrôle réglementaire et mise en conformité à prévoir sans délai.'
from equipement_types where code = 'ASCENSEUR';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Bloc autonome de sécurité (BAES) défectueux : à remplacer pour garantir l''éclairage de sécurité réglementaire.'
from equipement_types where code = 'BAES';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'urgent',
  'Groupe électrogène hors service : perte de l''alimentation de secours, intervention à prévoir rapidement.'
from equipement_types where code = 'GROUPE_ELECTROGENE';
