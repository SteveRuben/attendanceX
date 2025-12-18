# Plan de Sauvegarde et Reprise après Sinistre (Backup & Disaster Recovery)

## Vue d'ensemble

Ce document définit la stratégie de sauvegarde et de reprise après sinistre pour AttendanceX, garantissant la continuité des opérations et la protection des données.

## Objectifs de Récupération

### RPO (Recovery Point Objective)
**Perte de données maximale acceptable**

| Type de données | RPO | Fréquence de backup |
|-----------------|-----|---------------------|
| Données critiques (présences, utilisateurs) | 1 heure | Continu + snapshots horaires |
| Données importantes (événements, organisations) | 4 heures | Snapshots toutes les 4h |
| Données secondaires (logs, analytics) | 24 heures | Backup quotidien |
| Configuration système | 24 heures | Backup quotidien |

### RTO (Recovery Time Objective)
**Temps de récupération maximal acceptable**

| Scénario | RTO | Priorité |
|----------|-----|----------|
| Panne base de données | 1 heure | P0 |
| Panne serveur application | 2 heures | P0 |
| Corruption de données | 4 heures | P1 |
| Désastre complet (datacenter) | 24 heures | P1 |
| Perte de région GCP | 48 heures | P2 |

## Architecture de Sauvegarde

### Firestore (Base de données principale)

#### Backup Automatique
```yaml
# Configuration Firebase
backup:
  enabled: true
  schedule: "0 */4 * * *"  # Toutes les 4 heures
  retention: 30  # 30 jours
  location: "europe-west1"
```

#### Export Quotidien
```bash
#!/bin/bash
# scripts/backup-firestore.sh

PROJECT_ID="attendance-management-system"
BUCKET="gs://attendancex-backups"
DATE=$(date +%Y%m%d)

# Export complet de Firestore
gcloud firestore export ${BUCKET}/firestore/${DATE} \
  --project=${PROJECT_ID} \
  --async

# Vérifier le succès
if [ $? -eq 0 ]; then
  echo "✅ Firestore backup initiated: ${DATE}"
else
  echo "❌ Firestore backup failed"
  # Envoyer alerte
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -d '{"text":"🚨 Firestore backup failed!"}'
fi
```

### Cloud Storage (Fichiers)

#### Versioning
```bash
# Activer le versioning
gsutil versioning set on gs://attendancex-uploads
gsutil versioning set on gs://attendancex-backups

# Lifecycle policy
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://attendancex-uploads
```

### Secrets et Configuration

#### Google Secret Manager
```bash
# Backup des secrets
gcloud secrets list --format="value(name)" | while read secret; do
  gcloud secrets versions access latest --secret="$secret" > "backups/secrets/${secret}.txt"
done

# Chiffrer le backup
tar -czf secrets-backup.tar.gz backups/secrets/
gpg --encrypt --recipient security@attendancex.com secrets-backup.tar.gz
```

## Stratégie 3-2-1

### 3 Copies des données
1. **Production** : Firestore en temps réel
2. **Backup primaire** : Exports Firestore (même région)
3. **Backup secondaire** : Réplication cross-region

### 2 Types de média différents
1. **Cloud Storage** : Exports Firestore
2. **Cold Storage** : Archive Nearline/Coldline

### 1 Copie hors site
- **Région secondaire** : europe-west3 (Frankfurt)
- **Réplication automatique** : Tous les backups

## Procédures de Sauvegarde

### Backup Quotidien Automatisé

```yaml
# .github/workflows/daily-backup.yml
name: Daily Backup

on:
  schedule:
    - cron: '0 2 * * *'  # 2h du matin
  workflow_dispatch:

jobs:
  backup-firestore:
    runs-on: ubuntu-latest
    steps:
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Export Firestore
        run: |
          gcloud firestore export gs://attendancex-backups/firestore/$(date +%Y%m%d) \
            --project=attendance-management-system
      
      - name: Verify Backup
        run: |
          gsutil ls gs://attendancex-backups/firestore/$(date +%Y%m%d)
      
      - name: Notify Success
        if: success()
        run: echo "✅ Backup completed successfully"
      
      - name: Notify Failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Daily backup failed',
              body: 'Automated backup failed. Immediate action required.',
              labels: ['critical', 'backup']
            })
```

### Backup Hebdomadaire Complet

