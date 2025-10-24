# Runbook - Gestion des Tenants

## Vue d'ensemble

Ce runbook décrit les procédures opérationnelles pour la gestion des tenants dans l'environnement de production.

## Procédures de Routine

### 1. Création d'un Nouveau Tenant

#### Prérequis
- Accès administrateur à la console Firebase
- Accès au dashboard Stripe
- Informations client validées

#### Étapes

1. **Validation des informations client**
   ```bash
   # Vérifier que l'email n'existe pas déjà
   firebase firestore:query users --where email==client@example.com
   ```

2. **Création du tenant via API**
   ```bash
   curl -X POST https://api.attendance-x.com/admin/tenants \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Nom de l'Organisation",
       "email": "admin@client.com",
       "plan": "basic",
       "billingCycle": "monthly"
     }'
   ```

3. **Vérification de la création**
   ```bash
   # Vérifier dans Firestore
   firebase firestore:get tenants/$TENANT_ID
   
   # Vérifier dans Stripe
   stripe customers list --email admin@client.com
   ```

4. **Configuration initiale**
   - Envoyer l'email de bienvenue
   - Configurer les paramètres par défaut
   - Créer les données de démonstration si demandées

#### Points de Contrôle
- [ ] Tenant créé dans Firestore
- [ ] Client créé dans Stripe
- [ ] Email de bienvenue envoyé
- [ ] Accès administrateur configuré
- [ ] Données de démonstration créées (si applicable)

### 2. Suspension d'un Tenant

#### Cas d'Usage
- Paiement en retard
- Violation des conditions d'utilisation
- Demande de suspension temporaire

#### Étapes

