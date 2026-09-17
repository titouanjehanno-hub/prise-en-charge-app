-- Remplace la localisation libre par une localisation structurée
-- (Bâtiment / Étage / Local, plus faciles à suggérer automatiquement),
-- et ajoute le numéro de série (connu à l'avance sur les contrats récurrents)
-- et le indicateur "ensemble" (ligne traitée comme un lot indivisible malgré
-- une quantité > 1). Le commentaire existait déjà via la colonne `notes`.
alter table contrat_equipements
  drop column if exists localisation_prevue,
  add column if not exists batiment text,
  add column if not exists etage text,
  add column if not exists local text,
  add column if not exists numero_serie text,
  add column if not exists est_ensemble boolean not null default false;
