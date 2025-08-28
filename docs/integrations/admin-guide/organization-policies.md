# Guide administrateur : Politiques d'organisation

Ce guide explique comment configurer et gérer les politiques d'intégration au niveau de l'organisation.

## Vue d'ensemble

En tant qu'administrateur, vous pouvez :
- Contrôler quelles intégrations sont autorisées
- Définir des politiques de sécurité et de confidentialité
- Surveiller l'utilisation des intégrations
- Gérer les autorisations en masse

## Accès aux paramètres d'administration

1. Connectez-vous avec un compte administrateur
2. Allez dans **Administration** > **Intégrations**
3. Sélectionnez l'onglet **Politiques d'organisation**

## Configuration des intégrations autorisées

### Activation/Désactivation des services

```json
{
  "allowedIntegrations": {
    "google": {
      "enabled": true,
      "services": {
        "calendar": true,
        "contacts": true,
        "gmail": false
      }
    },
    "microsoft": {
      "enabled": true,
      "services": {
        "outlook": true,
        "teams": true,
        "onedrive": false
      }
    },
    "slack": {
      "enabled": true,
      "restrictToWorkspace": "company-workspace"
    },
    "zoom": {
      "enabled": false,
      "reason": "Politique de sécurité"
    }
  }
}
```

### Paramètres par service

#### Google Workspace
- **Domaines autorisés** : Limitez aux domaines de l'entreprise
- **Types de comptes** : Professionnels uniquement
- **Permissions maximales** : Définissez les limites
- **Audit** : Activez le logging détaillé

#### Microsoft 365
- **Tenant restriction** : Limitez au tenant de l'organisation
- **Conditional Access** : Intégrez avec Azure AD
- **DLP policies** : Respectez les politiques de prévention des fuites
- **Compliance** : Activez les contrôles de conformité

#### Slack
- **Workspace restriction** : Un seul workspace autorisé
- **Channel policies** : Contrôlez les canaux utilisables
- **Bot permissions** : Limitez les actions du bot
- **Data retention** : Configurez la rétention des messages

## Politiques de sécurité

### Authentification et autorisation

```yaml
security_policies:
  oauth:
    require_pkce: true
    token_lifetime: 3600  # 1 heure
    refresh_token_rotation: true
    
  permissions:
    require_admin_approval: true
    auto_revoke_unused: 30  # jours
    audit_permission_changes: true
    
  data_access:
    encrypt_tokens: true
    log_all_access: true
    geographic_restrictions: ["EU", "US"]
```

### Contrôles d'accès

1. **Approbation administrative** :
   - Toute nouvelle intégration nécessite une approbation
   - Workflow de validation avec justification
   - Notification automatique aux administrateurs

2. **Révocation automatique** :
   - Tokens inutilisés depuis 30 jours
   - Comptes désactivés dans l'AD
   - Changements de rôle ou de département

3. **Audit et conformité** :
   - Logging de toutes les actions
   - Rapports de conformité automatiques
   - Alertes en cas d'activité suspecte

### Configuration des permissions

#### Matrice des permissions par rôle

| Service | Utilisateur | Manager | Admin | Super Admin |
|---------|-------------|---------|-------|-------------|
| Google Calendar | Lecture/Écriture | Lecture/Écriture | Lecture/Écriture | Tous droits |
| Google Contacts | Lecture | Lecture/Écriture | Lecture/Écriture | Tous droits |
| Teams Status | Lecture/Écriture | Lecture/Écriture | Lecture/Écriture | Tous droits |
| Slack Notifications | Lecture | Lecture/Écriture | Lecture/Écriture | Tous droits |
| Zoom Meetings | Lecture | Lecture/Écriture | Lecture/Écriture | Tous droits |

#### Permissions granulaires

```json
{
  "permissions": {
    "google_calendar": {
      "read_events": ["user", "manager", "admin"],
      "create_events": ["manager", "admin"],
      "modify_events": ["admin"],
      "delete_events": ["admin"]
    },
    "teams_status": {
      "read_status": ["user", "manager", "admin"],
      "update_own_status": ["user", "manager", "admin"],
      "update_team_status": ["manager", "admin"]
    }
  }
}
```

