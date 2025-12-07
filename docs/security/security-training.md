# Programme de Formation Sécurité - AttendanceX

## Vue d'ensemble

Ce document définit le programme de formation en sécurité pour tous les membres de l'équipe AttendanceX.

## Objectifs

1. **Sensibiliser** l'équipe aux risques de sécurité
2. **Former** aux bonnes pratiques de développement sécurisé
3. **Prévenir** les incidents de sécurité
4. **Maintenir** une culture de sécurité forte

## Public Cible

| Rôle | Formation Requise | Fréquence |
|------|-------------------|-----------|
| Développeurs | Secure Coding, OWASP Top 10 | Trimestrielle |
| DevOps | Infrastructure Security, Incident Response | Trimestrielle |
| Product Managers | Security Awareness, RGPD | Semestrielle |
| Support | Data Protection, Phishing | Semestrielle |
| Tous | Security Awareness Générale | Annuelle |

## Modules de Formation

### Module 1 : Security Awareness (Tous)

**Durée** : 2 heures  
**Format** : E-learning + Quiz  
**Fréquence** : Annuelle

#### Contenu
1. **Introduction à la Sécurité**
   - Pourquoi la sécurité est importante
   - Coût des violations de données
   - Responsabilités individuelles

2. **Menaces Courantes**
   - Phishing et social engineering
   - Malware et ransomware
   - Ingénierie sociale
   - Attaques par mot de passe

3. **Bonnes Pratiques**
   - Mots de passe forts et uniques
   - Authentification à deux facteurs
   - Sécurité des emails
   - Sécurité physique
   - Travail à distance sécurisé

4. **Que Faire en Cas d'Incident**
   - Reconnaître un incident
   - Signaler immédiatement
   - Ne pas paniquer
   - Préserver les preuves

#### Quiz Final
- 20 questions
- Score minimum : 80%
- Certificat de completion

### Module 2 : OWASP Top 10 (Développeurs)

**Durée** : 4 heures  
**Format** : Atelier pratique  
**Fréquence** : Trimestrielle

#### Contenu

**Session 1 : Injection et Broken Access Control (1h)**
```typescript
// ❌ Mauvais : Vulnérable à l'injection
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// ✅ Bon : Requête paramétrée
const query = db.collection('users').where('email', '==', userInput);

// ❌ Mauvais : Pas de vérification d'accès
app.get('/api/events/:id', async (req, res) => {
  const event = await getEvent(req.params.id);
  res.json(event);
});

// ✅ Bon : Vérification d'accès
app.get('/api/events/:id', authenticate, checkPermission('event', 'view'), async (req, res) => {
  const event = await getEvent(req.params.id);
  res.json(event);
});
```

**Session 2 : Cryptographie et Authentication (1h)**
```typescript
// ❌ Mauvais : Mot de passe en clair
const user = { password: userInput };

// ✅ Bon : Hash avec bcrypt
const user = { 
  password: await bcrypt.hash(userInput, 12) 
};

// ❌ Mauvais : JWT sans expiration
const token = jwt.sign({ userId }, SECRET);

// ✅ Bon : JWT avec expiration courte
const token = jwt.sign({ userId }, SECRET, { expiresIn: '15m' });
```

**Session 3 : XSS et CSRF (1h)**
```typescript
// ❌ Mauvais : Insertion HTML directe
element.innerHTML = userInput;

// ✅ Bon : Sanitisation
element.innerHTML = DOMPurify.sanitize(userInput);

// ❌ Mauvais : Pas de protection CSRF
app.post('/api/transfer', async (req, res) => {
  await transferMoney(req.body);
});

// ✅ Bon : Token CSRF
app.post('/api/transfer', csrfProtection, async (req, res) => {
  await transferMoney(req.body);
});
```

**Session 4 : Exercices Pratiques (1h)**
- Identifier et corriger des vulnérabilités
- Code review en groupe
- Capture The Flag (CTF) simplifié

#### Évaluation
- Exercices pratiques
- Code review
- Mini-projet sécurisé

### Module 3 : Secure Coding Practices (Développeurs)

**Durée** : 3 heures  
**Format** : Atelier + Code Review  
**Fréquence** : Trimestrielle

#### Contenu

**1. Validation des Entrées**
```typescript
import { z } from 'zod';

// Définir un schéma strict
const userSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(2).max(100),
  age: z.number().int().min(18).max(120)
});

// Valider avant traitement
try {
  const validData = userSchema.parse(userInput);
  // Traiter les données validées
} catch (error) {
  // Gérer l'erreur de validation
}
```

