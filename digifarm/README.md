# Digi-Farm — version Django

Réécriture de l'application en **Django 5.2 LTS + Tailwind 4 + HTMX**, en
remplacement de la version Next.js (conservée à la racine du dépôt comme
référence le temps d'atteindre la parité, puis supprimée).

## Démarrer

```bash
# 1. dépendances Python
python -m pip install -r digifarm/requirements.txt

# 2. feuille de style (depuis la racine du dépôt)
pnpm css:build          # ou pnpm css:watch pendant le développement

# 3. base de données et jeu de démonstration
cd digifarm
python manage.py migrate
python manage.py seed_demo

# 4. serveur
python manage.py runserver
```

Le CSS compilé (`static/css/site.css`) n'est pas versionné : lancer
`pnpm css:build` après un clone, et `pnpm css:watch` pendant qu'on touche aux
gabarits, sinon les nouvelles classes Tailwind n'existent pas dans le fichier.

### Comptes de démonstration

`seed_demo` affiche la liste des comptes créés et leur mot de passe commun
(`digifarm2026` par défaut, modifiable avec `--mot-de-passe`). Il y a des
vendeurs, des acheteurs, 26 annonces avec photos, et une commande dans chaque
état du parcours pour que les tableaux de bord aient quelque chose à montrer.

```bash
python manage.py seed_demo --clean            # repart de zéro
python manage.py seed_demo --sans-commande    # annonces seulement
python manage.py createsuperuser              # accès à /admin/
```

## Organisation

```
digifarm/
├─ config/           réglages, routage racine
├─ core/             socle partagé : constantes métier, formatage, autorisation,
│                    icônes SVG, filtres de gabarit, commande de seed
├─ comptes/          authentification, profil, tableaux de bord
├─ annonces/         marché public, fiche produit, gestion vendeur, photos
├─ commandes/        tunnel d'achat, paiement, séquestre, suivi, litige
├─ templates/        gabarits (partagés dans partiels/)
└─ static/src/       source Tailwind
```

### Où se trouve quoi

| Besoin | Fichier |
|---|---|
| Ajouter une région, une catégorie, une unité | `core/metier.py` |
| Comprendre qui a le droit de quoi | `core/autorisation.py` |
| Règles d'argent (total, commission, net) | `commandes/tarifs.py` |
| États de la commande | `commandes/statuts.py` |
| États du séquestre | `commandes/sequestre.py` |
| Conditions de libération des fonds | `commandes/liberation.py` |
| Toute écriture en base liée aux commandes | `commandes/services.py` |
| Brancher un vrai agrégateur de paiement | `commandes/agregateur.py` |
| Couleurs, polices, composants CSS | `static/src/input.css` |

## Les trois règles à ne pas casser

1. **L'autorisation est côté serveur, toujours.** SQLite n'a pas de RLS. Chaque
   vue qui touche des données vérifie : session (`@login_required`), rôle
   (`@role_requis`), puis propriété (`objet_possede_par`). Voir
   `docs/blueprints/autorisation.md`.

2. **Le rôle vient de la base, jamais du client.** Il est lu sur
   `comptes.Profil`, pas dans un champ de formulaire ni un paramètre d'URL.

3. **L'argent ne bouge que par les services.** Aucune vue ne modifie
   `statut_sequestre` directement : elle appelle `commandes.services`, qui
   vérifie la transition et écrit dans le journal d'audit. Les fonds ne sont
   versés au vendeur **qu'après confirmation de réception par l'acheteur**, et
   un litige bloque cette libération. Voir `docs/blueprints/paiement.md`.

C'est aussi pour cela que l'administration Django affiche les paiements et le
journal en **lecture seule** : modifier un statut à la main contournerait la
machine à états et la piste d'audit.

## Tests

```bash
cd digifarm
python -m pytest              # tout
python -m pytest commandes    # une app
python -m pytest -k sequestre # par mot-clé
```

Les tests de logique pure (`tarifs`, `statuts`, `sequestre`, `liberation`) ne
touchent pas la base et tournent en une fraction de seconde. Les tests
d'autorisation (`comptes/tests/test_autorisation.py`) et le test d'intégration
du parcours de paiement (`commandes/tests/test_flux.py`) sont ceux qu'il faut
garder verts en priorité : ils protègent l'isolation des données et l'argent.

## Paiement

L'agrégateur est **simulé** (`commandes/agregateur.py`,
`AgregateurSimule`) : il n'y a pas encore de compte marchand. La page
`/paiement/simule/<ref>/` remplace le site de Flooz / Mixx / la banque.

Pour brancher un vrai agrégateur (CinetPay, FedaPay, Hub2) :

1. lire sa documentation officielle — **ne rien inventer** comme point d'entrée
   ou nom de champ ;
2. écrire une classe qui respecte le protocole `Agregateur` ;
3. remplacer le schéma de signature dans `signer()` / `signature_valide()` par
   le sien (chaque agrégateur a le sien) ;
4. la retourner depuis `agregateur_courant()`.

Le reste du code n'a pas à changer : il ne connaît que cette fonction.

## Notes d'environnement

- Windows : le `fetch` de pnpm peut timeouter en IPv6. Préfixer les installs de
  `NODE_OPTIONS="--dns-result-order=ipv4first"` si une dépendance refuse de se
  télécharger.
- Les photos d'annonces vont dans `<dépôt>/media/` (hors du dossier `digifarm/`),
  servies par Django en développement. En production, c'est au serveur web
  (nginx) de les servir.
- Les icônes viennent de lucide : `pnpm icones` régénère `core/icones.py` après
  avoir ajouté un nom dans `scripts/extraire-icones.mjs`.