## Surveillance et monitoring

### Tableau de bord administrateur

#### Métriques clés
- **Utilisateurs actifs** : Nombre d'utilisateurs avec intégrations
- **Taux d'adoption** : Pourcentage d'adoption par service
- **Volume de synchronisation** : Données échangées quotidiennement
- **Taux d'erreur** : Pourcentage d'échecs de synchronisation

#### Alertes configurables
```yaml
alerts:
  high_error_rate:
    threshold: 5%
    window: 1h
    recipients: ["admin@company.com"]
    
  unusual_activity:
    threshold: 10x_normal
    window: 15m
    recipients: ["security@company.com"]
    
  token_expiration:
    advance_notice: 7d
    recipients: ["user", "admin"]
```

### Rapports d'utilisation

#### Rapport hebdomadaire automatique
```
📊 Rapport d'intégrations - Semaine du 15/01/2024

👥 Adoption:
   - Utilisateurs actifs: 245/300 (82%)
   - Nouvelles connexions: 12
   - Déconnexions: 3

🔄 Synchronisations:
   - Total: 15,420
   - Succès: 15,180 (98.4%)
   - Erreurs: 240 (1.6%)

⚠️ Alertes:
   - Tokens expirés: 5
   - Erreurs répétées: 2 utilisateurs
   - Activité suspecte: 0

🏆 Top services:
   1. Google Calendar (89% adoption)
   2. Microsoft Teams (76% adoption)
   3. Slack (45% adoption)
```

### Audit et conformité

#### Logs d'audit
Tous les événements sont enregistrés :
```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "event_type": "integration_connected",
  "user_id": "user123",
  "service": "google_calendar",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "permissions_granted": ["calendar.read", "calendar.write"],
  "admin_approved": true,
  "approval_by": "admin456"
}
```

#### Rapports de conformité
- **RGPD** : Rapport des données personnelles traitées
- **SOX** : Contrôles d'accès aux données financières
- **HIPAA** : Protection des données de santé (si applicable)
- **ISO 27001** : Conformité sécurité informatique

## Gestion des utilisateurs

### Provisioning automatique

#### Intégration Active Directory
```yaml
ad_integration:
  sync_frequency: hourly
  user_attributes:
    - department
    - job_title
    - manager
    - location
  
  auto_assign_integrations:
    sales_team: ["google_calendar", "slack"]
    it_team: ["google_calendar", "microsoft_teams", "zoom"]
    executives: ["all_integrations"]
```

#### Onboarding automatique
1. **Nouveau collaborateur** détecté dans l'AD
2. **Profil créé** automatiquement dans Attendance-X
3. **Intégrations assignées** selon le département
4. **Email de bienvenue** avec instructions
5. **Formation planifiée** automatiquement

### Offboarding sécurisé

#### Processus de départ
1. **Désactivation immédiate** de toutes les intégrations
2. **Révocation des tokens** OAuth
3. **Suppression des données** selon la politique de rétention
4. **Notification** aux managers et à l'IT
5. **Rapport de déconnexion** généré

#### Checklist de départ
- [ ] Tokens OAuth révoqués
- [ ] Données personnelles supprimées
- [ ] Accès aux calendriers partagés retiré
- [ ] Notifications Slack/Teams désactivées
- [ ] Réunions Zoom transférées ou annulées
- [ ] Audit trail généré

## Politiques de données

### Classification des données

#### Niveaux de sensibilité
1. **Public** : Informations générales de l'entreprise
2. **Interne** : Données internes non sensibles
3. **Confidentiel** : Données sensibles de l'entreprise
4. **Restreint** : Données hautement sensibles

#### Règles de partage
```json
{
  "data_sharing_rules": {
    "public": {
      "allowed_services": ["all"],
      "encryption_required": false
    },
    "internal": {
      "allowed_services": ["google", "microsoft"],
      "encryption_required": true
    },
    "confidential": {
      "allowed_services": ["microsoft_only"],
      "encryption_required": true,
      "admin_approval": true
    },
    "restricted": {
      "allowed_services": [],
      "sharing_prohibited": true
    }
  }
}
```

