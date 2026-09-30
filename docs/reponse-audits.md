# Réponse aux audits externes du 29/09/2026

Deux agents ont audité le site en ligne **de l'extérieur**, sans accès au code ni à la base. Beaucoup de points « à vérifier » sont donc déjà couverts dans le code ; d'autres étaient justes et ont été corrigés le jour même. Ce document reprend chaque remarque.

## Déjà en place (preuve dans le code ou les tests)

| Remarque | Réponse |
|---|---|
| Double réservation non démontrée (P0-02, « locking ») | Contrainte d'exclusion PostgreSQL + index unique partiel + transaction ; test E2E « 5 patients sur le même créneau → 1 seul succès » ; test de charge : 87 réservations simultanées, 0 chevauchement (`docs/rapport-qa.md`). |
| Anti-abus non observable (P1-02) | Limitation de débit en base (par réseau, IPv6 /64, par compte, par e-mail sous verrou), champ piège, liens interdits dans le nom et le motif. Pas de CAPTCHA : assumé, voir « Reste à faire ». |
| Validation serveur, CSRF, mass assignment (P1-06) | Toutes les entrées passent par Zod côté serveur ; les Server Actions vérifient l'origine (Next.js) ; seuls les champs attendus sont lus ; aucune donnée patient dans l'URL ni les journaux. |
| Jetons d'annulation prévisibles (IDOR) | Jeton aléatoire de 192 bits ; désormais **haché** en base (voir plus bas). |
| Rôles / autorisation (P0-03, partie RBAC) | Rôles ADMIN / Secrétariat vérifiés en base à chaque page et action ; transitions de statut contrôlées ; sessions révocables ; journal d'activité. Tests E2E dédiés. |
| Fuseau horaire et Ramadan | Stockage en UTC, calcul dans `Africa/Casablanca` ; tests unitaires incluant l'heure du Ramadan. |
| Annulation tardive < 24 h | Règle en place et réglable dans l'admin. |
| RTL arabe, clavier, contraste | `dir="rtl"`, propriétés logiques, icônes retournées ; audit axe (WCAG 2.1 AA) sur 18 écrans à chaque test ; lien d'évitement et focus visible. |
| Pool de connexions serverless | Neon (URL poolée) + 3 connexions max par instance. |
| Cache des disponibilités (P1-03) | **Choix volontaire, maintenu** : cache de 10–30 s invalidé à chaque réservation, et la base revérifie toujours le créneau. Sans ce cache, la page réservation tenait 89 req/s au lieu de ~700. |
| Tableau `taken` exposé (P2-02) | Ne contient que des **heures** (jamais qui a réservé) : c'est ce qui permet d'afficher les créneaux pris en gris. |
| Chiffrement au repos, sauvegardes (P0-04) | Assurés par l'hébergeur de base (Neon) ; la durée de restauration dépend de l'offre : à vérifier et documenter avant un vrai client. |

## Corrigé le 29/09 suite aux audits

- **Double authentification (TOTP)** pour l'espace cabinet, avec codes de secours et réinitialisation par l'administrateur (P0-03).
- **Jetons d'annulation hachés** (SHA-256) en base ; les liens déjà envoyés continuent de marcher.
- **Téléphone** validé et normalisé au format international (P1-04).
- **Motif** : 200 caractères max et consigne « pas de détails médicaux » (P1-05).
- **Numéros d'urgence** (15 / 141) affichés sur la page de réservation.
- **API** : spécialité inconnue → 404 (P2-03) ; **page 404** avec titre traduit (P2-04).

Tests après ces corrections : 36 tests unitaires et 56 tests de bout en bout OK.

## Audit du code source (3e audit) — corrigé le 30/09

| # | Constat | Correction |
|---|---|---|
| S01 | Un rendez-vous futur pouvait être marqué « terminé » / « absent » | Refusé côté serveur avant l'heure du rendez-vous ; boutons masqués ; test E2E |
| S02 | Absence / horaires / médecin masqué sans regard sur les rendez-vous pris | Liste des rendez-vous concernés et refus, sauf confirmation explicite ; test E2E |
| S03 | Patient non prévenu quand le cabinet confirme ou annule | E-mail au patient (dans sa langue, sans motif médical) |
| S04 | `?done=1` affichait « annulé » sans vérification | Message calculé depuis la base ; test E2E |
| S05 | Téléphone sans chiffre accepté | Normalisation +212 / E.164 ; tests unitaires |
| S06 | bcrypt tronque après 72 octets | Refus au-delà de 72 octets, partout |
| S07 | Index de photo hors limites | Bornes complètes vérifiées |
| S08 | Journal / annulation non atomiques | `UPDATE … RETURNING`, journal seulement si la ligne a changé |
| S09 | Panne réseau affichée comme « aucun créneau » | Message dédié et bouton « Réessayer » ; test E2E |
| S10 | Saisie perdue en revenant en arrière ; formulaires admin vidés après une erreur | Saisie et créneau conservés ; formulaires admin gardent les valeurs après une erreur ; test E2E |
| S11 | Référence courte, collision classée « créneau pris » | 8 caractères (~40 bits) et nouvel essai ciblé |
| S12 | 30 février accepté ; calendrier limité à 45 jours | Dates strictes (400) ; tout l'horizon réglé par le cabinet (jusqu'à 6 mois) |
| — | Clé IPv6 /64 approximative | Adresse développée puis /64 exact ; tests unitaires |
| — | Erreurs avant l'insertion non gérées | Toute la réservation protégée : message « erreur, réessayez » au lieu d'un plantage |
| — | Jours hors fenêtre lus en base | Réponse immédiate sans lecture des rendez-vous |

Tests après corrections : 39 tests unitaires et 61 tests de bout en bout OK.

Non retenu pour une démo (à prévoir pour un vrai client) : file d'envoi d'e-mails durable avec reprises (outbox), contrôle de version des modifications simultanées du CMS, journal des consultations de dossiers, version de la notice de consentement enregistrée avec chaque rendez-vous, anonymisation planifiée automatiquement.

## Reste à faire avant un vrai client (hors démo)

1. Identité réelle du cabinet, politique de confidentialité complète validée localement (CNDP) — P0-01, P0-05.
2. Domaine d'envoi vérifié (Resend) pour que les e-mails ne tombent plus en spam.
3. Vérifier l'offre Neon (restauration à un instant donné) et faire un test de restauration.
4. Si des robots apparaissent : CAPTCHA (Cloudflare Turnstile).
5. CSP sans `unsafe-inline` (nonces) si le client accepte des pages rendues à chaque visite.
6. Tests de charge sur un environnement de préproduction, pas sur la production.

## Hors périmètre (évolutions payantes possibles)

Espace patient avec connexion, rappels SMS/WhatsApp, paiement en ligne (CMI), multi-cliniques, dossier médical.
