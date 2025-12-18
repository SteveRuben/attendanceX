# Plan de Réponse aux Incidents de Sécurité

## Vue d'ensemble

Ce document définit les procédures à suivre en cas d'incident de sécurité affectant AttendanceX.

## Équipe de Réponse aux Incidents (IRT)

### Rôles et Responsabilités

| Rôle | Responsable | Contact | Responsabilités |
|------|-------------|---------|-----------------|
| **Incident Commander** | CTO | [email] | Coordination générale, décisions finales |
| **Security Lead** | Security Engineer | [email] | Investigation technique, analyse |
| **Communications Lead** | Product Manager | [email] | Communication interne/externe |
| **Legal Advisor** | Legal Counsel | [email] | Conformité RGPD, obligations légales |
| **Technical Lead** | Lead Developer | [email] | Implémentation des correctifs |

### Contacts d'Urgence

- **Hotline Sécurité** : [phone]
- **Email Sécurité** : security@attendancex.com
- **Slack Channel** : #security-incidents
- **PagerDuty** : [link]

## Classification des Incidents

### Niveaux de Sévérité

#### 🔴 CRITIQUE (P0)
- **Définition** : Impact immédiat sur la sécurité des données ou disponibilité du service
- **Exemples** :
  - Violation de données (data breach)
  - Accès non autorisé aux systèmes de production
  - Ransomware ou malware actif
  - Déni de service (DDoS) affectant tous les utilisateurs
- **SLA** : Réponse immédiate (< 15 minutes)
- **Escalade** : Automatique vers tous les membres IRT

#### 🟠 HAUTE (P1)
- **Définition** : Menace sérieuse mais impact limité
- **Exemples** :
  - Tentative d'intrusion détectée et bloquée
  - Vulnérabilité critique découverte
  - Accès non autorisé à un compte utilisateur
  - Fuite de données limitée
- **SLA** : Réponse < 1 heure
- **Escalade** : Incident Commander + Security Lead

#### 🟡 MOYENNE (P2)
- **Définition** : Risque potentiel nécessitant attention
- **Exemples** :
  - Vulnérabilité moyenne découverte
  - Activité suspecte détectée
  - Violation de politique de sécurité
- **SLA** : Réponse < 4 heures
- **Escalade** : Security Lead

#### 🟢 BASSE (P3)
- **Définition** : Incident mineur sans impact immédiat
- **Exemples** :
  - Scan de vulnérabilité externe
  - Tentative de phishing signalée
  - Violation mineure de politique
- **SLA** : Réponse < 24 heures
- **Escalade** : Ticket standard

## Phases de Réponse

### Phase 1 : Détection et Signalement

#### Sources de Détection
- Alertes automatiques (monitoring, SIEM)
- Signalement utilisateur
- Audit de sécurité
- Scan de vulnérabilité
- Rapport externe (bug bounty, chercheur)

#### Procédure de Signalement
1. **Signaler immédiatement** via :
   - Email : security@attendancex.com
   - Slack : #security-incidents
   - Hotline : [phone]

2. **Informations à fournir** :
   - Date et heure de découverte
   - Description de l'incident
   - Systèmes affectés
   - Impact observé
   - Preuves (logs, screenshots)

3. **Ne PAS** :
   - Tenter de "réparer" seul
   - Supprimer des preuves
   - Communiquer publiquement
   - Paniquer

### Phase 2 : Évaluation et Classification

**Responsable** : Security Lead

**Actions** :
1. ✅ Confirmer l'incident
2. ✅ Classifier la sévérité (P0-P3)
3. ✅ Identifier les systèmes affectés
4. ✅ Évaluer l'impact potentiel
5. ✅ Déterminer la cause probable
6. ✅ Activer l'IRT appropriée

**Délai** : 15-30 minutes pour P0/P1

### Phase 3 : Confinement

**Objectif** : Limiter la propagation et l'impact