**2. Gestion des Secrets**
```typescript
// ❌ Mauvais : Secret en dur
const apiKey = 'sk_live_abc123';

// ❌ Mauvais : Secret dans .env commité
// .env (dans Git)
API_KEY=sk_live_abc123

// ✅ Bon : Secret Manager
const apiKey = await secretManager.getSecret('stripe-api-key');

// ✅ Bon : Variables d'environnement (non commitées)
const apiKey = process.env.STRIPE_API_KEY;
```

**3. Logging Sécurisé**
```typescript
// ❌ Mauvais : Logger des données sensibles
logger.info('User login', { email, password });

// ✅ Bon : Logger sans données sensibles
logger.info('User login', { 
  email: maskEmail(email),
  userId: user.id 
});

// ❌ Mauvais : Stack trace en production
catch (error) {
  res.status(500).json({ error: error.stack });
}

// ✅ Bon : Message générique en production
catch (error) {
  logger.error('Error', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

**4. Gestion des Erreurs**
```typescript
// ❌ Mauvais : Erreur détaillée exposée
catch (error) {
  res.status(500).json({ 
    error: error.message,
    query: sqlQuery,
    stack: error.stack 
  });
}

// ✅ Bon : Erreur générique
catch (error) {
  logger.error('Database error', { error, userId });
  res.status(500).json({ 
    error: 'An error occurred' 
  });
}
```

#### Exercices
- Code review d'un PR avec vulnérabilités
- Refactoring de code non sécurisé
- Création d'un checklist de sécurité

### Module 4 : RGPD et Protection des Données (Tous)

**Durée** : 2 heures  
**Format** : Présentation + Cas pratiques  
**Fréquence** : Annuelle

#### Contenu

**1. Principes du RGPD**
- Licéité, loyauté, transparence
- Limitation des finalités
- Minimisation des données
- Exactitude
- Limitation de la conservation
- Intégrité et confidentialité

**2. Droits des Utilisateurs**
- Droit d'accès
- Droit de rectification
- Droit à l'effacement ("droit à l'oubli")
- Droit à la portabilité
- Droit d'opposition

**3. Obligations de l'Entreprise**
- Consentement explicite
- Notification de violation (72h)
- Privacy by design
- DPO (Data Protection Officer)
- Registre des traitements

**4. Cas Pratiques**
- Traiter une demande d'accès aux données
- Gérer une demande de suppression
- Répondre à une violation de données

### Module 5 : Incident Response (DevOps, Leads)

**Durée** : 3 heures  
**Format** : Simulation + Exercice  
**Fréquence** : Semestrielle

#### Contenu

**1. Phases de Réponse**
- Détection
- Évaluation
- Confinement
- Éradication
- Récupération
- Post-mortem

**2. Rôles et Responsabilités**
- Incident Commander
- Security Lead
- Communications Lead
- Technical Lead

**3. Simulation d'Incident**

**Scénario** : Data breach détecté

**Timeline** :
```
09:00 - Alerte : Activité suspecte détectée
09:05 - Votre action ?
09:15 - Nouvelle information : 1000 comptes affectés
09:20 - Votre action ?
09:30 - Médias contactent l'entreprise
09:35 - Votre action ?
```

**Débriefing** :
- Qu'avez-vous bien fait ?
- Qu'auriez-vous pu améliorer ?
- Leçons apprises

### Module 6 : Infrastructure Security (DevOps)

**Durée** : 4 heures  
**Format** : Atelier pratique  
**Fréquence** : Trimestrielle

#### Contenu

**1. Sécurité Cloud (GCP)**
```bash
# IAM : Principe du moindre privilège
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"  # Pas roles/owner !

# Firewall : Règles strictes
gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --target-tags https-server

# Secrets : Secret Manager
gcloud secrets create db-password \
  --data-file=- < password.txt
```

**2. Container Security**
```dockerfile
# ❌ Mauvais : Image root, packages inutiles
FROM node:18
RUN apt-get update && apt-get install -y curl vim
COPY . /app
CMD ["node", "server.js"]

# ✅ Bon : Image minimale, non-root
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
WORKDIR /app
COPY --chown=nodejs:nodejs . .
USER nodejs
CMD ["node", "server.js"]
```

**3. CI/CD Security**
```yaml
# .github/workflows/deploy.yml
- name: Scan for secrets
  run: |
    docker run --rm -v $(pwd):/src trufflesecurity/trufflehog \
      filesystem /src --fail

- name: Scan dependencies
  run: npm audit --audit-level=high

- name: Scan container
  run: |
    docker scan $IMAGE_NAME --severity high
