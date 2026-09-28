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
Le code Next a été **entièrement supprimé le 28/09/2026**, parité atteinte.
Le code vit dans **`digifarm/`** — voir `digifarm/README.md`. À la racine il ne reste que
`package.json` (chaîne Tailwind + extraction des icônes), `docs/`, `SPEC.md` et les READMEs.
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
- **28/09/2026 — dépôt GitHub PUBLIC et suppression complète de Next** :
  https://github.com/fortune344/Digi-Farm, branche `django` par défaut (`master` reste local).
  Parité vérifiée (les 13 pages Next ont toutes leur équivalent Django, plus onze pages en plus),
  donc `src/`, `drizzle/`, `public/`, les configs TS/Biome/Vitest et les scripts `.cjs` sont
  **supprimés**. `package.json` réduit à la chaîne Tailwind + `pnpm icones`. Les 26 photos du
  catalogue sont **versionnées** dans `core/fixtures/photos/` (1,8 Mo, noms lisibles) : un clone
  neuf affiche un catalogue illustré sans réseau. Avant de pousser : vérifier l'historique entier,
  pas seulement l'état courant (aucun `.env`, aucune base, aucun jeton n'a jamais été commité).
- **28/09/2026 — accueil repensée + mobilier de site** : motif « marketplace » (héros de
  **recherche** > catégories illustrées > arrivages > confiance > appel aux vendeurs).
  Nouvelles pages : à propos, contact (messages **en base** + admin, pot de miel anti-robot),
  FAQ (accordéon `<details>`, ancres), conditions, confidentialité, 404, 500. En-tête avec menu
  mobile et pied de page à quatre colonnes — tout en `<details>`, **zéro JavaScript**.
  **Pas de faux témoignages** : rien n'est inventé, les chiffres viennent de la base.
  Images recompressées aux tailles réellement affichées (539 Ko pour tout le site).
  Pages légales = **brouillons** portant un avertissement visible, à faire relire par un juriste.
- **27/09/2026 — passage à Django** : **auth Django native + `Profil`** (rôle en base, jamais
  côté client) ; **HTMX** pour le peu d'interactivité (pas d'Alpine, pas de build JS) ;
  re-seed à neuf (`seed_demo`) plutôt que migration de l'ancienne base.
  Palette OKLCH et Fraunces conservées ; corps de texte en pile système (économie de données).
  **Classes de composants CSS** (`.bouton primaire`, `.carte`, `.badge succes`, `.champ`) définies
  dans `static/src/input.css` : gabarits lisibles, pas de soupe d'utilitaires.
  **Admin Django** = base de la Phase 8 (litiges), paiements et journal en **lecture seule**.
  **Tableau de bord vendeur** : tuiles bento (à traiter / sous séquestre / encaissé), file d'action
  avec le bouton de progression *dans* la ligne, inventaire avec alertes de stock.
- **Agrégateur de paiement** : toujours **SIMULÉ** (`commandes/agregateur.py`, `AgregateurSimule`),
  faute de compte marchand. Brancher CinetPay/FedaPay/Hub2 = une classe respectant le protocole
  `Agregateur` + le vrai schéma de signature dans `signer()`/`signature_valide()`.
  Secret : `PAYMENT_WEBHOOK_SECRET` (repli de développement si absent).
- **Pièges rencontrés, à ne pas réapprendre** :
  `{# … #}` ne tient que sur **UNE ligne** en Django — un commentaire multi-ligne s'affiche dans
  la page ; `core/tests/test_gabarits.py` le verrouille désormais.
  Django met les gabarits **en cache même en DEBUG** : sans l'auto-rechargement (`--noreload`),
  une correction de gabarit n'apparaît pas. `pkill` depuis Git Bash ne tue pas un processus
  Windows — passer par PowerShell (`Get-NetTCPConnection` + `Stop-Process`).
  Deux serveurs peuvent écouter le même port sur Windows et brouiller les vérifications.

## Reste à faire
- Arbitrage des litiges par l'administrateur (ex-Phase 8)
- Avis et notes des vendeurs (jamais implémentés, `note_moyenne` est un champ en attente)
- Réinitialisation de mot de passe par e-mail (la FAQ dit aujourd'hui de nous contacter)
- Brancher un vrai agrégateur de paiement
- Déploiement (VPS + nginx ; penser à `collectstatic` et à servir `media/`)