```bash
#!/bin/bash
# scripts/weekly-full-backup.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="gs://attendancex-backups/weekly/${DATE}"

echo "🔄 Starting weekly full backup..."

# 1. Firestore
gcloud firestore export ${BACKUP_DIR}/firestore

# 2. Cloud Storage
gsutil -m rsync -r gs://attendancex-uploads ${BACKUP_DIR}/uploads

# 3. Secrets
./scripts/backup-secrets.sh ${BACKUP_DIR}/secrets

# 4. Configuration
gsutil cp -r .env.production ${BACKUP_DIR}/config/
gsutil cp -r firebase.json ${BACKUP_DIR}/config/

# 5. Code (tag Git)
git tag backup-${DATE}
git push origin backup-${DATE}

echo "✅ Weekly backup completed"
```

## Procédures de Restauration

### Restauration Firestore

#### Restauration Complète
```bash
#!/bin/bash
# scripts/restore-firestore.sh

BACKUP_DATE=$1  # Format: YYYYMMDD
BUCKET="gs://attendancex-backups"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: ./restore-firestore.sh YYYYMMDD"
  exit 1
fi

echo "⚠️  WARNING: This will restore Firestore from backup ${BACKUP_DATE}"
echo "Current data will be overwritten!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restoration cancelled"
  exit 0
fi

# Import depuis le backup
gcloud firestore import ${BUCKET}/firestore/${BACKUP_DATE} \
  --project=attendance-management-system

echo "✅ Firestore restored from ${BACKUP_DATE}"
```

#### Restauration Partielle (Collection spécifique)
```bash
# Restaurer uniquement la collection 'users'
gcloud firestore import ${BUCKET}/firestore/${BACKUP_DATE} \
  --collection-ids=users \
  --project=attendance-management-system
```

### Restauration Cloud Storage

```bash
#!/bin/bash
# scripts/restore-storage.sh

BACKUP_DATE=$1
SOURCE="gs://attendancex-backups/weekly/${BACKUP_DATE}/uploads"
DEST="gs://attendancex-uploads"

# Restaurer les fichiers
gsutil -m rsync -r ${SOURCE} ${DEST}

echo "✅ Storage restored from ${BACKUP_DATE}"
```

### Restauration des Secrets

```bash
#!/bin/bash
# scripts/restore-secrets.sh

BACKUP_FILE=$1

# Déchiffrer
gpg --decrypt ${BACKUP_FILE} | tar -xzf -

# Restaurer chaque secret
for file in backups/secrets/*.txt; do
  secret_name=$(basename $file .txt)
  gcloud secrets versions add $secret_name --data-file=$file
done

echo "✅ Secrets restored"
```

## Tests de Restauration

### Test Mensuel

```bash
#!/bin/bash
# scripts/test-restore.sh

echo "🧪 Starting restore test..."

# 1. Créer un projet de test
TEST_PROJECT="attendancex-restore-test"

# 2. Restaurer le dernier backup
LATEST_BACKUP=$(gsutil ls gs://attendancex-backups/firestore/ | tail -1)
gcloud firestore import ${LATEST_BACKUP} --project=${TEST_PROJECT}

# 3. Vérifier l'intégrité
node scripts/verify-data-integrity.js --project=${TEST_PROJECT}

# 4. Nettoyer
gcloud projects delete ${TEST_PROJECT} --quiet

echo "✅ Restore test completed"
```

### Checklist de Test
- [ ] Backup existe et est accessible
- [ ] Restauration complète réussie
- [ ] Intégrité des données vérifiée
- [ ] Temps de restauration < RTO
- [ ] Perte de données < RPO
- [ ] Application fonctionnelle après restauration

## Scénarios de Désastre

### Scénario 1 : Corruption de Données

**Symptômes** : Données incohérentes ou corrompues

**Procédure** :
1. ✅ Identifier l'étendue de la corruption
2. ✅ Isoler les données affectées
3. ✅ Identifier le dernier backup sain
4. ✅ Restaurer depuis le backup
5. ✅ Vérifier l'intégrité
6. ✅ Réappliquer les transactions perdues (si possible)

**Temps estimé** : 2-4 heures

### Scénario 2 : Panne Complète de Région

**Symptômes** : Région GCP indisponible

**Procédure** :
1. ✅ Activer la région de secours (europe-west3)
2. ✅ Rediriger le DNS vers la nouvelle région
3. ✅ Restaurer depuis le backup cross-region
4. ✅ Vérifier les services
5. ✅ Communiquer aux utilisateurs

**Temps estimé** : 12-24 heures

### Scénario 3 : Ransomware

**Symptômes** : Fichiers chiffrés, demande de rançon

