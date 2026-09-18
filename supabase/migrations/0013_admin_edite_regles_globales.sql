-- Permet à un admin de modifier/supprimer aussi les règles du référentiel
-- global (org_id null, ex : celles ajoutées par les migrations 0010/0012),
-- pas seulement celles créées manuellement pour son organisation. Politique
-- additive (permissive) : ne remplace aucune politique existante.
create policy "admin update global or own regles" on regles_ape
  for update using (
    current_user_role() = 'admin' and (org_id is null or org_id = current_org_id())
  );

create policy "admin delete global or own regles" on regles_ape
  for delete using (
    current_user_role() = 'admin' and (org_id is null or org_id = current_org_id())
  );
