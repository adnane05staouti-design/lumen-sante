# Décisions du projet — Lumen Santé

Ce fichier liste chaque règle métier et chaque choix technique du site, avec sa raison.
Chaque ligne est une **proposition à relire, modifier ou valider** par le responsable du projet.
Une décision n'est « prise » que lorsqu'elle est cochée ✅ et qu'on sait l'expliquer soi-même.

Statuts : ⬜ à valider · ✅ validé · ✏️ modifié (préciser)

---

## 1. Cahier des charges (périmètre)

| # | Décision | Pourquoi | Statut |
|---|---|---|---|
| C1 | Un seul code pour tous les clients, réglé par `src/config/clinic.ts` | Vendre le même produit à un dentiste, un ophtalmologue ou un centre multi-spécialités sans réécrire | ⬜ |
| C2 | 3 langues : français, arabe (droite à gauche), anglais | Patientèle marocaine + étrangers | ⬜ |
| C3 | Réservation sans compte patient (nom, téléphone, e-mail) | Moins de friction ; le patient n'a pas à retenir un mot de passe | ⬜ |
| C4 | Annulation par lien secret reçu par e-mail | Pas de compte patient, mais le patient reste autonome | ⬜ |
| C5 | Espace cabinet avec 2 rôles : ADMIN (tout) et STAFF (rendez-vous seulement) | La secrétaire gère l'agenda sans pouvoir modifier les médecins ni les comptes | ⬜ |
| C6 | Hors périmètre v1 : paiement en ligne, dossier médical, téléconsultation, rappels SMS/e-mail | Données de santé et paiement = contraintes légales lourdes ; à vendre en option | ⬜ |
| C7 | Photos : banques libres de droits (Unsplash hors « + », Pexels) en démo, photos du client en production ; pas de faux avis patients | Crédibilité et légalité | ⬜ |
| C8 | Tout le contenu est modifiable dans /admin/contenu (logo, nom, couleurs, coordonnées, textes FR/AR/EN, spécialités, photos, chiffres, SEO, e-mails) ; les valeurs d'origine restent dans le code et peuvent être rétablies | Le cabinet est autonome sans développeur ; aucun risque de « casser » le site | ⬜ |

## 2. Règles de réservation (modifiables dans `/admin/parametres`)

