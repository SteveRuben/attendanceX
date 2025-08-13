# Dépannage : Problèmes courants

Ce guide vous aide à résoudre les problèmes les plus fréquents avec les intégrations Attendance-X.

## Diagnostic rapide

### Vérifications préliminaires
Avant de commencer le dépannage :

1. ✅ **Statut du service** : Vérifiez [status.attendance-x.com](https://status.attendance-x.com)
2. ✅ **Connexion internet** : Testez votre connectivité
3. ✅ **Navigateur** : Utilisez une version récente (Chrome, Firefox, Safari)
4. ✅ **Permissions** : Vérifiez vos droits d'accès

### Codes d'erreur courants

| Code | Description | Solution rapide |
|------|-------------|-----------------|
| `INT001` | Token expiré | Reconnectez l'intégration |
| `INT002` | Permissions insuffisantes | Vérifiez les autorisations |
| `INT003` | Service indisponible | Réessayez plus tard |
| `INT004` | Quota dépassé | Contactez l'administrateur |
| `INT005` | Données corrompues | Resynchronisez |

## Problèmes de connexion

### Impossible de se connecter à Google

#### Symptômes
- Message "Échec de l'autorisation Google"
- Redirection vers une page d'erreur
- Popup qui se ferme immédiatement

#### Solutions

**1. Vérifiez les popups**
```
Chrome : Paramètres > Confidentialité > Paramètres du site > Pop-ups
Firefox : Paramètres > Vie privée > Permissions > Fenêtres pop-up
Safari : Préférences > Sites web > Fenêtres pop-up
```

**2. Effacez le cache**
```
1. Ctrl+Shift+Delete (Windows) ou Cmd+Shift+Delete (Mac)
2. Sélectionnez "Cookies et données de sites"
3. Choisissez "Dernière heure"
4. Cliquez sur "Effacer les données"
```

**3. Vérifiez les cookies tiers**
- Autorisez les cookies pour `accounts.google.com`
- Autorisez les cookies pour `attendance-x.com`

**4. Testez en navigation privée**
- Ouvrez un onglet privé/incognito
- Tentez la connexion
- Si ça fonctionne, le problème vient des extensions

#### Cas spéciaux

**Compte G Suite/Workspace**
```
Erreur : "Cette application n'est pas vérifiée"
Solution : Contactez votre administrateur G Suite
```

**Authentification à deux facteurs**
```
Erreur : "Code de vérification requis"
Solution : Utilisez votre application d'authentification habituelle
```

### Problèmes Microsoft 365

#### Échec de connexion Teams

**Symptômes**
- "Impossible de se connecter à Microsoft Teams"
- Erreur de tenant non autorisé

**Solutions**

**1. Vérifiez votre tenant**
```
1. Allez sur portal.office.com
2. Vérifiez que vous êtes sur le bon tenant
3. Notez l'ID du tenant (dans l'URL)
4. Contactez l'admin si nécessaire
```

**2. Permissions manquantes**
```
Permissions requises :
- User.Read
- Calendars.ReadWrite
- Presence.Read
- Chat.ReadWrite (optionnel)
```

**3. Conditional Access**
Si votre organisation utilise l'accès conditionnel :
- Vérifiez que Attendance-X est dans la liste des applications approuvées
- Contactez votre administrateur IT

#### Problèmes Outlook Calendar

**Synchronisation partielle**
```
Symptôme : Seuls certains événements se synchronisent
Cause : Calendriers multiples ou permissions limitées
Solution : 
1. Vérifiez quels calendriers sont sélectionnés
2. Assurez-vous d'avoir les droits sur tous les calendriers
3. Resynchronisez manuellement
```

### Erreurs Slack

#### Bot non trouvé

**Symptômes**
- "Le bot Attendance-X n'est pas installé"
- Commandes `/attendance` non reconnues

**Solutions**

**1. Réinstallez l'application**
```
1. Allez dans Slack > Applications
2. Recherchez "Attendance-X"
3. Cliquez sur "Réinstaller"
4. Accordez toutes les permissions
```

**2. Vérifiez les permissions**
```
Permissions requises :
- Envoyer des messages
- Lire l'historique des canaux
- Utiliser les commandes slash
- Accéder aux informations utilisateur
```

**3. Workspace incorrect**
```
Erreur : "Application non autorisée sur ce workspace"
Solution : Vérifiez que vous êtes sur le bon workspace Slack
```

## Problèmes de synchronisation

### Synchronisation lente

#### Diagnostic
```
Temps normal : < 30 secondes
Temps lent : > 2 minutes
Temps critique : > 5 minutes
```

#### Solutions par ordre de priorité

**1. Réduisez le volume de données**
```
- Limitez la période de synchronisation (ex: 30 jours)
- Désélectionnez les calendriers inutiles
- Filtrez les types d'événements
```

**2. Ajustez la fréquence**
```
Au lieu de "Temps réel" :
- Essayez "Toutes les 15 minutes"
- Ou "Horaire" pour les données moins critiques
```

**3. Vérifiez les quotas**
```
Google Calendar : 1M requêtes/jour
Microsoft Graph : Variable selon la licence
Slack : 1 requête/seconde
```

### Données manquantes

#### Événements non synchronisés

**Vérifications**
1. **Permissions** : L'événement est-il dans un calendrier autorisé ?
2. **Filtres** : L'événement correspond-il aux critères ?
3. **Dates** : L'événement est-il dans la plage synchronisée ?
4. **Statut** : L'événement est-il confirmé (pas en brouillon) ?

**Solutions**
```bash
# Synchronisation manuelle forcée
1. Allez dans Intégrations > [Service]
2. Cliquez sur "Synchroniser maintenant"
3. Cochez "Synchronisation complète"
4. Attendez la fin du processus
```

#### Contacts manquants

**Causes courantes**
- Contacts dans des groupes non synchronisés
- Contacts sans email (Google Contacts)
- Permissions insuffisantes sur les contacts partagés

**Solution**
```
1. Vérifiez les groupes de contacts sélectionnés
2. Assurez-vous que les contacts ont un email
3. Vérifiez les permissions de partage
4. Relancez la synchronisation des contacts
```

### Doublons et conflits

#### Événements dupliqués

**Symptômes**
- Même événement apparaît plusieurs fois
- Modifications perdues après synchronisation

**Solutions**

**1. Nettoyage automatique**
```
1. Allez dans Paramètres > Intégrations
2. Sélectionnez l'intégration concernée
3. Cliquez sur "Nettoyer les doublons"
4. Confirmez l'opération
```

**2. Configuration anti-doublons**
```json
{
  "duplicateDetection": {
    "enabled": true,
    "matchCriteria": ["title", "startTime", "endTime"],
    "autoMerge": true,
    "notifyUser": false
  }
}
```

#### Résolution de conflits

**Stratégies disponibles**
1. **Priorité Attendance-X** (recommandé)
2. **Priorité service externe**
3. **Résolution manuelle**
4. **Dernière modification gagne**

**Configuration**
```
1. Paramètres > Intégrations > Avancé
2. Section "Résolution de conflits"
3. Choisissez votre stratégie
4. Activez les notifications si souhaité
```

## Problèmes de performance

### Application lente

#### Diagnostic des performances
```javascript
// Ouvrez la console développeur (F12)
// Vérifiez les temps de réponse
console.time('integration-load');
// ... après chargement
console.timeEnd('integration-load');
```

#### Optimisations

**1. Réduisez les intégrations actives**
- Désactivez les services inutilisés
- Limitez les calendriers synchronisés
- Réduisez la fréquence de synchronisation

**2. Nettoyez les données**
```
1. Supprimez l'historique ancien (> 90 jours)
2. Nettoyez les tokens expirés
3. Videz le cache de l'application
```

**3. Optimisez le navigateur**
- Fermez les onglets inutiles
- Désactivez les extensions non essentielles
- Redémarrez le navigateur

### Erreurs de timeout

#### Symptômes
- "Timeout de connexion"
- "La requête a pris trop de temps"
- Synchronisation qui s'arrête

#### Solutions

**1. Augmentez les timeouts**
```json
{
  "timeouts": {
    "connection": 30000,
    "read": 60000,
    "sync": 300000
  }
}
```

**2. Synchronisation par lots**
```
Au lieu de synchroniser tout d'un coup :
- Synchronisez par périodes (semaine par semaine)
- Traitez les calendriers un par un
- Utilisez la synchronisation incrémentale
```

## Problèmes de sécurité

### Tokens expirés

#### Symptômes
- "Token d'accès expiré"
- Demande de reconnexion fréquente
- Synchronisation qui échoue

#### Solutions

**1. Renouvellement automatique**
```
1. Vérifiez que le renouvellement auto est activé
2. Paramètres > Sécurité > Renouvellement des tokens
3. Activez "Renouvellement automatique"
```

**2. Renouvellement manuel**
```
1. Allez dans Intégrations
2. Cliquez sur l'icône d'avertissement
3. Sélectionnez "Renouveler les autorisations"
4. Suivez le processus OAuth
```

### Permissions révoquées

#### Causes
- Changement de mot de passe du service
- Révocation manuelle par l'utilisateur
- Politique de sécurité de l'organisation

#### Solutions
```
1. Reconnectez l'intégration complètement
2. Vérifiez les nouvelles permissions requises
3. Contactez l'admin si les permissions sont bloquées
```

## Problèmes spécifiques par service

### Google Calendar

#### Erreur "Calendar not found"
```
Cause : Calendrier supprimé ou permissions changées
Solution :
1. Vérifiez que le calendrier existe toujours
2. Vérifiez vos permissions sur le calendrier
3. Resélectionnez les calendriers à synchroniser
```

#### Quota dépassé
```
Erreur : "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'"
Solution :
1. Réduisez la fréquence de synchronisation
2. Limitez le nombre de calendriers
3. Contactez le support si le problème persiste
```

### Microsoft Teams

#### Statut non mis à jour
```
Cause : Permissions Teams insuffisantes
Solution :
1. Reconnectez avec les permissions Presence.ReadWrite
2. Vérifiez les paramètres de confidentialité Teams
3. Redémarrez l'application Teams
```

#### Messages non envoyés
```
Cause : Bot non ajouté au canal
Solution :
1. Ajoutez @AttendanceX au canal
2. Donnez les permissions d'écriture au bot
3. Testez avec une mention directe
```

### Slack

#### Commandes non reconnues
```
Erreur : "Command '/attendance' not recognized"
Solution :
1. Vérifiez que l'app est installée
2. Réinstallez l'application Slack
3. Vérifiez les permissions de commandes slash
```

#### Notifications non reçues
```
Cause : Paramètres de notification Slack
Solution :
1. Vérifiez vos paramètres de notification Slack
2. Assurez-vous que le canal n'est pas en sourdine
3. Vérifiez les filtres de mots-clés
```

## Outils de diagnostic

### Interface de debug

#### Accès aux logs détaillés
```
1. Paramètres > Avancé > Mode debug
2. Activez "Logs détaillés"
3. Reproduisez le problème
4. Téléchargez les logs
```

#### Test de connectivité
```
1. Intégrations > [Service] > Tester
2. Vérifiez chaque étape :
   - Connexion réseau ✅
   - Authentification ✅
   - Permissions ✅
   - Accès aux données ✅
```

### Outils externes

#### Test des APIs
```bash
# Test Google Calendar API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events"

# Test Microsoft Graph API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://graph.microsoft.com/v1.0/me/calendar/events"
```

#### Validation OAuth
```
1. Utilisez jwt.io pour décoder vos tokens
2. Vérifiez les scopes accordés
3. Contrôlez les dates d'expiration
```

## Escalade et support

### Quand contacter le support

#### Niveau 1 - Support utilisateur
- Problèmes de configuration
- Questions sur l'utilisation
- Erreurs courantes

#### Niveau 2 - Support technique
- Problèmes de performance
- Erreurs de synchronisation complexes
- Problèmes de sécurité

#### Niveau 3 - Ingénierie
- Bugs de l'application
- Problèmes d'infrastructure
- Nouvelles fonctionnalités

### Informations à fournir

#### Pour un rapport de bug efficace
```
1. Description du problème
2. Étapes pour reproduire
3. Comportement attendu vs observé
4. Captures d'écran/vidéos
5. Logs d'erreur
6. Informations système :
   - Navigateur et version
   - Système d'exploitation
   - Version d'Attendance-X
   - Services intégrés concernés
```

#### Template de rapport
```markdown
## Description
[Décrivez le problème en quelques phrases]

## Étapes pour reproduire
1. Allez dans...
2. Cliquez sur...
3. Observez...

## Résultat attendu
[Ce qui devrait se passer]

## Résultat observé
[Ce qui se passe réellement]

## Environnement
- Navigateur : Chrome 120.0.6099.109
- OS : Windows 11
- Attendance-X : v2.1.0
- Service concerné : Google Calendar

## Logs d'erreur
[Copiez les messages d'erreur ici]
```

### Canaux de support

- **Chat en direct** : Disponible 9h-18h (CET)
- **Email** : support@attendance-x.com (réponse < 24h)
- **Téléphone** : +33 1 23 45 67 89 (urgences)
- **Documentation** : docs.attendance-x.com
- **Communauté** : community.attendance-x.com

### SLA de support

| Priorité | Temps de réponse | Résolution |
|----------|------------------|------------|
| Critique | 1 heure | 4 heures |
| Élevée | 4 heures | 24 heures |
| Normale | 24 heures | 72 heures |
| Faible | 72 heures | 1 semaine |