**Procédure** :
1. ✅ **NE PAS PAYER LA RANÇON**
2. ✅ Isoler immédiatement tous les systèmes
3. ✅ Activer le plan de réponse aux incidents
4. ✅ Identifier le point d'infection
5. ✅ Restaurer depuis backup pré-infection
6. ✅ Renforcer la sécurité
7. ✅ Notifier les autorités

**Temps estimé** : 24-48 heures

## Monitoring et Alertes

### Métriques à Surveiller

```typescript
// backend/functions/src/monitoring/backup-monitor.ts

export async function checkBackupHealth() {
  const checks = {
    lastFirestoreBackup: await getLastBackupTime('firestore'),
    lastStorageBackup: await getLastBackupTime('storage'),
    backupSize: await getBackupSize(),
    backupIntegrity: await verifyBackupIntegrity()
  };
  
  // Alerter si backup > 24h
  if (Date.now() - checks.lastFirestoreBackup > 24 * 60 * 60 * 1000) {
    await sendAlert('Firestore backup overdue!');
  }
  
  return checks;
}
```

### Alertes Critiques

| Condition | Alerte | Action |
|-----------|--------|--------|
| Backup échoué | Immédiate | Investigation urgente |
| Backup > 24h | Haute | Lancer backup manuel |
| Espace disque < 20% | Moyenne | Nettoyer anciens backups |
| Test de restauration échoué | Haute | Vérifier procédures |

## Rétention des Backups

### Politique de Rétention

| Type | Fréquence | Rétention |
|------|-----------|-----------|
| Snapshots horaires | Toutes les heures | 7 jours |
| Backups quotidiens | Quotidien | 30 jours |
| Backups hebdomadaires | Hebdomadaire | 90 jours |
| Backups mensuels | Mensuel | 1 an |
| Backups annuels | Annuel | 7 ans (conformité) |

### Nettoyage Automatique

```bash
#!/bin/bash
# scripts/cleanup-old-backups.sh

# Supprimer les backups > 90 jours
gsutil -m rm -r $(gsutil ls gs://attendancex-backups/firestore/ | \
  awk -v date="$(date -d '90 days ago' +%Y%m%d)" '$0 < date')

echo "✅ Old backups cleaned up"
```

## Coûts et Optimisation

### Estimation des Coûts

| Service | Volume | Coût mensuel |
|---------|--------|--------------|
| Firestore exports | 10 GB/jour | ~$30 |
| Cloud Storage (Standard) | 300 GB | ~$6 |
| Cloud Storage (Nearline) | 1 TB | ~$10 |
| Egress (restauration) | Occasionnel | Variable |
| **Total estimé** | | **~$50/mois** |

### Optimisation

1. **Compression** : Compresser les exports (-50% taille)
2. **Lifecycle policies** : Déplacer vers Nearline après 30 jours
3. **Déduplication** : Éviter les backups redondants
4. **Nettoyage** : Supprimer les anciens backups

## Documentation et Formation

### Runbooks

- `/docs/runbooks/restore-firestore.md`
- `/docs/runbooks/restore-storage.md`
- `/docs/runbooks/disaster-recovery.md`

### Formation de l'Équipe

**Fréquence** : Trimestrielle

**Contenu** :
- Procédures de backup
- Procédures de restauration
- Scénarios de désastre
- Exercices pratiques

### Exercices de Simulation

**Fréquence** : Semestrielle

**Scénarios** :
1. Restauration complète depuis backup
2. Basculement vers région secondaire
3. Récupération après ransomware

## Conformité et Audit

### Exigences RGPD

- ✅ Chiffrement des backups
- ✅ Contrôle d'accès strict
- ✅ Logs d'accès aux backups
- ✅ Capacité de suppression (droit à l'oubli)

### Audit Trail

```typescript
// Logger tous les accès aux backups
export function logBackupAccess(action: string, user: string, backup: string) {
  logger.info('Backup Access', {
    action,
    user,
    backup,
    timestamp: new Date().toISOString(),
    ip: getClientIP()
  });
}
```

## Contacts et Responsabilités

| Rôle | Responsable | Contact |
|------|-------------|---------|
| Backup Administrator | DevOps Lead | [email] |
| Disaster Recovery Manager | CTO | [email] |
| Data Protection Officer | Legal | [email] |
| On-call Engineer | Rotation | [PagerDuty] |

---

**Version** : 1.0  
**Dernière mise à jour** : [Date]  
**Prochaine revue** : [Date + 6 mois]  
**Propriétaire** : DevOps Lead
