# Photos du site

Les images actuelles sont des **images provisoires** (dégradés abstraits, sans texte).
Remplacez chaque fichier par une vraie photo **en gardant exactement le même nom**,
puis lancez `npm run clean` avant `npm run build` (sinon Next.js garde en cache les anciennes images).

Seule la galerie « Le centre » utilise des photos (5 fichiers) : les spécialités sont illustrées par la 3D.

Format conseillé : JPG, paysage, au moins 1600 px de large, moins de 400 Ko
(compresser avec https://squoosh.app). Next.js génère ensuite automatiquement
les versions WebP/AVIF adaptées à chaque écran.

| Fichier | Sujet | Recherche suggérée (Unsplash / Pexels) |
|---|---|---|
| centre/accueil.jpg | Accueil | clinic reception modern |
| centre/attente.jpg | Salle d'attente | hospital waiting room modern |
| centre/consultation.jpg | Consultation | doctor consultation patient |
| centre/equipement.jpg | Plateau technique | medical equipment MRI |
| centre/equipe.jpg | Équipe | medical team doctors |

Licences : les photos Unsplash (hors « Unsplash+ ») et Pexels sont gratuites, y compris pour un usage
commercial, sans attribution obligatoire. Pour un vrai client, utilisez de préférence ses propres photos.
