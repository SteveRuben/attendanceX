# Monitoring

Surveillance et métriques du système.

## Outils de monitoring

### Google Cloud Monitoring
- **Métriques** : CPU, mémoire, latence
- **Alertes** : Notifications automatiques
- **Dashboards** : Tableaux de bord personnalisés

### Firebase Performance
- **Web Vitals** : Métriques de performance web
- **Network Requests** : Surveillance des requêtes
- **Custom Traces** : Traces personnalisées

### Cloud Logging
- **Logs centralisés** : Tous les services
- **Filtrage** : Recherche avancée
- **Export** : BigQuery pour analyse

## Métriques clés

### Performance
- **Response Time** : < 200ms (P95)
- **Availability** : > 99.9%
- **Error Rate** : < 0.1%

### Business
- **Active Users** : Utilisateurs actifs quotidiens
- **Presence Records** : Enregistrements de présence
- **API Calls** : Appels API par minute

### Infrastructure
- **Function Invocations** : Invocations de fonctions
- **Database Reads/Writes** : Opérations Firestore
- **Storage Usage** : Utilisation du stockage

## Alertes

### Critiques
- Service indisponible (> 5 minutes)
- Taux d'erreur élevé (> 5%)
- Latence excessive (> 2 secondes)

### Warnings
- Utilisation élevée des ressources (> 80%)
- Taux d'erreur modéré (> 1%)
- Latence élevée (> 1 seconde)

## Dashboards

### Operational Dashboard
- État des services
- Métriques en temps réel
- Alertes actives

### Business Dashboard
- KPIs métier
- Tendances d'usage
- Rapports de performance