| # | Règle | Valeur par défaut | Pourquoi | Statut |
|---|---|---|---|---|
| R1 | Confirmation automatique | Oui | Si « non », le RDV est « en attente » jusqu'à validation par le cabinet | ⬜ |
| R2 | Délai minimum avant un RDV | 2 h | Le cabinet doit pouvoir s'organiser | ⬜ |
| R3 | Réservation possible jusqu'à | 60 jours | Évite les RDV trop lointains souvent oubliés | ⬜ |
| R4 | Annulation en ligne jusqu'à | 24 h avant | Au-delà, le patient appelle le cabinet | ⬜ |
| R5 | RDV à venir maximum par e-mail | 3 | Empêche une personne de bloquer l'agenda | ⬜ |
| R6 | Durée d'un créneau = durée de la spécialité | 20 à 45 min selon spécialité | Réglable par spécialité dans l'admin | ⬜ |
| R7 | « Premier médecin disponible » possible | — | Le patient qui n'a pas de préférence voit plus de créneaux | ⬜ |
| R8 | Un créneau est libre si : dans l'horaire du médecin, hors absence, après le délai minimum, sans chevauchement avec un RDV en attente ou confirmé | — | Définition unique utilisée partout (site et serveur) | ⬜ |
| R9 | Heures calculées dans le fuseau du cabinet (`Africa/Casablanca`), stockées en UTC | — | Un patient à l'étranger voit les bonnes heures ; pas d'erreur au changement d'heure | ⬜ |
| R10 | Horaires par défaut d'un nouveau médecin : lun–ven 09:00–13:00 / 14:00–18:00 | — | Modifiables ensuite, 2 plages par jour | ⬜ |
| R11 | Statuts d'un RDV : en attente, confirmé, annulé, terminé, absent. Passages autorisés : en attente → confirmé/annulé ; confirmé → terminé/absent/annulé ; absent → terminé (patient arrivé en retard). Tout autre changement est refusé par le serveur | — | « Absent » permet de suivre les rendez-vous non honorés ; un RDV terminé ou annulé ne peut pas « revivre » | ⬜ |
| R12 | Un administrateur ne peut pas désactiver son propre compte | — | Évite de bloquer le cabinet hors de son site | ⬜ |
| R14 | Recherche d'un patient (nom, téléphone, référence) sur un jour, 7 jours ou toutes les dates | — | L'accueil retrouve l'historique d'un patient au téléphone | ⬜ |
| R15 | « Terminé » et « Absent » seulement une fois l'heure du rendez-vous passée | — | Un créneau à venir n'est jamais libéré par erreur | ⬜ |
| R16 | Absence, nouveaux horaires ou médecin masqué qui touchent des rendez-vous déjà pris : refusé avec la liste des rendez-vous concernés, sauf case « Enregistrer quand même » | — | Le cabinet décide et prévient les patients ; rien n'est annulé en silence | ⬜ |
| R17 | Le patient reçoit un e-mail quand le cabinet confirme ou annule son rendez-vous (nouveau lien d'annulation à la confirmation) | — | Le patient est toujours informé d'une décision le concernant | ⬜ |
| R18 | Référence de réservation : 8 caractères sans lettres ambiguës (LS-7KQ2M9XA) | 6 caractères hexadécimaux | Lisible au téléphone, collisions quasi impossibles (et réessayées si besoin) | ⬜ |
| R13 | Le widget de l'accueil affiche les vraies disponibilités (même moteur que la réservation) et le prochain créneau libre ; l'heure choisie est pré-sélectionnée sur la page de réservation | — | Pas de faux créneaux : ce que le patient voit est réservable | ⬜ |

## 3. Sécurité

| # | Décision | Pourquoi | Statut |
|---|---|---|---|
| S1 | Jamais de double réservation : index unique partiel (médecin + heure) **et** contrainte d'exclusion PostgreSQL (aucun chevauchement d'horaires pour un même médecin, RDV actifs) | Même si deux patients cliquent à la même seconde, ou si la durée d'une spécialité change, la base en refuse un | ⬜ |
| S2 | Le serveur revérifie toujours le créneau | On ne fait jamais confiance à ce qu'envoie le navigateur | ⬜ |
| S3 | Toutes les entrées validées par Zod (format téléphone, e-mail, longueurs) | Données propres, pas d'injection | ⬜ |
| S4 | Requêtes SQL paramétrées via Drizzle, jamais de SQL concaténé | Protection contre l'injection SQL | ⬜ |
| S5 | Mots de passe : bcrypt coût 12, 12 caractères minimum | Illisibles même en cas de fuite de la base | ⬜ |
| S6 | Session : JWT signé, cookie HttpOnly + SameSite=Lax + Secure en production, 8 h | Pas lisible par JavaScript, protège du vol de session et du CSRF | ⬜ |
| S7 | Chaque page et action admin revérifie l'utilisateur et son rôle en base | Un compte désactivé perd l'accès immédiatement | ⬜ |
| S8 | Anti force brute : 5 essais / 15 min par compte depuis un même réseau, 10 par réseau, 50 par compte au total | Bloque les dictionnaires ; un inconnu ne peut pas bloquer le vrai utilisateur depuis un autre réseau | ⬜ |
| S9 | Limitation de débit : 10 réservations / h par réseau (IPv6 : par bloc /64), 20 annulations / h ; limite par e-mail vérifiée sous verrou (des requêtes parallèles ne la contournent pas) | Anti-spam sans gêner les IP partagées des opérateurs mobiles | ⬜ |
| S10 | Champ piège invisible (honeypot) dans le formulaire | Les robots le remplissent, les humains non | ⬜ |
| S11 | Journal d'activité : connexions, modifications, changements de statut | Savoir qui a fait quoi | ⬜ |
| S12 | En-têtes : CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy | Protection navigateur (clickjacking, injection de scripts) | ⬜ |
| S13 | `/admin` non indexé par Google et jamais mis en cache | L'espace cabinet reste privé | ⬜ |
| S14 | Consentement explicite obligatoire avant réservation | Loi marocaine 09-08 sur les données personnelles | ⬜ |
| S15 | Secrets uniquement dans les variables d'environnement, `.env` jamais publié | Aucune clé dans le code | ⬜ |
| S17 | Déconnexion réelle : chaque session porte un numéro de version ; « Se déconnecter », changer son mot de passe ou désactiver un compte invalide immédiatement tous les cookies existants | Un cookie volé ne sert plus à rien après la déconnexion | ⬜ |
| S18 | Gestion des mots de passe dans l'admin : changer le sien (ancien mot de passe exigé, 12 caractères, 6 différents, sans son nom d'e-mail), réinitialiser celui d'un employé (ADMIN) | Plus besoin de toucher à la base pour un oubli | ⬜ |
| S19 | Aucun lien accepté dans le nom ou le motif du patient | Empêche d'utiliser les e-mails du cabinet pour envoyer du phishing | ⬜ |
| S20 | Journaux serveur sans données : ni paramètres SQL, ni corps d'e-mail, ni mot de passe tapé dans le mauvais champ | Les logs d'hébergement ne contiennent aucune donnée de santé | ⬜ |
| S21 | Notification au cabinet sans motif ni e-mail du patient | Le minimum de données circule par e-mail | ⬜ |
| S22 | Page « Confidentialité » (loi 09-08) en 3 langues, liée au consentement ; anonymisation en un clic des RDV de plus de N mois (6 à 120) | Droits des patients et durée de conservation limitée | ⬜ |
| S23 | CMS protégé contre la pollution de prototype (`__proto__`, `constructor`…), chemins limités, sauvegarde par section | Un texte piégé ne peut pas casser le serveur | ⬜ |
| S24 | Connexion TLS vérifiée vers la base en production (Neon) ; tests automatiques refusés sur une base hébergée | Pas d'interception ; pas de données de production effacées par erreur | ⬜ |
| S25 | Limites connues, assumées : pas de CAPTCHA ; CSP avec `unsafe-inline` (scripts internes de Next.js, sinon toutes les pages deviennent dynamiques) | Compromis vitesse / complexité, à revoir si le site est attaqué | ⬜ |
| S26 | Double authentification (code à 6 chiffres, TOTP) pour le personnel, facultative mais rappelée sur le tableau de bord ; secret chiffré en base (AES-256-GCM), un code ne sert qu'une fois, 8 codes de secours à usage unique (empreintes seulement), réinitialisation par un administrateur | Un mot de passe volé ne suffit plus pour lire les données des patients | ⬜ |
| S27 | Liens d'annulation : seule l'empreinte SHA-256 du jeton est stockée ; le lien ne marche que pour un rendez-vous à venir et une seule fois | Une fuite de la base ne permet pas d'annuler des rendez-vous | ⬜ |
| S28 | Téléphone validé et enregistré au format international (+212…) | Rappels et appels sans erreur de numéro | ⬜ |
| S29 | Motif limité à 200 caractères avec consigne « pas de détails médicaux » ; jamais dans les e-mails ni les journaux | Minimisation des données de santé (loi 09-08) | ⬜ |
| S30 | Message « Urgence : appelez le 15 ou le 141 » sur la page de réservation | La réservation en ligne ne doit jamais retarder une urgence | ⬜ |
| S31 | Limitation de débit IPv6 par réseau /64 calculé sur l'adresse développée (toutes les écritures d'une même adresse comptent ensemble) | Contournement impossible en changeant l'écriture de l'adresse | ⬜ |
| S32 | Mots de passe limités à 72 octets (limite de bcrypt), mêmes règles partout (création, changement, réinitialisation, seed) | Un mot de passe trop long ne serait pas vérifié en entier | ⬜ |
| S33 | Page d'annulation : le message vient toujours de la base, jamais de l'adresse (« ?done=1 » ne prouve rien) | Pas de fausse confirmation | ⬜ |
| S16 | Images envoyées : 4 Mo max, type vérifié, image réellement décodée (sharp), redimensionnée et ré-encodée (métadonnées GPS supprimées), SVG converti en PNG ; textes limités en longueur, caractères de contrôle retirés ; réservé au rôle ADMIN et journalisé | Un fichier piégé ou un texte malveillant ne peut pas passer | ⬜ |

