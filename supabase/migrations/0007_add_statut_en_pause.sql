-- Ajoute l'état "en pause" pour une prise en charge interrompue puis reprise plus tard.
alter type statut_prise_en_charge add value if not exists 'en_pause' after 'en_cours';
