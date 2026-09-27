# Digi-Farm — Instructions Claude Code

## Qui je suis
Je construis Digi-Farm, une marketplace qui relie directement les agriculteurs du Togo
et les acheteurs (grossistes, restaurants, particuliers). Objectif : vendre des produits
agricoles en ligne avec paiement sécurisé et livraison. Public : utilisateurs sur mobile,
connexion souvent lente, parfois peu à l'aise avec le numérique. Langue : français.

## Stack technique — DJANGO (stack courante)
Réécriture décidée le 27/09/2026 : je ne maîtrise pas Next.js, et une app que je ne peux pas
maintenir est une dette, pas un actif. Django colle aussi mieux au produit (tout est rendu
côté serveur, ~0 Ko de JS sur connexion lente, SQLite sur VPS ordinaire, admin offert).
Le code vit dans **`digifarm/`** — voir `digifarm/README.md`.
- **Django 5.2 LTS** + **Python 3.13** (auth, sessions, ORM, migrations, admin natifs)
- **Tailwind CSS 4.3.0** via `@tailwindcss/cli` (`pnpm css:build` / `css:watch`)
- **HTMX 2.0.8** vendorisé en local (`static/js/`) — pas de CDN, pas de build JS
- Base de données : **SQLite** via l'ORM Django (WAL + foreign_keys ON)
- Validation : **formulaires Django** (remplacent zod)
- Tests : **pytest 9 + pytest-django 4.11**
- Auth : **`django.contrib.auth`** + modèle **`comptes.Profil`** (1-1) qui porte le rôle.
  L'auth maison (scrypt + sessions) a été supprimée : Django fait mieux et est maintenu.