```

**4. Monitoring et Alertes**
```typescript
// Alertes de sécurité
export function setupSecurityAlerts() {
  // Alerte sur tentatives de login échouées
  if (failedLoginAttempts > 5) {
    sendAlert('Multiple failed login attempts', 'high');
  }
  
  // Alerte sur accès non autorisé
  if (accessDeniedCount > 10) {
    sendAlert('Unusual access denied pattern', 'medium');
  }
}
```

## Calendrier de Formation 2024

| Mois | Formation | Public | Format |
|------|-----------|--------|--------|
| Janvier | Security Awareness | Tous | E-learning |
| Février | OWASP Top 10 | Développeurs | Atelier |
| Mars | Infrastructure Security | DevOps | Atelier |
| Avril | RGPD | Tous | Présentation |
| Mai | Secure Coding | Développeurs | Code Review |
| Juin | Incident Response | Leads | Simulation |
| Juillet | OWASP Top 10 | Développeurs | Atelier |
| Août | - | - | Pause estivale |
| Septembre | Security Awareness | Nouveaux | E-learning |
| Octobre | Secure Coding | Développeurs | Atelier |
| Novembre | Infrastructure Security | DevOps | Atelier |
| Décembre | Incident Response | Tous | Simulation |

## Ressources de Formation

### Plateformes E-learning
- [OWASP WebGoat](https://owasp.org/www-project-webgoat/) - Pratique des vulnérabilités
- [PortSwigger Academy](https://portswigger.net/web-security) - Web security gratuit
- [HackTheBox](https://www.hackthebox.com/) - Challenges pratiques
- [TryHackMe](https://tryhackme.com/) - Parcours guidés

### Certifications Recommandées
- **OSCP** (Offensive Security Certified Professional)
- **CEH** (Certified Ethical Hacker)
- **CISSP** (Certified Information Systems Security Professional)
- **Security+** (CompTIA)

### Livres
- "The Web Application Hacker's Handbook" - Stuttard & Pinto
- "OWASP Testing Guide v4"
- "Secure Coding in C and C++" - Seacord
- "The Phoenix Project" - Kim, Behr & Spafford

### Conférences
- **OWASP AppSec** (Annuelle)
- **Black Hat** (Annuelle)
- **DEF CON** (Annuelle)
- **RSA Conference** (Annuelle)

## Évaluation et Suivi

### Métriques de Formation

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Taux de completion | 100% | - |
| Score moyen quiz | > 80% | - |
| Satisfaction | > 4/5 | - |
| Incidents évités | Mesure qualitative | - |

### Suivi Individuel

Chaque membre de l'équipe a un profil de formation :

```markdown
## Profil de Formation - [Nom]

### Formations Complétées
- [x] Security Awareness (2024-01)
- [x] OWASP Top 10 (2024-02)
- [ ] Secure Coding (À venir)

### Certifications
- [ ] Security+ (En cours)

### Prochaines Formations
- Secure Coding - Mai 2024
- Incident Response - Juin 2024

### Notes
- Intérêt particulier pour la cryptographie
- Souhaite approfondir les tests de pénétration
```

## Gamification

### Système de Points

| Action | Points |
|--------|--------|
| Compléter une formation | 100 |
| Obtenir une certification | 500 |
| Identifier une vulnérabilité | 200 |
| Contribuer à la sécurité | 50 |
| Participer à un CTF | 150 |

### Badges

- 🏆 **Security Champion** : 1000 points
- 🛡️ **Defender** : Identifier 5 vulnérabilités
- 🔍 **Bug Hunter** : Participer au bug bounty
- 📚 **Scholar** : Compléter toutes les formations
- 🎓 **Certified** : Obtenir une certification

### Leaderboard

| Rang | Nom | Points | Badges |
|------|-----|--------|--------|
| 1 | [Nom] | 1250 | 🏆🛡️🔍 |
| 2 | [Nom] | 980 | 🛡️📚 |
| 3 | [Nom] | 750 | 🔍📚 |

## Budget Formation

### Coûts Estimés (Annuel)

| Poste | Coût |
|-------|------|
| Plateformes e-learning | 2000€ |
| Certifications (3 personnes) | 4500€ |
| Conférences (2 personnes) | 6000€ |
| Formateur externe (2 jours) | 3000€ |
| Matériel pédagogique | 500€ |
| **Total** | **16000€** |

## Contact

**Responsable Formation Sécurité** : [Nom]  
**Email** : training@attendancex.com  
**Slack** : #security-training

---

**Version** : 1.0  
**Dernière mise à jour** : [Date]  
**Prochaine revue** : [Date + 6 mois]
