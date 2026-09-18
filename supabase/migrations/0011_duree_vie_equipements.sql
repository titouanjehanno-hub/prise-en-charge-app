-- Estimation de la durée de vie restante de chaque équipement, à partir de
-- sa durée de vie théorique (par type, référentiel) et de son année de
-- fabrication (connue au contrat et/ou confirmée sur le terrain via la
-- plaque signalétique, qui contient déjà un champ "annee_fabrication" pour
-- tous les types existants).

alter table equipement_types add column if not exists duree_vie_theorique_annees integer;

update equipement_types set duree_vie_theorique_annees = v.annees
from (values
  ('CHAUDIERE', 20),
  ('PAC', 15),
  ('CTA', 20),
  ('VMC', 15),
  ('GROUPE_FROID', 15),
  ('TGBT', 30),
  ('ARMOIRE_ELEC', 25),
  ('GROUPE_ELECTROGENE', 25),
  ('ONDULEUR', 10),
  ('BAES', 10),
  ('BALLON_ECS', 12),
  ('SURPRESSEUR', 15),
  ('ADOUCISSEUR', 12),
  ('POMPE_RELEVAGE', 12),
  ('CENTRALE_INCENDIE', 15),
  ('EXTINCTEUR', 10),
  ('DESENFUMAGE', 20),
  ('RIA', 20),
  ('ASCENSEUR', 25),
  ('MONTE_CHARGE', 20),
  ('PORTE_AUTO', 15),
  ('CONTROLE_ACCES', 10),
  ('VIDEOSURVEILLANCE', 8),
  ('PORTAIL_AUTO', 15)
) as v(code, annees)
where equipement_types.code = v.code;

-- Année de fabrication connue à l'avance (préparation PC), pré-remplie sur
-- le relevé mobile mais modifiable/confirmable par le technicien sur place
-- (dans la plaque signalétique de l'équipement, champ "annee_fabrication").
alter table contrat_equipements add column if not exists annee_fabrication integer;
