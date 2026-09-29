# Rapport de recette (QA) — Lumen Santé

Date : 29 septembre 2026 · Version : v8 · Environnement : build de production (`next build` + `next start`), PostgreSQL 16 local, machine de test 2 cœurs.

## 1. Résultat global

| Domaine | Résultat |
|---|---|
| Tests unitaires (Vitest) | **24 / 24** |
| Tests de bout en bout (Playwright, vrai navigateur, vraie base) | **54 / 54** |
| Accessibilité (axe, WCAG 2.1 AA) : 8 pages publiques, 3 en mobile, 7 pages admin | **0 problème grave** |
| Responsive 360 / 768 / 1024 / 1440 / 1920 px | Aucun débordement horizontal |
| TypeScript, ESLint | 0 erreur |
| Double réservation sous concurrence | **0 chevauchement** en base |

## 2. Tenue de charge (100 connexions simultanées pendant 10 s)

| Page / API | Débit | Latence médiane | Erreurs |
|---|---|---|---|
| Accueil `/fr` | ~365 req/s | 273 ms | 0 |
| Réservation `/fr/rendez-vous` | ~720 req/s | 134 ms | 0 |
| API disponibilités | ~700 req/s | 135 ms | 0 |
| API créneaux d'un jour | ~820 req/s | 104 ms | 0 |

Avant optimisation, la page réservation tenait 89 req/s avec une médiane de 968 ms.
En production, les pages et les API publiques sont servies par le CDN de Vercel : ces chiffres, mesurés sur une petite machine sans CDN, sont un plancher.

**Réservations simultanées** (Server Action réelle, adresses IP différentes) :

- 87 patients réservent en même temps des créneaux différents : 87 acceptés, 1,5 s pour le lot entier.
- 50 patients visent le même créneau : exactement autant d'acceptés que de médecins libres à cette heure (2), les 48 autres reçoivent « créneau pris ».
- Contrôle SQL : aucun rendez-vous actif qui se chevauche pour un même médecin.

## 3. Anomalies trouvées et corrigées pendant la recette

| # | Gravité | Constat | Correction |
|---|---|---|---|
| 1 | Moyenne | Se déconnecter n'invalidait pas un cookie déjà volé | Version de session en base : déconnexion, changement de mot de passe et désactivation coupent toutes les sessions |
| 2 | Moyenne | Un RDV terminé ou annulé pouvait changer de statut | Transitions autorisées vérifiées côté serveur, mise à jour conditionnelle |
| 3 | Moyenne | Double booking possible si la durée d'une spécialité changeait (heures de début différentes) | Contrainte d'exclusion PostgreSQL sur les plages horaires |
| 4 | Moyenne | Limite « 3 RDV par e-mail » contournable par des requêtes parallèles | Vérification sous verrou transactionnel |
| 5 | Moyenne | Page réservation lente sous charge (rendue à chaque visite) | Page statique + API de disponibilités en cache CDN |
| 6 | Faible | Liens acceptés dans le nom du patient (phishing via les e-mails du cabinet) | Refusés dans le nom et le motif |
| 7 | Faible | Journaux serveur pouvant contenir des paramètres SQL | Journalisation épurée |
| 8 | Faible | Pas de gestion des mots de passe dans l'admin | Page « Mon compte » + réinitialisation par l'administrateur |
| 9 | Faible | Pas de page de confidentialité ni de purge des anciennes données (loi 09-08) | Page en 3 langues + anonymisation en un clic |
| 10 | Faible | Contraste insuffisant des étapes inactives (1,9 : 1) | Relevé au niveau AA (≥ 4,5 : 1) |
| 11 | Faible | Pas de lien « Aller au contenu » ni de focus clavier visible | Ajoutés sur tout le site |
| 12 | Faible | Recherche d'un patient limitée à un jour ou une semaine | Option « Toutes les dates » |
| 13 | Faible | Nom des spécialités modifié dans le CMS mais ancien nom affiché dans l'admin | L'admin lit le CMS |
| 14 | Faible | Un patient noté « absent » puis arrivé en retard ne pouvait plus être marqué « terminé » | Bouton ajouté |
| 15 | Info | Pas de point de supervision | `/api/health` |
| 16 | Info | Les tests E2E pouvaient viser une base hébergée | Refus automatique hors base locale ; le test du CMS remet le texte d'origine |

## 4. Couverture des tests automatiques

- **Public** : 3 langues (lang, dir RTL, titre), redirection de la racine, pages principales, 404 traduite, lien de confidentialité, robots/sitemap, responsive, en-têtes de sécurité, cache de l'admin, API (validation, cache, spécialité inconnue), santé.
- **Réservation** : parcours complet jusqu'à la base, créneau retiré ensuite, annulation par lien, jeton inventé, champs invalides, lien dans le nom, 5 réservations simultanées du même créneau, chevauchement refusé par la base.
- **Espace cabinet** : redirections sans session, mauvais mot de passe, injection, cookie falsifié, attributs du cookie, révocation après déconnexion, restrictions du rôle STAFF, blocage anti force brute, affichage de toutes les pages, modification du contenu, recherche patient + changements de statut, horaires qui se chevauchent.
- **Accessibilité** : axe sur 18 écrans, lien d'évitement, focus visible, réservation au clavier.

## 5. Limites connues (assumées, documentées)

- Pas de CAPTCHA : remplacé par la limitation par réseau, le champ piège et le verrou par e-mail. À ajouter (Cloudflare Turnstile) si des robots apparaissent.
- CSP avec `unsafe-inline` pour les scripts : nécessaire aux pages statiques de Next.js (les nonces rendraient chaque page dynamique, donc plus lente).
- Mesures de charge faites sur une machine de 2 cœurs sans CDN : à refaire sur l'URL Vercel (preview) avant d'annoncer des chiffres.
- Sauvegardes : assurées par Neon (restauration à un instant donné selon l'offre), à vérifier à la mise en production.
- Aucun outil de suivi d'erreurs branché (Sentry ou équivalent) : recommandé dès le premier client réel.

## 6. Refaire la recette

```bash
docker compose up -d
npm run db:migrate
npx playwright install chromium   # une fois
npm test
npm run build
npm run test:e2e
```
