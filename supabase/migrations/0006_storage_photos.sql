-- Bucket de stockage pour les photos (plaque signalétique, défauts, générales).
-- Chemin des fichiers : {org_id}/{equipement_releve_id}/{fichier}
-- => la policy vérifie juste que le premier segment du chemin correspond à
--    l'organisation de l'utilisateur connecté.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "org isolation read" on storage.objects
  for select using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

create policy "org isolation insert" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );

create policy "org isolation delete" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = current_org_id()::text
  );
