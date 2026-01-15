# Configuration du Générateur d'Événements IA

Ce guide explique comment configurer et utiliser le générateur d'événements basé sur l'intelligence artificielle.

## Prérequis

### 1. Clé API OpenAI
- Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
- Générez une clé API dans la section "API Keys"
- Ajoutez des crédits à votre compte (minimum 5$ recommandé pour les tests)

### 2. Configuration Backend

1. **Variables d'environnement**
   ```bash
   cd backend/functions
   cp .env.example .env
   ```

2. **Ajoutez votre clé OpenAI**
   ```env
   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Installez les dépendances**
   ```bash
   npm install openai
   ```

### 3. Démarrage des Services

1. **Backend (Terminal 1)**
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend (Terminal 2)**
   ```bash
   cd frontend-v2
   npm run dev
   ```

## Utilisation

### 1. Accès à l'Interface
- Connectez-vous à l'application
- Naviguez vers "IA & Automatisation" → "Générateur d'événements"
- URL directe : `http://localhost:3000/app/ai/event-generator`

### 2. Génération d'Événements

**Exemples de prompts :**

```
Organise un brunch d'équipe pour 20 personnes samedi prochain avec un budget de 500€
```

```
Conférence tech sur l'IA pour 100 participants, 2 jours, avec speakers internationaux
```

```
Mariage en extérieur pour 80 invités en juin, style champêtre, budget 15000€
```

```
Atelier de formation React pour développeurs, 1 journée, 15 participants maximum
```

### 3. Fonctionnalités

- **Génération instantanée** : Événement complet en ~30 secondes
- **Tâches automatiques** : Liste des tâches avec priorités et délais
- **Estimation budget** : Fourchette de prix réaliste
- **Suggestions** : Lieux, améliorations, alternatives
- **Création directe** : Transformation en événement réel

## API Endpoints

### Génération d'Événement
```http
POST /api/ai/events/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "naturalLanguageInput": "Organise un brunch pour 20 personnes",
  "preferences": {
    "defaultBudget": 500,
    "preferredVenues": ["Restaurant", "Café"],
    "defaultDuration": 120
  }
}
```

### Création d'Événement
```http
POST /api/ai/events/create-from-generated
Authorization: Bearer <token>
Content-Type: application/json

{
  "generatedEventData": {
    "title": "Brunch d'équipe",
    "description": "...",
    // ... autres données générées
  }
}
```

### Test de Connexion
```http
GET /api/ai/events/test-connection
Authorization: Bearer <token>
```

## Modèles IA Utilisés

### GPT-4 Turbo Preview
- **Modèle** : `gpt-4-turbo-preview`
- **Température** : 0.7 (équilibre créativité/précision)
- **Tokens max** : 2000
- **Format** : JSON structuré

### Coût Estimé
- **Par génération** : ~0.02-0.05€
- **100 générations** : ~2-5€
- **Usage mensuel moyen** : 10-50€ selon utilisation

## Dépannage

### Erreur "OpenAI API Key not found"
```bash
# Vérifiez la variable d'environnement
echo $OPENAI_API_KEY

# Redémarrez les émulateurs Firebase
firebase emulators:kill
firebase emulators:start
```

### Erreur "Rate limit exceeded"
- Attendez quelques minutes
- Vérifiez vos crédits OpenAI
- Réduisez la fréquence des tests

### Erreur "Model not found"
- Vérifiez que votre compte OpenAI a accès à GPT-4
- Utilisez GPT-3.5-turbo en fallback si nécessaire

### Génération lente (>60s)
- Vérifiez votre connexion internet
- Réduisez la complexité du prompt
- Vérifiez les logs OpenAI

## Monitoring

### Logs Backend
```bash
# Logs des fonctions Firebase
firebase functions:log

# Logs spécifiques IA
grep "🤖\|✅\|❌" firebase-debug.log
```

### Métriques OpenAI
- Consultez [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Surveillez les coûts et quotas
- Configurez des alertes de budget

## Développement

### Ajout de Nouveaux Types d'Événements
1. Modifiez `openai.service.ts` → `buildSystemPrompt()`
2. Ajoutez les types dans les interfaces TypeScript
3. Mettez à jour les suggestions dans `event-generator.service.ts`

### Amélioration des Prompts
1. Testez avec différents exemples
2. Analysez les réponses générées
3. Ajustez la température et les instructions
4. Validez avec des utilisateurs réels

### Tests Automatisés
```bash
# Tests unitaires
npm run test:backend -- --grep "AI"

# Tests d'intégration
npm run test:integration -- ai-event-generation
```

## Roadmap

### Phase 1 (Actuelle)
- ✅ Génération basique d'événements
- ✅ Interface utilisateur
- ✅ Création d'événements réels

### Phase 2 (Prochaine)
- 🔄 Raffinement d'événements existants
- 🔄 Templates personnalisés
- 🔄 Intégration avec calendriers externes

### Phase 3 (Future)
- 📋 Prédictions d'affluence
- 📋 Optimisation automatique des ressources
- 📋 Marketplace de prestataires
- 📋 Protocole UECAP

## Support

- **Documentation** : `/docs/ai/`
- **Issues** : GitHub Issues
- **Discord** : Canal #ai-features
- **Email** : support@attendancex.com