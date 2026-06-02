# Digi-Farm — Instructions Claude Code

## Qui je suis
Je construis Digi-Farm, une marketplace qui relie directement les agriculteurs du Togo
et les acheteurs (grossistes, restaurants, particuliers). Objectif : vendre des produits
agricoles en ligne avec paiement sécurisé et livraison. Public : utilisateurs sur mobile,
connexion souvent lente, parfois peu à l'aise avec le numérique. Langue : français.

## Stack technique — VERSIONS FIGÉES (Phase 0)
- **Next.js 16.2.6** (App Router, Turbopack) + **TypeScript 5.9.3** (strict)
- **Tailwind CSS 4.3.0** (@tailwindcss/postcss 4.3.0)
- **Biome 2.2.0** (lint + format)
- Base de données : **SQLite** via **better-sqlite3 12.10.0** + **Drizzle ORM 0.45.2** (migrations **drizzle-kit 0.31.10**)
- Validation : **zod 4.4.3**
- Tests : **vitest 3.2.4** (vitest 4 évité : sa dépendance native rolldown ne s'installait pas)
- React **19.2.4** / react-dom **19.2.4**
- Auth : **gérée par l'application** (sessions en base + cookie httpOnly sécurisé, mots de passe hachés). PAS de service externe.
- Stockage des photos : **système de fichiers local** (compression à l'upload via sharp, ajouté en Phase 2)
- Paiement : agrégateur mobile money/carte avec PayIn ET PayOut (voir docs/blueprints/paiement.md)
- Hébergement : local pour l'instant (à décider plus tard ; attention SQLite ≠ serverless)
- Gestionnaire de paquets : **pnpm 11.5.0** (versions exactes via .npmrc `save-exact=true`)
- **Design UI** : direction shadcn/ui + Tailwind + animations, inspiration https://21st.dev (à implémenter aux phases UI 1-3)

### Notes d'environnement (Windows)
- Le `fetch` de pnpm timeoute sur ce poste (IPv6) : lancer les installs avec
  `NODE_OPTIONS="--dns-result-order=ipv4first"` si une dépendance refuse de se télécharger.
- Builds natifs autorisés dans pnpm-workspace.yaml : better-sqlite3, esbuild, sharp.

## Rôles utilisateurs
- agriculteur (vendeur) : publie des annonces, gère ses commandes
- acheteur : recherche, commande, paie, note
- admin : modère, gère litiges, voit les commissions

## Règles NON NÉGOCIABLES
1. **Plus de RLS** (SQLite n'en a pas) → TOUTE l'autorisation se fait CÔTÉ SERVEUR.
   Lis docs/blueprints/autorisation.md AVANT d'écrire un accès aux données. Chaque
   server action / route handler vérifie : session valide + rôle + propriété de la ressource.
2. L'autorisation utilise UNIQUEMENT le rôle stocké côté serveur (table profile / session),
   JAMAIS une donnée modifiable par le client.
3. JAMAIS de clé API / secret en dur dans le code. Tout passe par les variables d'env.
4. JAMAIS spéculer sur une API externe (paiement) : lis sa doc officielle AVANT de coder.
   Si tu n'es pas sûr qu'une fonction existe, dis-le, ne l'invente pas.
5. L'argent d'une commande est SÉQUESTRÉ : il n'est reversé au vendeur qu'après
   confirmation de réception par l'acheteur (voir docs/blueprints/paiement.md).
6. Mobile-first, économe en données : compresse les images à l'upload, pagine les listes.
7. Zéro `any` TypeScript sans justification écrite en commentaire.
8. Ne crée jamais de feature non demandée. Si une décision d'architecture est ambiguë,
   pose-moi la question AVANT de coder.
9. Toute mutation de données passe par une couche serveur (server action / route) qui
   valide les entrées (quantités, prix, montants) — jamais de confiance au client.

## Méthode de travail
- Travaille par petits incréments testables. Une fonctionnalité = un commit.
- Écris de VRAIS tests et EXÉCUTE-les réellement avant de dire que ça passe.
- Avant de te dire « terminé », lance : pnpm typecheck && pnpm lint && pnpm test && pnpm build.
- À la fin de session : résume ce qui est fait, ce qui reste, et mets à jour
  « Ce qui a été décidé » ci-dessous.

## Commandes
- pnpm dev / pnpm typecheck / pnpm lint / pnpm test / pnpm build
- pnpm db:generate (génère migrations Drizzle) / pnpm db:migrate (applique) / pnpm db:studio

## Ce qui a été décidé
(Mettre à jour à chaque session — garder les 5 décisions les plus récentes.)
- **Refonte design + architecture (sur retour utilisateur)** : `/` = **landing éditoriale** (hero, étapes,
  produits en vedette, CTA), **catalogue déplacé sur `/marche`** (recherche+filtres+pagination 12/page).
  Fiche produit `/produits/[id]`. 38 tests, build+runtime prod OK.
- **Design = taste-skill / variante « soft » (editorial luxury)** : palette **crème chaud + vert sauge +
  espresso** (OKLCH), titres en **Fraunces** (serif éditorial), corps Geist, boutons `rounded-full`,
  easing `--ease-soft` cubic-bezier(0.32,.72,0,1), ombres douces, `animate-fade-up` (blur+translate). Réf. 21st.dev.
- **Images** : `next.config.ts` → `images.unoptimized: true`. L'optimizer Next 16 rejette les chemins
  locaux `/uploads/**` (« url parameter is invalid »), ce qui CASSAIT l'affichage. On sert les WebP
  (déjà compressés par sharp) en direct. La landing est **auth-aware** (pas de « créer un compte » si connecté).
- **Tableau de bord par rôle** : `/tableau-de-bord` (protégé) rend `SellerDashboard` ou `BuyerDashboard`.
  Connexion/inscription → **tout le monde → /tableau-de-bord**. « Commander » : connecté → placeholder
  (Phase 4) ; déconnecté → lien connexion.
- **Seed riche** : `node scripts/seed-demo.cjs` → 3 vendeurs + **25 annonces** avec **vraies photos**
  (Wikimedia Commons : recherche filtrée + **surcharges explicites** `Special:FilePath` pour les cas durs ;
  LoremFlickr abandonné car non pertinent). `--dry-run` montre les fichiers résolus, `--clean` retire.
  **Piège** : `next start` indexe `public/` au démarrage → **redémarrer le serveur après un seed**, sinon images 404.
- **Rappels** : auth scrypt + sessions SHA-256 ; autorisation serveur (pas de RLS) ; SQLite+Drizzle **synchrone** ;
  `server-only` aliasé en test ; `middleware.ts` déprécié Next 16 (à renommer `proxy` plus tard) ;
  crash worker Turbopack possible en *dev* sur routes DB → vérifier en **prod**.