#### Confinement Court Terme (Immédiat)
- 🔒 Isoler les systèmes compromis
- 🔒 Bloquer les comptes suspects
- 🔒 Désactiver les accès compromis
- 🔒 Activer les règles firewall d'urgence
- 🔒 Préserver les preuves (logs, snapshots)

#### Confinement Long Terme
- 🔧 Patcher les vulnérabilités
- 🔧 Renforcer les contrôles d'accès
- 🔧 Mettre à jour les règles de sécurité
- 🔧 Déployer des correctifs temporaires

**Checklist de Confinement** :
```bash
# 1. Isoler le système compromis
gcloud compute instances stop [INSTANCE_NAME]

# 2. Créer un snapshot pour investigation
gcloud compute disks snapshot [DISK_NAME] --snapshot-names=incident-[DATE]

# 3. Bloquer l'IP suspecte
gcloud compute firewall-rules create block-suspicious-ip \
  --action=DENY \
  --rules=all \
  --source-ranges=[SUSPICIOUS_IP]

# 4. Révoquer les tokens compromis
# Via Firebase Console ou API

# 5. Forcer la déconnexion des sessions
# Via script de révocation de sessions
```

### Phase 4 : Éradication

**Objectif** : Éliminer la cause racine

**Actions** :
1. 🔍 Identifier la cause racine
2. 🔍 Supprimer les malwares/backdoors
3. 🔍 Fermer les vulnérabilités
4. 🔍 Renforcer les défenses
5. 🔍 Vérifier l'absence de persistance

**Outils** :
- Analyse forensique des logs
- Scan antivirus/antimalware
- Audit de code
- Revue des configurations

### Phase 5 : Récupération

**Objectif** : Restaurer les opérations normales

**Actions** :
1. ✅ Valider que la menace est éliminée
2. ✅ Restaurer les systèmes depuis backups propres
3. ✅ Réactiver les services progressivement
4. ✅ Surveiller intensivement
5. ✅ Valider l'intégrité des données

**Critères de Récupération** :
- [ ] Cause racine identifiée et corrigée
- [ ] Tous les systèmes scannés et propres
- [ ] Backups validés et restaurés
- [ ] Monitoring renforcé en place
- [ ] Tests de sécurité passés
- [ ] Approbation de l'IRT

### Phase 6 : Post-Incident

**Objectif** : Apprendre et améliorer

#### Post-Mortem Meeting
**Délai** : Dans les 48h après résolution

**Participants** : Toute l'IRT + stakeholders

**Agenda** :
1. Chronologie de l'incident
2. Actions prises
3. Ce qui a bien fonctionné
4. Ce qui peut être amélioré
5. Actions correctives

#### Rapport Post-Incident

**Template** :
```markdown
# Rapport d'Incident de Sécurité

## Informations Générales
- **ID Incident** : INC-2024-XXX
- **Date de détection** : [date]
- **Date de résolution** : [date]
- **Sévérité** : [P0/P1/P2/P3]
- **Incident Commander** : [nom]

## Résumé Exécutif
[Description en 2-3 phrases]

## Chronologie
| Heure | Événement |
|-------|-----------|
| 14:23 | Détection initiale |
| 14:30 | IRT activée |
| 14:45 | Confinement |
| ... | ... |

## Impact
- **Utilisateurs affectés** : [nombre]
- **Données compromises** : [description]
- **Durée d'indisponibilité** : [durée]
- **Coût estimé** : [montant]

## Cause Racine
[Analyse détaillée]

## Actions Prises
1. [Action 1]
2. [Action 2]
...

## Leçons Apprises
### Ce qui a bien fonctionné
- [Point 1]
- [Point 2]

### Ce qui peut être amélioré
- [Point 1]
- [Point 2]

## Actions Correctives
| Action | Responsable | Échéance | Statut |
|--------|-------------|----------|--------|
| [Action] | [Nom] | [Date] | [ ] |

## Recommandations
1. [Recommandation 1]
2. [Recommandation 2]
```

