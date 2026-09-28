# Digi-Farm

Marketplace agricole qui relie directement les **agriculteurs du Togo** aux
**acheteurs** — grossistes, restaurants, particuliers. Paiement par mobile money,
et surtout : **l'argent est séquestré jusqu'à la réception de la marchandise**.

Pensé pour des utilisateurs sur téléphone, souvent sur connexion lente, parfois
peu à l'aise avec le numérique. Interface en français.

---

## Le cœur du produit : le séquestre

C'est le problème que Digi-Farm résout. Dans une vente à distance entre un
agriculteur et un acheteur qui ne se connaissent pas, quelqu'un doit prendre le
risque de payer ou d'expédier en premier. Ici, personne ne le prend :

```
L'acheteur paie  →  l'argent est COLLECTÉ mais pas versé
                 →  le vendeur prépare, puis expédie
                 →  l'acheteur confirme la réception
                 →  alors seulement le vendeur est payé (net de 5 % de commission)
```

Un **litige** ouvert par l'une des deux parties bloque la libération des fonds
jusqu'à l'arbitrage d'un administrateur.

Cette machine à états est isolée dans du code pur et testé
([`sequestre.py`](digifarm/commandes/sequestre.py),
[`liberation.py`](digifarm/commandes/liberation.py)), et **aucune vue ne modifie
l'état de l'argent directement** : tout passe par
[`services.py`](digifarm/commandes/services.py), qui vérifie la transition et
écrit dans une piste d'audit inaltérable. L'administration Django affiche même
les paiements en lecture seule, pour qu'un clic ne puisse pas contourner ces
garanties.

## Stack

- **Django 5.2 LTS** / Python 3.13 — auth, sessions, ORM, migrations, admin natifs
- **Tailwind CSS 4** compilé par `@tailwindcss/cli`
- **HTMX** pour le peu d'interactivité nécessaire — pas de framework JS, pas de build côté client
- **SQLite** (WAL, contraintes de clés étrangères actives)
- **Pillow** — compression des photos en WebP à l'upload
- **pytest + pytest-django** — 113 tests

Le rendu est entièrement serveur et l'interface n'embarque qu'un seul fichier
JavaScript de 14 Ko : c'est un choix, pas un manque. Sur une connexion lente,
une page qui s'affiche tout de suite vaut mieux qu'une application qui s'hydrate.

## Démarrer

```bash
# dépendances
python -m pip install -r digifarm/requirements.txt
pnpm install                 # uniquement la chaîne Tailwind (aucun JS applicatif)

# feuille de style (le CSS compilé n'est pas versionné)
pnpm css:build

# base et jeu de démonstration
cd digifarm
python manage.py migrate
python manage.py seed_demo   # comptes, 26 annonces, commandes dans chaque état

python manage.py runserver
```

`seed_demo` affiche les comptes de test créés et leur mot de passe. Il y a des
vendeurs, des acheteurs, et une commande dans chaque état du parcours pour que
les tableaux de bord aient quelque chose à montrer.

Documentation détaillée : **[`digifarm/README.md`](digifarm/README.md)**.
Décisions d'architecture : [`docs/blueprints/`](docs/blueprints/).

## Organisation

```
digifarm/
├─ core/        constantes métier, autorisation, formatage, icônes, seed
├─ comptes/     authentification, profil, tableaux de bord
├─ annonces/    marché public, fiche produit, gestion vendeur, photos
├─ commandes/   tunnel d'achat, paiement, séquestre, suivi, litige
└─ templates/
```

### Autorisation : tout se joue côté serveur

SQLite n'a pas de *row level security*. Rien, dans la base, n'empêche une requête
de lire les données d'autrui — l'isolation est donc entièrement applicative, et
centralisée dans [`core/autorisation.py`](digifarm/core/autorisation.py). Chaque
vue qui touche des données vérifie, dans cet ordre : **session valide**, **rôle**,
**propriété de la ressource**. Le rôle est toujours lu en base, jamais dans une
donnée envoyée par le client.

Une ressource qui n'appartient pas à l'utilisateur répond **404**, pas 403 : il
n'a pas à apprendre qu'elle existe.

## État du projet

Fonctionnel de bout en bout : inscription, publication d'annonces avec photos,
marché filtrable, commande, paiement, suivi, confirmation de réception,
libération des fonds, litige.

Deux limites à connaître :

- **L'agrégateur de paiement est simulé.** Il n'y a pas encore de compte marchand,
  donc aucun argent ne circule réellement. L'interface à implémenter pour brancher
  un vrai agrégateur (CinetPay, FedaPay, Hub2) est documentée dans
  [`digifarm/commandes/agregateur.py`](digifarm/commandes/agregateur.py).
- **Reste à faire** : arbitrage des litiges par l'administrateur, avis et notes
  des vendeurs, déploiement.

Une première version avait été écrite en Next.js. Elle a été entièrement
réécrite en Django et retirée du dépôt une fois la parité atteinte ; son
histoire reste consultable dans les commits.

## Tests

```bash
cd digifarm
python -m pytest
```

Les tests qui comptent le plus, dans l'ordre : l'isolation des données
(`comptes/tests/test_autorisation.py`), le parcours complet du paiement
(`commandes/tests/test_flux.py`), et la machine à états du séquestre
(`commandes/tests/test_sequestre.py`) — celui qui garantit qu'aucun chemin de
code ne peut faire sortir l'argent autrement que par les transitions prévues.