### Rétention et suppression

#### Politiques de rétention
- **Données de synchronisation** : 90 jours
- **Logs d'audit** : 7 ans (conformité)
- **Tokens OAuth** : Jusqu'à révocation
- **Données utilisateur** : Selon RGPD

#### Suppression automatique
```yaml
retention_policies:
  sync_history:
    retention_days: 90
    auto_cleanup: true
    
  audit_logs:
    retention_years: 7
    archive_after_years: 2
    
  user_data:
    delete_after_departure_days: 30
    anonymize_after_years: 3
```

## Configuration avancée

### Intégrations personnalisées

#### API d'entreprise
Connectez vos systèmes internes :
```yaml
custom_integrations:
  hr_system:
    endpoint: "https://hr.company.com/api"
    auth_type: "oauth2"
    sync_frequency: "daily"
    data_mapping:
      employee_id: "user_id"
      department: "department"
      
  erp_system:
    endpoint: "https://erp.company.com/api"
    auth_type: "api_key"
    sync_frequency: "hourly"
    permissions: ["admin_only"]
```

#### Webhooks personnalisés
```json
{
  "webhooks": {
    "attendance_change": {
      "url": "https://company.com/webhooks/attendance",
      "events": ["checkin", "checkout", "break"],
      "auth": "bearer_token",
      "retry_policy": {
        "max_retries": 3,
        "backoff": "exponential"
      }
    }
  }
}
```

### Environnements multiples

#### Configuration par environnement
```yaml
environments:
  development:
    allowed_integrations: ["google_test", "slack_test"]
    data_retention_days: 7
    audit_level: "debug"
    
  staging:
    allowed_integrations: ["google", "microsoft"]
    data_retention_days: 30
    audit_level: "info"
    
  production:
    allowed_integrations: ["all"]
    data_retention_days: 90
    audit_level: "warn"
    compliance_mode: true
```

## Dépannage administrateur

### Problèmes courants

#### Échecs de synchronisation en masse
1. **Vérifiez les quotas** des APIs externes
2. **Contrôlez les permissions** au niveau organisation
3. **Examinez les logs** d'erreur détaillés
4. **Contactez le support** des services tiers si nécessaire

#### Problèmes de performance
1. **Surveillez les métriques** de charge
2. **Ajustez les fréquences** de synchronisation
3. **Optimisez les filtres** de données
4. **Considérez la mise à l'échelle** horizontale

### Outils de diagnostic

#### Interface de debug
- **Logs en temps réel** pour tous les services
- **Simulation de synchronisation** sans impact
- **Test de connectivité** pour chaque intégration
- **Analyse des performances** détaillée

#### Scripts de maintenance
```bash
# Nettoyage des tokens expirés
./admin-tools.sh cleanup-expired-tokens

# Rapport d'utilisation détaillé
./admin-tools.sh usage-report --period=30d

# Test de toutes les connexions
./admin-tools.sh test-all-connections

# Synchronisation forcée pour un utilisateur
./admin-tools.sh force-sync --user=user123
```

## Support et escalade

### Niveaux de support

1. **Niveau 1** : Support utilisateur standard
2. **Niveau 2** : Support technique avancé
3. **Niveau 3** : Ingénierie et développement
4. **Escalade fournisseur** : Support des services tiers

### Contacts d'urgence

- **Support technique 24/7** : +33 1 23 45 67 89
- **Sécurité** : security@attendance-x.com
- **Escalade critique** : critical@attendance-x.com
- **Account Manager** : Votre contact commercial dédié

### Procédures d'urgence

#### Incident de sécurité
1. **Isolation immédiate** des systèmes affectés
2. **Révocation en masse** des tokens si nécessaire
3. **Notification** des autorités compétentes
4. **Communication** transparente aux utilisateurs
5. **Post-mortem** et amélioration des processus