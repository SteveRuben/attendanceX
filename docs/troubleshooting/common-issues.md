# Guide de dépannage - AttendanceX

## Table des matières
1. [Problèmes de connexion](#problèmes-de-connexion)
2. [Problèmes de pointage](#problèmes-de-pointage)
3. [Problèmes de géolocalisation](#problèmes-de-géolocalisation)
4. [Problèmes mobiles](#problèmes-mobiles)
5. [Problèmes de synchronisation](#problèmes-de-synchronisation)
6. [Problèmes de notifications](#problèmes-de-notifications)
7. [Problèmes de performance](#problèmes-de-performance)
8. [Codes d'erreur](#codes-derreur)
9. [Outils de diagnostic](#outils-de-diagnostic)
10. [Contact support](#contact-support)

## Problèmes de connexion

### Impossible de se connecter

**Symptômes :**
- Message "Identifiants incorrects"
- Page de connexion qui se recharge
- Erreur de réseau

**Solutions :**
1. **Vérifiez vos identifiants**
   - Email correct (sans espaces)
   - Mot de passe respectant la casse
   - Caps Lock désactivé

2. **Réinitialisez votre mot de passe**
   - Cliquez sur "Mot de passe oublié"
   - Vérifiez vos emails (spam inclus)
   - Suivez le lien de réinitialisation

3. **Vérifiez votre connexion**
   - Testez sur un autre site web
   - Redémarrez votre routeur
   - Essayez avec des données mobiles

4. **Videz le cache du navigateur**
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Cmd+Option+E
   ```

### Session expirée fréquemment

**Causes possibles :**
- Inactivité prolongée
- Changement d'adresse IP
- Problème de cookies

**Solutions :**
1. **Activez "Se souvenir de moi"**
2. **Autorisez les cookies** pour le site
3. **Mettez à jour votre navigateur**
4. **Contactez l'administrateur** si le problème persiste

## Problèmes de pointage

### Impossible de pointer l'arrivée

**Messages d'erreur courants :**
- "Vous avez déjà pointé aujourd'hui"
- "Géolocalisation requise"
- "Hors zone autorisée"

**Solutions :**

**Déjà pointé :**
1. Vérifiez votre statut actuel
2. Si erreur, contactez votre manager
3. Pointez la sortie si nécessaire

**Géolocalisation requise :**
1. **Autorisez la géolocalisation**
   - Chrome : Cliquez sur l'icône de localisation dans la barre d'adresse
   - Firefox : Cliquez sur "Autoriser" dans la notification
   - Safari : Préférences > Confidentialité > Services de localisation

2. **Vérifiez les paramètres système**
   - Windows : Paramètres > Confidentialité > Localisation
   - macOS : Préférences Système > Sécurité > Confidentialité > Localisation
   - Mobile : Paramètres > Localisation > AttendanceX

**Hors zone autorisée :**
1. Rapprochez-vous du lieu de travail
2. Vérifiez que vous êtes au bon endroit
3. Contactez l'administrateur si la zone est incorrecte

### Pointage en double

**Symptômes :**
- Plusieurs pointages pour la même période
- Temps de travail incorrect

**Solutions :**
1. **Ne pointez qu'une seule fois** par période
2. **Attendez la confirmation** avant de re-cliquer
3. **Contactez votre manager** pour correction

### Oubli de pointage

**Solutions :**
1. **Pointage tardif** (si autorisé)
   - Pointez normalement
   - Ajoutez un commentaire explicatif

2. **Demande de correction**
   - Contactez votre manager
   - Fournissez les heures exactes
   - Justifiez l'oubli

## Problèmes de géolocalisation

### Géolocalisation imprécise

**Symptômes :**
- Position incorrecte affichée
- Rejet du pointage malgré la bonne position

**Solutions :**
1. **Améliorez la précision**
   - Activez le GPS (mobile)
   - Sortez à l'extérieur
   - Attendez quelques secondes

2. **Vérifiez les paramètres**
   - Précision élevée activée
   - WiFi et Bluetooth activés (améliore la précision)
   - Applications de localisation fermées

3. **Redémarrez l'application**
   - Fermez complètement l'app
   - Relancez et réessayez

### Géolocalisation refusée

**Solutions :**
1. **Navigateur web**
   - Cliquez sur l'icône de cadenas/localisation
   - Sélectionnez "Autoriser"
   - Rechargez la page

2. **Application mobile**
   - Paramètres > Applications > AttendanceX > Autorisations
   - Activez "Localisation"
   - Choisissez "Toujours" ou "Pendant l'utilisation"

3. **Système**
   - Vérifiez que la localisation est activée globalement
   - Redémarrez l'appareil si nécessaire

## Problèmes mobiles

### Application qui se ferme

**Causes possibles :**
- Mémoire insuffisante
- Version obsolète
- Conflit avec d'autres apps

**Solutions :**
1. **Libérez de la mémoire**
   - Fermez les autres applications
   - Redémarrez le téléphone
   - Supprimez les fichiers inutiles

2. **Mettez à jour l'application**
   - Vérifiez sur l'App Store/Play Store
   - Installez la dernière version

3. **Réinstallez l'application**
   - Sauvegardez vos données (si possible)
   - Désinstallez l'app
   - Réinstallez depuis le store

### Notifications qui ne fonctionnent pas

**Solutions :**
1. **Vérifiez les autorisations**
   - Paramètres > Applications > AttendanceX > Notifications
   - Activez toutes les notifications nécessaires

2. **Paramètres système**
   - Mode "Ne pas déranger" désactivé
   - Notifications système activées
   - Batterie non optimisée pour l'app

3. **Dans l'application**
   - Paramètres > Notifications
   - Vérifiez que les types souhaités sont activés

### Synchronisation lente

**Solutions :**
1. **Vérifiez la connexion**
   - WiFi stable ou 4G/5G
   - Testez la vitesse de connexion

2. **Forcez la synchronisation**
   - Tirez vers le bas pour actualiser
   - Ou utilisez le bouton "Synchroniser"

3. **Redémarrez l'application**
   - Fermez complètement
   - Relancez et attendez la sync

## Problèmes de synchronisation

### Données non synchronisées

**Symptômes :**
- Pointages manquants
- Données différentes entre web et mobile
- Indicateur de synchronisation persistant

**Solutions :**
1. **Vérifiez la connexion internet**
   - Testez sur d'autres sites/apps
   - Changez de réseau si possible

2. **Synchronisation manuelle**
   - Bouton "Actualiser" ou "Sync"
   - Attendez la fin du processus

3. **Redémarrez l'application**
   - Fermeture complète
   - Relancement

4. **Vérifiez l'espace de stockage**
   - Libérez de l'espace si nécessaire
   - L'app a besoin d'espace pour les données temporaires

### Conflits de données

**Symptômes :**
- Données différentes selon l'appareil
- Messages de conflit

**Solutions :**
1. **Utilisez la version la plus récente**
   - Généralement celle du serveur
   - Ou celle avec le timestamp le plus récent

2. **Contactez le support**
   - Si les données sont critiques
   - Fournissez les détails du conflit

## Problèmes de notifications

### Pas de notifications reçues

**Solutions :**
1. **Vérifiez les paramètres de l'app**
   - Notifications activées
   - Types de notifications sélectionnés
   - Horaires de notification configurés

2. **Paramètres système**
   - Notifications autorisées pour l'app
   - Mode silencieux désactivé
   - Batterie non optimisée

3. **Testez les notifications**
   - Demandez un test depuis l'app
   - Vérifiez si elles arrivent

### Trop de notifications

**Solutions :**
1. **Personnalisez les paramètres**
   - Désactivez les types non souhaités
   - Ajustez la fréquence
   - Configurez les heures de silence

2. **Utilisez les filtres**
   - Notifications importantes uniquement
   - Groupement par type

## Problèmes de performance

### Application lente

**Causes possibles :**
- Connexion internet lente
- Appareil surchargé
- Cache plein

**Solutions :**
1. **Optimisez la connexion**
   - Utilisez le WiFi si possible
   - Fermez les autres apps consommatrices

2. **Libérez les ressources**
   - Redémarrez l'appareil
   - Fermez les apps inutiles
   - Videz le cache

3. **Mettez à jour**
   - Application
   - Système d'exploitation
   - Navigateur (version web)

### Chargement long des pages

**Solutions :**
1. **Vérifiez la connexion**
   - Test de débit internet
   - Changez de réseau si possible

2. **Optimisez le navigateur**
   - Fermez les onglets inutiles
   - Videz le cache
   - Désactivez les extensions

3. **Réduisez la charge**
   - Consultez moins de données à la fois
   - Utilisez les filtres de date

## Codes d'erreur

### Erreurs de connexion
- **E001** : Identifiants incorrects
- **E002** : Compte verrouillé
- **E003** : Session expirée
- **E004** : Accès refusé

### Erreurs de pointage
- **E101** : Géolocalisation requise
- **E102** : Hors zone autorisée
- **E103** : Déjà pointé
- **E104** : Pas encore pointé
- **E105** : Horaire non autorisé

### Erreurs de synchronisation
- **E201** : Connexion impossible
- **E202** : Données corrompues
- **E203** : Conflit de données
- **E204** : Espace insuffisant

### Erreurs système
- **E301** : Erreur serveur
- **E302** : Maintenance en cours
- **E303** : Version obsolète
- **E304** : Fonctionnalité indisponible

## Outils de diagnostic

### Informations système

Pour aider le support, collectez ces informations :

**Version web :**
- Navigateur et version
- Système d'exploitation
- URL de la page
- Message d'erreur exact

**Version mobile :**
- Modèle d'appareil
- Version du système
- Version de l'application
- Capture d'écran de l'erreur

### Tests de connectivité

1. **Test de ping**
   ```
   ping api.attendancex.com
   ```

2. **Test de résolution DNS**
   ```
   nslookup attendancex.com
   ```

3. **Test de port**
   ```
   telnet api.attendancex.com 443
   ```

### Logs de débogage

**Navigateur :**
1. Ouvrez les outils de développement (F12)
2. Onglet "Console"
3. Reproduisez le problème
4. Copiez les messages d'erreur

**Mobile :**
1. Activez les logs de débogage dans les paramètres
2. Reproduisez le problème
3. Exportez les logs depuis l'app

## Contact support

### Avant de contacter le support

1. **Essayez les solutions de base**
   - Redémarrage de l'app/navigateur
   - Vérification de la connexion
   - Mise à jour de l'application

2. **Collectez les informations**
   - Description détaillée du problème
   - Étapes pour reproduire
   - Captures d'écran/vidéos
   - Informations système

3. **Vérifiez les annonces**
   - Maintenance programmée
   - Problèmes connus
   - Mises à jour récentes

### Canaux de support

**Support technique :**
- 📧 Email : support@attendancex.com
- 📞 Téléphone : 01 23 45 67 89
- 💬 Chat : Disponible dans l'application
- 🎫 Ticket : [support.attendancex.com](https://support.attendancex.com)

**Support utilisateur :**
- 📧 Email : help@attendancex.com
- 📞 Téléphone : 01 23 45 67 90
- 📚 Base de connaissances : [help.attendancex.com](https://help.attendancex.com)

**Urgences (24h/7j) :**
- 📞 Téléphone : 01 23 45 67 99
- 📧 Email : urgent@attendancex.com

### Informations à fournir

**Problème technique :**
- Description du problème
- Étapes pour reproduire
- Message d'erreur exact
- Navigateur/appareil utilisé
- Heure de survenue
- Fréquence du problème

**Problème de données :**
- ID employé concerné
- Date et heure du problème
- Données attendues vs réelles
- Impact sur la paie/planning
- Urgence de la correction

### Temps de réponse

| Priorité | Première réponse | Résolution |
|----------|------------------|------------|
| Critique | 1 heure | 4 heures |
| Élevée | 4 heures | 24 heures |
| Normale | 24 heures | 72 heures |
| Faible | 72 heures | 1 semaine |

### Statut du service

Consultez le statut en temps réel :
- 🌐 [status.attendancex.com](https://status.attendancex.com)
- 📱 Notifications push en cas de problème
- 📧 Abonnement aux alertes par email

---

*Guide de dépannage - Version 1.0 - Janvier 2024*n expirée fréquemment

**Causes possibles :**
- Inactivité prolongée
- Changement d'adresse IP
- Problème de cookies

**Solutions :**
1. Activez "Se souvenir de moi"
2. Vérifiez les paramètres de cookies
3. Contactez l'administrateur pour ajuster la durée de session

## Problèmes de géolocalisation

### Géolocalisation refusée

**Message d'erreur :** "Accès à la géolocalisation refusé"

**Solutions par navigateur :**

**Chrome :**
1. Cliquez sur l'icône de cadenas dans la barre d'adresse
2. Sélectionnez "Autoriser" pour la géolocalisation
3. Rechargez la page

**Firefox :**
1. Cliquez sur l'icône de bouclier dans la barre d'adresse
2. Désactivez la protection contre le pistage pour ce site
3. Autorisez la géolocalisation

**Safari :**
1. Safari > Préférences > Sites web
2. Géolocalisation > Autoriser pour votre site
3. Rechargez la page

### Position imprécise

**Symptômes :**
- Erreur "Position trop imprécise"
- Pointage refusé pour cause de localisation

**Solutions :**
1. **Activez le GPS** sur votre appareil
2. **Sortez à l'extérieur** si vous êtes dans un bâtiment
3. **Attendez quelques secondes** pour une meilleure précision
4. **Redémarrez l'application** de géolocalisation

### Hors zone autorisée

**Message :** "Vous n'êtes pas dans une zone de travail autorisée"

**Vérifications :**
1. Confirmez que vous êtes sur le lieu de travail
2. Vérifiez avec votre manager les zones autorisées
3. Contactez l'administrateur si la zone est incorrecte

## Problèmes de pointage

### Pointage déjà effectué

**Message :** "Un pointage existe déjà pour cette période"

**Solutions :**
1. Vérifiez votre statut actuel
2. Si erreur, contactez votre manager pour correction
3. Attendez la période suivante pour pointer

### Impossible de pointer

**Causes possibles :**
- Hors des heures de travail
- Géolocalisation requise
- Problème de connexion

**Diagnostic :**
1. Vérifiez l'heure actuelle
2. Confirmez votre position
3. Testez votre connexion internet
4. Redémarrez l'application

### Pointage en retard

**Pour corriger un oubli :**
1. Pointez normalement (sera marqué en retard)
2. Contactez votre manager avec justification
3. Demandez une correction si nécessaire

## Problèmes de synchronisation

### Données non synchronisées

**Symptômes :**
- Pointages manquants
- Données obsolètes
- Indicateur de synchronisation rouge

**Solutions :**

1. **Synchronisation manuelle**
   - Tirez vers le bas pour actualiser
   - Cliquez sur "Synchroniser"
   - Attendez la fin du processus

2. **Vérifiez la connexion**
   - Wi-Fi ou données mobiles actives
   - Signal suffisant
   - Pas de restriction réseau

3. **Redémarrez l'application**
   - Fermez complètement l'app
   - Relancez après 30 secondes
   - Vérifiez la synchronisation

### Conflits de données

**Message :** "Conflit de synchronisation détecté"

**Résolution :**
1. Choisissez la version correcte
2. Validez les modifications
3. Contactez le support si récurrent

## Problèmes de notifications

### Notifications non reçues

**Vérifications :**

1. **Paramètres de l'appareil**
   - Notifications autorisées pour AttendanceX
   - Son et vibrations activés
   - Mode "Ne pas déranger" désactivé

2. **Paramètres de l'application**
   - Types de notifications activés
   - Horaires de notification configurés
   - Canaux de notification sélectionnés

3. **Paramètres système**
   - Économie de batterie désactivée pour l'app
   - Optimisation de batterie exclue
   - Démarrage automatique autorisé

### Trop de notifications

**Pour réduire :**
1. Accédez aux paramètres de notification
2. Désactivez les types non souhaités
3. Ajustez la fréquence des rappels
4. Configurez les heures de silence

## Problèmes de performance

### Application lente

**Causes et solutions :**

1. **Mémoire insuffisante**
   - Fermez les autres applications
   - Redémarrez votre appareil
   - Libérez de l'espace de stockage

2. **Connexion lente**
   - Testez votre vitesse internet
   - Changez de réseau Wi-Fi
   - Utilisez les données mobiles

3. **Cache corrompu**
   - Videz le cache de l'application
   - Redémarrez l'application
   - Réinstallez si nécessaire

### Plantages fréquents

**Solutions progressives :**

1. **Redémarrage simple**
   - Fermez et relancez l'app
   - Redémarrez l'appareil

2. **Mise à jour**
   - Vérifiez les mises à jour disponibles
   - Installez la dernière version
   - Redémarrez après installation

3. **Réinstallation**
   - Sauvegardez vos données
   - Désinstallez l'application
   - Réinstallez depuis le store
   - Reconnectez-vous

## Problèmes mobiles

### Application mobile ne se lance pas

**Diagnostic :**
1. Version iOS/Android compatible ?
2. Espace de stockage suffisant ?
3. Dernière version installée ?

**Solutions :**
1. Redémarrez l'appareil
2. Mettez à jour l'OS
3. Réinstallez l'application
4. Contactez le support avec modèle d'appareil

### Fonctionnalités manquantes

**Vérifications :**
- Version de l'app à jour
- Permissions accordées
- Compte utilisateur activé
- Fonctionnalité disponible pour votre rôle

### Problèmes de batterie

**L'app consomme trop :**
1. Désactivez la géolocalisation continue
2. Réduisez la fréquence de synchronisation
3. Fermez l'app quand non utilisée
4. Activez le mode économie d'énergie

## Codes d'erreur

### Erreurs de connexion

| Code | Message | Solution |
|------|---------|----------|
| E001 | Identifiants incorrects | Vérifiez email/mot de passe |
| E002 | Compte désactivé | Contactez l'administrateur |
| E003 | Session expirée | Reconnectez-vous |
| E004 | Trop de tentatives | Attendez 15 minutes |

### Erreurs de géolocalisation

| Code | Message | Solution |
|------|---------|----------|
| E101 | Géolocalisation refusée | Autorisez l'accès à la position |
| E102 | Position imprécise | Attendez une meilleure précision |
| E103 | Hors zone autorisée | Rapprochez-vous du lieu de travail |
| E104 | GPS indisponible | Activez le GPS |

### Erreurs de pointage

| Code | Message | Solution |
|------|---------|----------|
| E201 | Déjà pointé | Vérifiez votre statut |
| E202 | Pas encore pointé | Pointez l'arrivée d'abord |
| E203 | Hors horaires | Vérifiez l'heure de travail |
| E204 | Pause trop longue | Reprenez le travail |

### Erreurs de synchronisation

| Code | Message | Solution |
|------|---------|----------|
| E301 | Échec de synchronisation | Vérifiez la connexion |
| E302 | Conflit de données | Résolvez le conflit |
| E303 | Données corrompues | Réinitialisez les données |
| E304 | Serveur indisponible | Réessayez plus tard |

## Outils de diagnostic

### Informations système

Pour aider le support, collectez ces informations :

**Application web :**
- Navigateur et version
- Système d'exploitation
- URL de la page
- Message d'erreur exact

**Application mobile :**
- Modèle d'appareil
- Version iOS/Android
- Version de l'application
- Étapes pour reproduire le problème

### Tests de connectivité

1. **Test de ping**
   ```
   ping api.attendancex.com
   ```

2. **Test de résolution DNS**
   ```
   nslookup api.attendancex.com
   ```

3. **Test de port**
   ```
   telnet api.attendancex.com 443
   ```

### Logs de débogage

**Activer les logs (développeurs) :**
1. Ouvrez la console développeur (F12)
2. Onglet "Console"
3. Reproduisez le problème
4. Copiez les messages d'erreur

**Logs mobiles :**
1. Paramètres > Mode développeur
2. Activez les logs détaillés
3. Reproduisez le problème
4. Exportez les logs

## Contact support

### Avant de contacter

Préparez ces informations :
- Description détaillée du problème
- Étapes pour reproduire
- Messages d'erreur exacts
- Captures d'écran si pertinentes
- Informations système

### Canaux de support

**Support utilisateur :**
- 📧 Email : support@votre-entreprise.com
- 📞 Téléphone : 01 23 45 67 89
- 💬 Chat : Dans l'application
- 🕒 Horaires : Lundi-Vendredi 9h-18h

**Support technique :**
- 📧 Email : tech-support@votre-entreprise.com
- 📞 Téléphone : 01 23 45 67 88
- 🔧 Ticket : support.votre-entreprise.com
- 🕒 Horaires : 24h/7j pour urgences

**Support manager :**
- 📧 Email : manager-support@votre-entreprise.com
- 📞 Téléphone : 01 23 45 67 87
- 💼 Priorité : Support dédié managers

### Niveaux de priorité

**Critique (P1) :**
- Système complètement indisponible
- Perte de données
- Problème de sécurité

**Élevé (P2) :**
- Fonctionnalité majeure indisponible
- Impact sur plusieurs utilisateurs
- Problème de performance sévère

**Moyen (P3) :**
- Fonctionnalité mineure affectée
- Impact sur un utilisateur
- Problème d'interface

**Faible (P4) :**
- Demande d'amélioration
- Question générale
- Documentation

### Temps de réponse

| Priorité | Première réponse | Résolution cible |
|----------|------------------|------------------|
| P1 | 1 heure | 4 heures |
| P2 | 4 heures | 24 heures |
| P3 | 24 heures | 72 heures |
| P4 | 72 heures | 1 semaine |

---

*Guide de dépannage - Version 1.0 - Janvier 2024*