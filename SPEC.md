# Digi-Farm — Spécification

## 1. Vue d'ensemble
Marketplace agricole togolaise. Les agriculteurs publient leurs produits (maïs, tomates,
ignames, soja…), les acheteurs cherchent, commandent et paient en ligne. La plateforme
sécurise le paiement (séquestre) et organise la livraison ou le retrait.

## 2. Rôles & permissions
| Rôle | Permissions principales |
|------|--------------------------|
| Agriculteur | Créer/éditer ses annonces, voir et gérer ses commandes reçues, discuter, voir ses paiements |
| Acheteur | Chercher/filtrer, commander, payer, suivre la livraison, noter, discuter |
| Admin | Modérer annonces et comptes, gérer les litiges, débloquer/rembourser un séquestre, voir les revenus |

## 3. Entités métier
- profile : id, role, nom, téléphone, région, vérifié (oui/non), note_moyenne
- listing (annonce) : id, agriculteur_id, titre, catégorie, description, photos[],
  prix, unité (kg/sac/tonne), quantité_dispo, région, statut (active/épuisée/suspendue)
- order (commande) : id, acheteur_id, agriculteur_id, statut, total, mode_livraison
  (retrait/transporteur), adresse_livraison, créé_le
- order_item : id, order_id, listing_id, quantité, prix_unitaire
- payment : id, order_id, montant, frais_commission, statut_sequestre
  (en_attente/collecté/séquestré/libéré/remboursé), ref_agregateur, méthode
- shipment (livraison) : id, order_id, transporteur, statut, preuve_livraison
- message : id, order_id (ou conversation_id), expéditeur_id, contenu, créé_le
- review (avis) : id, order_id, auteur_id, cible_id, note (1-5), commentaire
- category, region : tables de référence
- session : id, user_id, expire_le (auth applicative ; voir blueprint autorisation)

## 4. Cas d'usage critiques
1. Agriculteur s'inscrit → publie une annonce avec photos → l'annonce apparaît en recherche.
2. Acheteur cherche « tomates région Maritime » → filtre par prix → ouvre une annonce.
3. Acheteur commande → paie → l'argent est SÉQUESTRÉ (ni l'acheteur ni le vendeur n'y touchent).
4. Agriculteur voit la commande payée → prépare → expédie/remet → marque comme expédiée.
5. Acheteur reçoit → confirme la réception → le paiement est libéré vers l'agriculteur,
   moins la commission plateforme.
6. En cas de problème → ouverture d'un litige → l'admin tranche (libère ou rembourse).
7. Après transaction → acheteur et vendeur se notent mutuellement.

## 5. Intégrations externes
- Agrégateur de paiement (PayIn + PayOut) — voir docs/blueprints/paiement.md
- Stockage des photos : système de fichiers local (pas de service externe pour l'instant)
- (Plus tard) SMS / WhatsApp pour notifications

## 6. Contraintes de sécurité
- **Pas de RLS** (SQLite) : l'isolation des données est garantie CÔTÉ SERVEUR.
  Un agriculteur ne voit que ses annonces/commandes ; un acheteur que les siennes ;
  l'admin tout. Voir docs/blueprints/autorisation.md.
- Le statut du séquestre n'est modifiable que par le serveur (webhook paiement / action admin),
  jamais directement par le client.
- Validation serveur de toutes les entrées (quantités, prix, montants).

## 7. Non-objectifs (pour le MVP)
- Pas d'app mobile native (web responsive d'abord).
- Pas de logistique propre : on s'appuie sur retrait sur place + transporteurs partenaires.
- Pas de multi-langue au départ (français uniquement).
- Pas de crédit/financement agricole.
