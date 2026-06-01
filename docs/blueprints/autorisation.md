# Blueprint autorisation (remplace la RLS Supabase)

SQLite n'a pas de Row-Level Security. L'isolation des données — qui empêchait un
utilisateur de lire/modifier les données d'un autre — doit donc être garantie
ENTIÈREMENT par le code serveur. C'est le risque de sécurité n°1 de ce projet.

## 1. Authentification (sessions applicatives)
- Mots de passe hachés avec un algorithme lent (bcrypt ou argon2), JAMAIS en clair.
- À la connexion, créer une ligne dans `session` (id aléatoire long, user_id, expire_le).
- Déposer l'id de session dans un cookie `httpOnly`, `secure`, `sameSite=lax`.
- À chaque requête serveur, résoudre la session → l'utilisateur courant. Une session
  expirée ou inconnue = non authentifié.
- Le rôle (agriculteur/acheteur/admin) vient TOUJOURS de la base via la session,
  jamais d'un champ envoyé par le client.

## 2. Couche d'accès aux données
- AUCUNE requête SQL n'est exécutée directement depuis un composant client.
- Toute lecture/écriture passe par une fonction serveur (server action ou route handler)
  qui commence par : (a) résoudre l'utilisateur courant, (b) vérifier son rôle,
  (c) vérifier qu'il est propriétaire de la ressource visée.
- Centraliser ces gardes dans des helpers réutilisables, ex. :
  - `requireUser()` → renvoie l'utilisateur ou rejette (401)
  - `requireRole(role)` → vérifie le rôle ou rejette (403)
  - `assertOwnership(resource, userId)` → vérifie la propriété ou rejette (403)

## 3. Règles par ressource
- listing : un agriculteur ne peut créer/éditer/supprimer QUE ses propres annonces
  (`listing.agriculteur_id === user.id`). Lecture publique des annonces `active`.
- order : visible uniquement par l'acheteur (`acheteur_id`), l'agriculteur concerné
  (`agriculteur_id`) ou un admin.
- payment / statut_sequestre : JAMAIS modifiable par un client. Seules les sources
  serveur autorisées le changent (webhook paiement signé, action admin, confirmation
  de réception par l'acheteur). Voir docs/blueprints/paiement.md.
- message : accessible uniquement aux deux participants de la conversation + admin.
- review : un utilisateur ne peut noter qu'après une commande réelle livrée à laquelle
  il a participé ; une note par commande et par sens.
- admin : accès complet, mais réservé au rôle `admin`. Toute action admin sensible
  (libérer/rembourser un séquestre) est journalisée.

## 4. Validation des entrées
- Valider et normaliser CÔTÉ SERVEUR toutes les entrées (zod ou équivalent) :
  quantités > 0, prix/montants ≥ 0 et cohérents, énumérations dans les valeurs permises.
- Ne jamais faire confiance à un total, un prix ou un montant calculé par le client :
  recalculer côté serveur à partir des données de référence.

## 5. À faire pour CHAQUE nouvelle fonctionnalité
Avant de marquer une feature terminée, se poser :
1. Qui a le droit de lire ces données ? La garde est-elle en place ?
2. Qui a le droit de les écrire ? La propriété est-elle vérifiée ?
3. Les entrées sont-elles validées côté serveur ?
4. Existe-t-il un test qui prouve qu'un utilisateur NON autorisé est bien rejeté ?
