-- La quantité prévue et le indicateur "ensemble" n'existaient qu'au niveau
-- de la préparation du contrat (contrat_equipements). Le technicien/la
-- personne qui saisit sur le terrain doit pouvoir confirmer ou corriger ces
-- deux informations pour l'équipement réellement relevé (ex : 3 prévus mais
-- seulement 2 trouvés, ou traité comme un ensemble sur cette visite).
alter table equipements_releves
  add column if not exists quantite integer not null default 1,
  add column if not exists est_ensemble boolean not null default false;