## 4. Choix techniques

| # | Choix | Alternative écartée | Pourquoi | Statut |
|---|---|---|---|---|
| T1 | Next.js 16 (App Router) | React seul + API séparée | Un seul projet front + back, rendu serveur rapide, SEO | ⬜ |
| T2 | Server Actions | API REST | Moins de code, validation côté serveur, pas d'API publique à protéger | ⬜ |
| T3 | PostgreSQL | MySQL, MongoDB | Index uniques partiels (règle S1), transactions solides, offre gratuite Neon | ⬜ |
| T4 | Drizzle ORM | Prisma | Léger, SQL lisible, pas de moteur binaire à télécharger | ⬜ |
| T5 | Auth maison (bcrypt + JWT) | NextAuth / Clerk | Peu d'utilisateurs, besoin simple, aucun service externe payant | ⬜ |
| T6 | Tailwind CSS v4 | CSS classique | Rapide à maintenir, thème piloté par la config client | ⬜ |
| T7 | Un seul canvas 3D de particules pour toute la page (formes calculées : sphère, dent, œil, cerveau, peau, ourson, cœur, ADN), chargé après l'affichage (ordinateur) ou au premier toucher (téléphone ≥ 4 cœurs), 14 000 / 5 000 particules | Modèles 3D téléchargés, 3D par section | Un seul appel GPU, aucun fichier 3D à télécharger, premier affichage instantané | ⬜ |
| T10 | Animations au scroll par un seul IntersectionObserver + CSS, composants client uniquement pour les sections épinglées | Un composant animé par bloc | Mobile : blocage du thread principal 1 130 ms → 90 ms | ⬜ |
| T11 | Polices auto-hébergées via next/font (préchargées, sans décalage de mise en page) | Google Fonts externes | Pas de requête externe (CSP stricte), CLS = 0 | ⬜ |
| T12 | Intro animée et titres animés seulement sur ordinateur | Partout | Sur téléphone le contenu s'affiche immédiatement | ⬜ |
| T13 | Rythme « dynamique » : morphing 3D 0,85 s, 60 % d'écran par spécialité, scroll Lenis plus nerveux, clic = onde de choc sur les particules, cartes inclinables, bandeaux qui suivent la vitesse du scroll | Animations lentes et longues sections épinglées | Le visiteur voit quelque chose changer à chaque geste | ⬜ |
| T14 | Curseur normal du système (pas de curseur personnalisé), galerie en grille « bento » au scroll normal (pas de défilement horizontal forcé), spécialités illustrées par la 3D sans photo | Curseur perso, galerie horizontale épinglée, photo par spécialité | Plus facile à utiliser ; un seul point focal par section ; seulement 5 photos à fournir par client | ⬜ |
| T15 | Images stockées dans PostgreSQL (table media), servies par /media/<id> avec cache d'un an ; photos réduites dans le navigateur avant l'envoi | Stockage externe (S3, Cloudinary, Vercel Blob) | Aucun service de plus à payer ou configurer ; sauvegardé avec la base ; limite de 4,5 Mo de Vercel respectée | ⬜ |
| T16 | Disponibilités lues par `/api/availability` et `/api/slots` (GET) mises en cache au CDN 10–30 s et invalidées à chaque réservation / modification | Server Actions (jamais en cache) | Des milliers de visiteurs = quelques requêtes SQL par minute ; page réservation 89 → 650+ req/s | ⬜ |
| T17 | Page réservation pré-générée (statique), le choix du jour se fait dans le navigateur | Page rendue à chaque visite | Latence médiane 968 ms → 140 ms sous 100 connexions | ⬜ |
| T18 | Pool de 3 connexions par instance, URL poolée de Neon, fonctions Vercel à Francfort (`vercel.json`) | Grand pool, région par défaut (USA) | Le serverless multiplie les instances : un petit pool évite de saturer la base ; la base et le code sont proches | ⬜ |
| T19 | Tests automatiques : Vitest (moteur de créneaux, fuseau, CMS) + Playwright (parcours, sécurité, accessibilité axe, responsive 360–1920 px) | Tests manuels seulement | Chaque modification peut être revérifiée en 2 minutes | ⬜ |
| T20 | Accessibilité : lien « Aller au contenu », focus clavier visible, contraste AA, animations coupées si « réduire les animations » est activé | — | Utilisable au clavier et par lecteur d'écran | ⬜ |
| T21 | `/api/health` pour la supervision (200 si le site et la base répondent) | — | Être alerté avant les patients | ⬜ |
| T8 | Resend pour les e-mails | SMTP | API simple, bonne délivrabilité ; sans clé, les e-mails s'affichent en local | ⬜ |
| T9 | Vercel + Neon | VPS | Déploiement à chaque push, HTTPS automatique, coût nul au départ | ⬜ |

