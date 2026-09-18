-- Étoffe le plan d'action réglementaire pour les équipements CVC, ECS et
-- portes/portails automatiques, sur la base des obligations légales
-- identifiées pour chaque type (arrêtés, décrets, normes en vigueur).
-- N'écrase aucune règle existante : n'ajoute que de nouvelles entrées et
-- marque comme réglementaires des types qui ne l'étaient pas encore.

update equipement_types set est_reglementaire = true
where code in (
  'CHAUDIERE', 'PAC', 'GROUPE_FROID', 'CTA', 'VMC', 'BALLON_ECS',
  'PORTE_AUTO', 'PORTAIL_AUTO'
);

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'urgent',
  'Chaudière en mauvais état ou hors service : risque de panne, de fuite ou de mauvaise combustion (monoxyde de carbone). Entretien annuel obligatoire (arrêté du 15 septembre 2009) à réaliser sans délai ; au-delà de 400 kW, contrôle périodique d''efficacité énergétique requis tous les 2 à 3 ans (décret n°2020-912).'
from equipement_types where code = 'CHAUDIERE';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Pompe à chaleur en état dégradé : entretien obligatoire au moins tous les 2 ans (décret n°2020-912) à vérifier, et contrôle d''étanchéité du fluide frigorigène à prévoir si la charge dépasse 5 TeqCO2 (règlement F-Gas UE n°517/2014).'
from equipement_types where code = 'PAC';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Climatiseur/groupe froid en état dégradé : contrôle d''étanchéité du fluide frigorigène à vérifier (obligatoire au-delà de 5 TeqCO2 de charge, règlement F-Gas UE n°517/2014) et entretien du système à programmer (décret n°2020-912).'
from equipement_types where code = 'GROUPE_FROID';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Centrale de traitement d''air en état dégradé : l''entretien des installations de ventilation est une obligation réglementaire pour l''hygiène et la sécurité des occupants (décret du 25 juillet 1997). Vérifier le carnet d''entretien et, pour les ERP concernés, la surveillance de la qualité de l''air intérieur.'
from equipement_types where code = 'CTA';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'VMC en état dégradé : le contrôle des installations d''aération est une obligation de l''employeur (arrêté du 8 octobre 1987, code du travail). Pour les VMC gaz collectives, contrôle annuel et inspection complète quinquennale obligatoires (arrêté du 23 février 2018).'
from equipement_types where code = 'VMC';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Ballon d''eau chaude sanitaire en état dégradé : risque de développement de légionelles. Vérifier le respect des températures réglementaires (>55°C en sortie de ballon pour les volumes >400L, arrêté du 30 novembre 2005) et programmer une analyse légionelle si nécessaire.'
from equipement_types where code = 'BALLON_ECS';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Porte automatique en état dégradé : risque pour la sécurité des usagers (coincement, choc). Entretien et vérification périodique obligatoires sur les lieux de travail (arrêté du 21 décembre 1993), au minimum semestrielle.'
from equipement_types where code = 'PORTE_AUTO';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Portail automatique en état dégradé : risque pour la sécurité des usagers. Entretien et vérification périodique obligatoires sur les lieux de travail (arrêté du 21 décembre 1993), conformément à la norme EN 13241-1.'
from equipement_types where code = 'PORTAIL_AUTO';

insert into regles_ape (org_id, equipement_type_id, etats, categorie, priorite, action)
select null, id, array['mauvais', 'hors_service']::etat_equipement[], 'securite', 'a_prevoir',
  'Monte-charge en état dégradé : vérification générale périodique (VGP) annuelle obligatoire des appareils de levage (articles R4323-23 et suivants du code du travail, arrêté du 1er mars 2004).'
from equipement_types where code = 'MONTE_CHARGE';