## Obligations Légales et Conformité

### RGPD - Notification de Violation

**Délai** : 72 heures après découverte

**Autorité** : CNIL (France)

**Critères de notification** :
- Violation de données personnelles
- Risque pour les droits et libertés des personnes
- Impact significatif

**Informations à fournir** :
- Nature de la violation
- Catégories et nombre de personnes concernées
- Catégories et nombre d'enregistrements
- Conséquences probables
- Mesures prises ou proposées

**Contact CNIL** : https://www.cnil.fr/

### Notification aux Utilisateurs

**Quand notifier** :
- Risque élevé pour les droits et libertés
- Données sensibles compromises
- Obligation légale

**Contenu de la notification** :
```
Objet : Notification importante concernant la sécurité de votre compte

Cher utilisateur,

Nous vous informons qu'un incident de sécurité a été détecté le [date] 
affectant [description].

Données potentiellement affectées :
- [Liste des données]

Actions que nous avons prises :
- [Actions]

Actions recommandées pour vous :
- Changer votre mot de passe immédiatement
- Activer l'authentification à deux facteurs
- Surveiller vos comptes

Pour toute question : security@attendancex.com

Cordialement,
L'équipe AttendanceX
```

## Outils et Ressources

### Outils d'Investigation
- **Logs** : Cloud Logging (GCP)
- **SIEM** : [À définir]
- **Forensics** : Volatility, Autopsy
- **Network** : Wireshark, tcpdump

### Documentation
- Runbooks : `/docs/runbooks/`
- Playbooks : `/docs/security/playbooks/`
- Contacts : `/docs/security/contacts.md`

### Communication Templates
- Email interne : `/templates/incident-internal.md`
- Email utilisateurs : `/templates/incident-users.md`
- Communiqué presse : `/templates/incident-press.md`

## Exercices et Tests

### Simulation d'Incidents (Tabletop Exercises)

**Fréquence** : Trimestrielle

**Scénarios** :
1. Data breach via SQL injection
2. Ransomware attack
3. Insider threat
4. DDoS attack
5. Phishing campaign

**Objectifs** :
- Tester les procédures
- Former l'équipe
- Identifier les gaps
- Améliorer les temps de réponse

### Métriques de Performance

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Temps de détection | < 15 min | - |
| Temps de réponse (P0) | < 15 min | - |
| Temps de confinement | < 1h | - |
| Temps de résolution (P0) | < 4h | - |
| Taux de faux positifs | < 5% | - |

## Amélioration Continue

### Revue Mensuelle
- Analyse des incidents du mois
- Mise à jour des procédures
- Formation de l'équipe
- Tests des outils

### Revue Annuelle
- Audit complet du plan
- Mise à jour des contacts
- Revue des outils
- Certification de l'équipe

## Annexes

### A. Checklist Rapide P0

```
☐ 1. Confirmer l'incident (< 5 min)
☐ 2. Notifier l'IRT (< 10 min)
☐ 3. Isoler les systèmes (< 15 min)
☐ 4. Préserver les preuves (< 20 min)
☐ 5. Évaluer l'impact (< 30 min)
☐ 6. Commencer le confinement (< 45 min)
☐ 7. Communication initiale (< 1h)
☐ 8. Mise à jour régulière (toutes les heures)
```

### B. Contacts Externes

- **Hébergeur** : Google Cloud Support
- **CDN** : Cloudflare Support
- **Assurance Cyber** : [Contact]
- **Cabinet d'Avocats** : [Contact]
- **Relations Presse** : [Contact]

### C. Références

- [NIST Incident Response Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)
- [SANS Incident Handler's Handbook](https://www.sans.org/reading-room/whitepapers/incident/incident-handlers-handbook-33901)
- [CNIL - Notification de violation](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles)

---

**Version** : 1.0  
**Dernière mise à jour** : [Date]  
**Prochaine revue** : [Date + 6 mois]  
**Propriétaire** : Security Lead