## 5. Tests réalisés (à refaire soi-même avant de les citer)

| # | Test | Résultat attendu | Statut |
|---|---|---|---|
| E1 | Réservation complète FR | Référence LS-XXXXXX + e-mail | ⬜ |
| E2 | Deux réservations simultanées du même créneau | Une acceptée, l'autre « créneau pris » | ⬜ |
| E3 | E-mail invalide ; lien dans le nom | Le navigateur bloque ; le serveur refuse le lien | ⬜ |
| E4 | Texte type injection SQL dans le motif | Enregistré tel quel, sans effet | ⬜ |
| E5 | Mauvais mot de passe × 7 | Blocage « Trop de tentatives » | ⬜ |
| E6 | Compte STAFF sur `/admin/parametres` | Redirigé | ⬜ |
| E7 | Cookie de session falsifié | Renvoyé vers la connexion | ⬜ |
| E8 | Annulation par lien en arabe | RDV annulé, créneau de nouveau libre | ⬜ |
| E10 | 5 réservations simultanées du même créneau (auto) | Une seule enregistrée | ⬜ |
| E11 | 87 réservations simultanées (créneaux différents) + 50 patients sur un seul créneau | 87 acceptées ; sur le créneau disputé, autant d'acceptées que de médecins libres ; 0 chevauchement en base | ⬜ |
| E12 | Déconnexion puis réutilisation de l'ancien cookie | Refusé | ⬜ |
| E13 | Charge 100 connexions / 10 s (machine 2 cœurs) | Réservation ~700 req/s, API créneaux ~800 req/s, 0 erreur | ⬜ |
| E14 | Audit axe (WCAG 2.1 AA) sur 8 pages publiques, 3 en mobile, 7 pages admin | 0 problème grave | ⬜ |
| E15 | Aucun défilement horizontal à 360, 768, 1024, 1440, 1920 px | OK | ⬜ |
| E16 | Suite complète `npm run test:e2e` | 54 scénarios OK | ⬜ |
| E9 | Lighthouse (production) | Desktop ~99, mobile ~88 | ⬜ |

## 6. Journal des changements de décision

| Date | Décision | Avant → Après | Raison |
|---|---|---|---|
| 2026-09-29 | S1, S8, S9, R11 | Voir tableau | Audit QA complet avant publication | ⬜ |