1. **Vérification du statut actuel**
   ```bash
   # Obtenir les informations du tenant
   curl -X GET https://api.attendance-x.com/admin/tenants/$TENANT_ID \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Suspension du tenant**
   ```bash
   curl -X PATCH https://api.attendance-x.com/admin/tenants/$TENANT_ID \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "status": "suspended",
       "suspensionReason": "Payment overdue",
       "suspendedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
     }'
   ```

3. **Notification du client**
   ```bash
   # Envoyer notification de suspension
   curl -X POST https://api.attendance-x.com/admin/notifications/send \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{
       "tenantId": "'$TENANT_ID'",
       "type": "suspension_notice",
       "template": "account_suspended"
     }'
   ```

4. **Vérification de la suspension**
   - Tenter de se connecter au tenant (doit échouer)
   - Vérifier que les APIs retournent 403
   - Confirmer que les jobs automatiques sont suspendus

#### Points de Contrôle
- [ ] Statut mis à jour dans la base de données
- [ ] Accès bloqué pour tous les utilisateurs
- [ ] Notification envoyée au client
- [ ] Jobs automatiques suspendus
- [ ] Logs d'audit créés

### 3. Réactivation d'un Tenant

#### Prérequis
- Résolution du problème ayant causé la suspension
- Validation du paiement (si applicable)

#### Étapes

1. **Vérification des prérequis**
   ```bash
   # Vérifier le statut des paiements
   stripe invoices list --customer $STRIPE_CUSTOMER_ID --status paid
   ```

2. **Réactivation du tenant**
   ```bash
   curl -X PATCH https://api.attendance-x.com/admin/tenants/$TENANT_ID \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "status": "active",
       "reactivatedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
       "reactivationReason": "Payment received"
     }'
   ```

3. **Tests de fonctionnement**
   ```bash
   # Tester l'accès API
   curl -X GET https://api.attendance-x.com/health \
     -H "X-Tenant-ID: $TENANT_ID"
   
   # Tester la connexion utilisateur
   # (via interface web ou API)
   ```

4. **Notification de réactivation**
   ```bash
   curl -X POST https://api.attendance-x.com/admin/notifications/send \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{
       "tenantId": "'$TENANT_ID'",
       "type": "reactivation_notice",
       "template": "account_reactivated"
     }'
   ```

## Procédures d'Urgence

### 1. Fuite de Données Entre Tenants

#### Détection
- Alerte de monitoring
- Rapport utilisateur
- Audit de sécurité

#### Actions Immédiates

1. **Isolation du problème**
   ```bash
   # Suspendre temporairement les tenants affectés
   for tenant in $AFFECTED_TENANTS; do
     curl -X PATCH https://api.attendance-x.com/admin/tenants/$tenant \
       -H "Authorization: Bearer $ADMIN_TOKEN" \
       -d '{"status": "maintenance"}'
   done
   ```

2. **Investigation**
   ```bash
   # Analyser les logs d'accès
   gcloud logging read "resource.type=cloud_function AND 
     jsonPayload.tenantId=$TENANT_ID AND 
     timestamp>='$(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%SZ)'"
   
   # Vérifier les requêtes suspectes
   grep -E "tenantId.*!=.*$TENANT_ID" /var/log/api/*.log
   ```

3. **Correction**
   - Identifier la cause racine
   - Appliquer le correctif
   - Tester la correction

4. **Communication**
   - Notifier les tenants affectés
   - Informer l'équipe de sécurité
   - Documenter l'incident

### 2. Problème de Performance Généralisé

#### Symptômes
- Temps de réponse élevés
- Timeouts fréquents
- Erreurs 503/504

#### Actions

1. **Diagnostic rapide**
   ```bash
   # Vérifier l'état des services
   kubectl get pods -n production
   
   # Vérifier les métriques de base
   curl -X GET https://monitoring.attendance-x.com/api/v1/query?query=up
   ```

2. **Identification des tenants problématiques**
   ```bash
   # Analyser l'usage par tenant
   curl -X GET https://api.attendance-x.com/admin/metrics/usage \
     -H "Authorization: Bearer $ADMIN_TOKEN" | \
     jq '.tenants[] | select(.apiCalls > 10000)'
   ```

3. **Mesures d'atténuation**
   ```bash
   # Activer le rate limiting agressif
   kubectl patch configmap rate-limits -p '{"data":{"global":"100"}}'
   
   # Rediriger le trafic si nécessaire
   kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"v2"}}}'
   ```

### 3. Panne de Base de Données

#### Actions Immédiates

1. **Basculement vers la réplication**
   ```bash
   # Vérifier l'état de la réplication
   gcloud firestore operations list
   
   # Basculer si nécessaire
   gcloud firestore databases update --region=europe-west1
   ```

2. **Mode dégradé**
   ```bash
   # Activer le mode lecture seule
   kubectl set env deployment/api-server READ_ONLY_MODE=true
   ```

3. **Communication**
   - Activer la page de statut
   - Notifier les utilisateurs
   - Informer l'équipe technique

## Maintenance Préventive

### 1. Nettoyage Mensuel

#### Données Obsolètes
```bash
# Supprimer les sessions expirées
firebase firestore:delete --recursive sessions \
  --where "expiresAt < $(date -d '30 days ago' +%s)"

# Nettoyer les logs anciens
gcloud logging sinks update old-logs-sink \
  --log-filter="timestamp < '$(date -d '90 days ago' -u +%Y-%m-%dT%H:%M:%SZ)'"
```

#### Optimisation des Index
```bash
# Analyser l'utilisation des index
gcloud firestore indexes list --format="table(name,state,fields[].fieldPath)"

# Supprimer les index inutilisés
gcloud firestore indexes delete $UNUSED_INDEX_ID
```

### 2. Audit de Sécurité Hebdomadaire

```bash
# Vérifier les accès suspects
gcloud logging read "protoPayload.authenticationInfo.principalEmail !~ '@attendance-x.com$' AND 
  protoPayload.methodName ~ 'admin'" --limit=100

# Contrôler les permissions
firebase auth:export users.json
jq '.users[] | select(.customClaims.role == "admin")' users.json

# Vérifier l'isolation des tenants
npm run test:tenant-isolation:production
```

### 3. Sauvegarde et Récupération

#### Sauvegarde Quotidienne
```bash
# Exporter les données Firestore
gcloud firestore export gs://attendance-x-backups/$(date +%Y%m%d)

# Sauvegarder les configurations
kubectl get configmaps -o yaml > configs-$(date +%Y%m%d).yaml
kubectl get secrets -o yaml > secrets-$(date +%Y%m%d).yaml
```

#### Test de Récupération Mensuel
```bash
# Restaurer dans l'environnement de test
gcloud firestore import gs://attendance-x-backups/20240101 \
  --database=test-recovery

# Valider l'intégrité des données
npm run test:data-integrity:recovery
```

## Monitoring et Alertes

### Métriques Critiques

1. **Disponibilité par Tenant**
   - Seuil d'alerte : < 99.9%
   - Action : Investigation immédiate

2. **Temps de Réponse API**
   - Seuil d'alerte : > 2 secondes (P95)
   - Action : Analyse des performances

3. **Erreurs d'Isolation**
   - Seuil d'alerte : > 0
   - Action : Procédure d'urgence sécurité

4. **Usage Anormal**
   - Seuil d'alerte : > 10x la moyenne
   - Action : Investigation et limitation

### Dashboards de Monitoring

1. **Vue d'ensemble Plateforme**
   - Nombre de tenants actifs
   - Revenus totaux
   - Taux d'erreur global
   - Performance générale

2. **Vue par Tenant**
   - Usage des ressources
   - Performance spécifique
   - Statut de facturation
   - Alertes actives

## Contacts d'Escalade

### Équipe Technique
- **Astreinte 24/7** : +33 1 XX XX XX XX
- **Email** : ops@attendance-x.com
- **Slack** : #ops-emergency

### Équipe Sécurité
- **Email** : security@attendance-x.com
- **Téléphone** : +33 1 XX XX XX XX

### Management
- **CTO** : cto@attendance-x.com
- **CEO** : ceo@attendance-x.com

## Historique des Modifications

| Date | Version | Modifications | Auteur |
|------|---------|---------------|--------|
| 2024-01-15 | 1.0 | Création initiale | Équipe Ops |
| 2024-02-01 | 1.1 | Ajout procédures d'urgence | Équipe Sécurité |
| 2024-03-01 | 1.2 | Mise à jour monitoring | Équipe Technique |