- Photos : **Pillow** (compression WebP à l'upload, remplace sharp) vers `<dépôt>/media/`
- Icônes : SVG lucide inlinés via `{% icone %}` — registre généré (`pnpm icones`)
- Polices : **Fraunces** (titres) depuis Google Fonts ; **pile système** pour le corps
  (économie de ~100 Ko au premier chargement)

### Ancienne stack Next.js — CONSERVÉE EN RÉFÉRENCE (racine du dépôt)
Gelée, plus de développement dessus. À supprimer une fois la parité atteinte.
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
   Lis docs/blueprints/autorisation.md AVANT d'écrire un accès aux données. Chaque vue
   vérifie : session valide + rôle + propriété de la ressource — via `core/autorisation.py`
   (`@login_required`, `@role_requis` / `@agriculteur_requis`, `objet_possede_par`).
2. L'autorisation utilise UNIQUEMENT le rôle stocké côté serveur (`comptes.Profil`),
   JAMAIS une donnée modifiable par le client.
3. JAMAIS de clé API / secret en dur dans le code. Tout passe par les variables d'env.
4. JAMAIS spéculer sur une API externe (paiement) : lis sa doc officielle AVANT de coder.
   Si tu n'es pas sûr qu'une fonction existe, dis-le, ne l'invente pas.
5. L'argent d'une commande est SÉQUESTRÉ : il n'est reversé au vendeur qu'après
   confirmation de réception par l'acheteur (voir docs/blueprints/paiement.md).
6. Mobile-first, économe en données : compresse les images à l'upload, pagine les listes.
7. Code typé et explicite : annotations sur les fonctions métier ; aucun `except`
   silencieux ni `# type: ignore` sans justification écrite en commentaire.
8. Ne crée jamais de feature non demandée. Si une décision d'architecture est ambiguë,
   pose-moi la question AVANT de coder.
9. Toute mutation de données passe par un formulaire Django (validation) puis un
   service (`commandes/services.py`) — jamais de confiance au client. Les montants sont
   TOUJOURS recalculés côté serveur depuis la base.
10. L'argent ne se modifie pas à la main : aucun code hors `commandes/services.py` ne touche
   `statut_sequestre`. Les transitions passent par `commandes/sequestre.py` et sont
   journalisées dans `JournalPaiement` (piste d'audit, jamais effacée).

## Méthode de travail
- Travaille par petits incréments testables. Une fonctionnalité = un commit.
- Écris de VRAIS tests et EXÉCUTE-les réellement avant de dire que ça passe.
- Avant de te dire « terminé », lance : `pnpm css:build` puis, depuis `digifarm/`,
  `python manage.py check && python -m pytest`.
- À la fin de session : résume ce qui est fait, ce qui reste, et mets à jour
  « Ce qui a été décidé » ci-dessous.

## Commandes (Django — depuis `digifarm/`)
- `python manage.py runserver` / `check` / `migrate` / `makemigrations`
- `python manage.py seed_demo` (`--clean`, `--sans-commande`) / `createsuperuser`
- `python -m pytest` (tout) / `python -m pytest commandes` / `-k <mot-clé>`
- Depuis la racine : `pnpm css:build` ou `pnpm css:watch` (Tailwind), `pnpm icones`

## Ce qui a été décidé
(Mettre à jour à chaque session — garder les 5 décisions les plus récentes.)
- **27/09/2026 — passage à Django, en parallèle, phase par phase** (branche `django`).
  Nouveau projet dans `digifarm/` ; l'app Next reste à la racine, gelée, comme référence.
  Décisions prises : **auth Django native + `Profil`** (rôle en base, pas de champ client) ;
  **HTMX** pour le peu d'interactivité (pas d'Alpine, pas de build JS) ; **re-seed** à neuf
  (`seed_demo`) plutôt que migration de l'ancienne base — les **photos et le catalogue curé
  sont réutilisés** via `core/fixtures/catalogue_demo.json`.
  Porté en une passe : schéma, logique pure (`tarifs`/`statuts`/`sequestre`/`liberation`),
  services transactionnels, webhook signé, marché, CRUD annonces, tunnel + paiement simulé,
  suivi, litige. **90 tests verts.** Palette OKLCH et Fraunces conservées telles quelles ;
  corps de texte en pile système (économie de données).
  **Classes de composants CSS** (`.bouton primaire`, `.carte`, `.badge succes`, `.champ`)
  définies dans `static/src/input.css` : gabarits lisibles, pas de soupe d'utilitaires.
  **Admin Django** = base de la Phase 8 (litiges), avec paiements/journal en lecture seule.
  **Tableau de bord vendeur refait** (c'était la demande d'origine) : tuiles bento
  (à traiter / sous séquestre / encaissé), file d'action avec le bouton de progression
  *dans* la ligne, inventaire avec alertes de stock, états vides guidés.
  Reste à faire : reprendre les avis/notes, la résolution admin des litiges, le déploiement,
  puis supprimer `src/` et les dépendances Next.
- **Phase 5 terminée — suivi + confirmation de réception → libération** : vendeur marque préparée/expédiée ;
  acheteur **confirme la réception** → `releaseEscrowOnReception` fait le **PayOut net (total − commission 5%)**,
  sequestre→**libere**, commande **livree**. **Litige** (`orders.litige_motif`) bloque la libération ;
  résolution admin = Phase 8. États commande dans `order-status.ts` (pur). Lib auto interdite ailleurs.
  **64 tests** dont **test d'intégration du flux** (`release-flow.test.ts`) + E2E webhook 11/11 toujours vert.
- **Phase 4 — commande + paiement séquestré** : orders/order_items/payments/payment_audit ; tunnel
  `/commander/[id]` (total serveur, commission 5%, anti self-buy, stock) → agrégateur **SIMULÉ**
  `/paiement/mock/[ref]` → **webhook signé** `/api/paiement/webhook` (HMAC, idempotent, montant vérifié).
  `escrow.ts` : en_attente→collecte→sequestre. PayOut via `PaymentProvider.payout` (mock). `node scripts/test-webhook.cjs`.
- **Agrégateur** : interface `PaymentProvider` (`src/lib/payments/provider.ts`) ; impl. mock pour l'instant
  (pas de compte marchand). Brancher CinetPay/FedaPay/Hub2 plus tard = nouvelle impl + schéma de signature réel.
  Secret webhook : `PAYMENT_WEBHOOK_SECRET` (fallback dev si absent).
- **Refonte design (taste-skill « soft »)** : `/` = landing éditoriale, catalogue sur `/marche` ; palette
  crème/sauge/espresso (OKLCH), titres **Fraunces**, boutons `rounded-full`, easing `--ease-soft`. Réf. 21st.dev.
- **Images** : `images.unoptimized: true` (l'optimizer Next 16 rejette les chemins locaux `/uploads/**`).
  Tableau de bord **par rôle** (`/tableau-de-bord`). Prix affiché **par unité** (kg/sac/tonne), pas au kilo partout.
- **Seed** : `node scripts/seed-demo.cjs` → 3 vendeurs + 25 annonces, **vraies photos** Wikimedia Commons
  (recherche filtrée + surcharges `Special:FilePath`). `--dry-run` / `--clean`.
  **Piège** : `next start` indexe `public/` au boot → **redémarrer après un seed** ; vérifier en **prod** (worker dev capricieux).
- **Rappels** : auth scrypt + sessions SHA-256 ; autorisation serveur (pas de RLS) ; SQLite+Drizzle **synchrone** ;
  `server-only` aliasé en test ; `middleware.ts` déprécié Next 16 (à renommer `proxy` plus tard) ;
  crash worker Turbopack possible en *dev* sur routes DB → vérifier en **prod**.
