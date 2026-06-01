# Blueprint paiement & séquestre

## Principe
L'argent de l'acheteur est collecté par la plateforme, GARDÉ (séquestré), puis reversé
à l'agriculteur seulement après confirmation de réception. La plateforme prélève sa
commission au moment de la libération.

## Choix de l'agrégateur
Il faut un agrégateur qui couvre le Togo et qui propose À LA FOIS :
- PayIn (encaisser depuis Flooz/Moov Money, Mixx by Yas/ex-TMoney, carte)
- PayOut / déboursement (reverser vers le mobile money de l'agriculteur)

Candidats à comparer (À VÉRIFIER au moment du dev : couverture exacte, frais, conditions
KYC pour ouvrir un compte marchand, et surtout que la fonction PayOut est bien dispo) :
- CinetPay
- FedaPay
- Hub2
Ne code RIEN contre l'API tant que tu n'as pas lu sa doc officielle à jour et testé en
environnement sandbox. N'invente aucun nom de endpoint ou de paramètre.

## Machine à états du paiement (statut_sequestre)
en_attente → collecté → séquestré → libéré
                              ↘ remboursé (litige tranché en faveur de l'acheteur)

- collecté : PayIn confirmé par webhook de l'agrégateur.
- séquestré : fonds confirmés, commande en cours de préparation/livraison.
- libéré : acheteur a confirmé réception → PayOut vers l'agriculteur (montant - commission).
- remboursé : litige résolu côté acheteur → remboursement.

## Règles de sécurité du séquestre
1. Le passage à "collecté" se fait UNIQUEMENT via le webhook signé de l'agrégateur,
   jamais via une requête front. Vérifie la signature du webhook.
2. "libéré" et "remboursé" déclenchent un PayOut réel : action serveur uniquement,
   déclenchée par l'acheteur (confirmation) ou l'admin (litige).
3. Vérifie côté serveur que le montant reçu = montant attendu de la commande.
4. Idempotence : un même webhook reçu deux fois ne doit pas payer deux fois
   (clé d'idempotence = ref_agregateur, contrainte UNIQUE en base).
5. Journalise chaque transition d'état (qui, quand, montant) dans une table d'audit
   (`payment_audit`). Les transitions et la table de paiement vivent dans SQLite.
