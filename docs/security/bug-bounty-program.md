# Programme Bug Bounty - AttendanceX

## Vue d'ensemble

AttendanceX lance un programme de bug bounty pour encourager les chercheurs en sécurité à identifier et signaler les vulnérabilités de manière responsable.

## Portée du Programme

### ✅ Dans la Portée (In Scope)

#### Domaines Couverts
- `*.attendancex.com` (production)
- `staging.attendancex.com` (staging)
- API : `api.attendancex.com`
- Application mobile (iOS/Android)

#### Types de Vulnérabilités Acceptées

**Haute Priorité** :
- Injection SQL/NoSQL
- Authentification cassée
- Exposition de données sensibles
- XXE (XML External Entity)
- Broken Access Control
- Security Misconfiguration
- XSS (Cross-Site Scripting)
- Insecure Deserialization
- CSRF (Cross-Site Request Forgery)
- SSRF (Server-Side Request Forgery)

**Priorité Moyenne** :
- Clickjacking
- Open Redirect
- Information Disclosure
- Missing Security Headers
- Rate Limiting Issues
- Session Management Issues

### ❌ Hors Portée (Out of Scope)

#### Domaines Exclus
- Environnements de développement locaux
- Services tiers (Stripe, Twilio, etc.)
- Attaques physiques
- Social engineering
- Déni de service (DoS/DDoS)

#### Vulnérabilités Non Acceptées
- Spam ou phishing
- Clickjacking sur pages sans données sensibles
- Missing rate limiting (sauf si exploitable)
- Descriptive error messages (sauf si exposent des données sensibles)
- Host header injection sans impact démontrable
- Open ports sans vulnérabilité associée
- SSL/TLS best practices (sauf si vulnérabilité critique)
- Missing cookie flags (sauf si exploitable)
- Vulnerabilities in outdated browsers
- Self-XSS
- Logout CSRF
- Presence of autocomplete attribute on web forms

## Règles d'Engagement

### ✅ Comportement Autorisé

1. **Testing Responsable**
   - Utiliser des comptes de test que vous créez
   - Limiter les tests à vos propres données
   - Respecter les limites de rate limiting

2. **Reporting**
   - Signaler les vulnérabilités dans les 24h
   - Fournir des détails complets et reproductibles
   - Donner 90 jours pour corriger avant divulgation publique

3. **Communication**
   - Communiquer uniquement via security@attendancex.com
   - Utiliser le chiffrement PGP si nécessaire
   - Répondre aux demandes de clarification

### ❌ Comportement Interdit

1. **Ne PAS** :
   - Accéder aux données d'autres utilisateurs
   - Modifier ou supprimer des données
   - Exécuter des attaques DoS/DDoS
   - Spammer ou envoyer des emails non sollicités
   - Exploiter les vulnérabilités au-delà de la PoC
   - Divulguer publiquement avant correction
   - Utiliser des scanners automatisés agressifs

2. **Interdictions Strictes** :
   - Social engineering des employés
   - Attaques physiques
   - Accès non autorisé aux systèmes
   - Violation des lois locales

## Récompenses

### Barème de Récompenses

| Sévérité | Description | Récompense |
|----------|-------------|------------|
| **Critique** | RCE, SQL Injection, Authentication Bypass | 500€ - 2000€ |
| **Haute** | XSS stocké, IDOR avec accès données sensibles | 200€ - 500€ |
| **Moyenne** | XSS réfléchi, CSRF, Information Disclosure | 50€ - 200€ |
| **Basse** | Security misconfiguration, Missing headers | 0€ - 50€ |

### Facteurs de Modulation

**Bonus (+50%)** :
- Première découverte d'une classe de vulnérabilité
- PoC de haute qualité avec code d'exploitation
- Suggestions de correction détaillées
- Impact business démontré

**Réduction (-50%)** :
- Vulnérabilité déjà connue (duplicate)
- PoC incomplet ou non reproductible
- Impact limité ou théorique
- Nécessite interaction utilisateur importante

### Paiement

**Méthodes** :
- Virement bancaire (SEPA)
- PayPal
- Crypto (Bitcoin, Ethereum)

**Délai** : 30 jours après validation et correction

## Processus de Signalement

### 1. Découverte

Vous découvrez une vulnérabilité potentielle.

### 2. Vérification

Vérifiez que :
- ✅ C'est dans la portée
- ✅ C'est reproductible
- ✅ Vous avez une PoC fonctionnelle
- ✅ Vous n'avez pas violé les règles

### 3. Rapport

Envoyez un email à **security@attendancex.com** avec :

```markdown
Sujet: [Bug Bounty] [Sévérité] Titre court

## Résumé
Description en 2-3 phrases

## Sévérité
Critique / Haute / Moyenne / Basse

## Détails Techniques
- URL affectée: https://...
- Type de vulnérabilité: XSS / SQLi / etc.
- Vecteur d'attaque: ...

## Étapes de Reproduction
1. Aller sur https://...
2. Cliquer sur ...
3. Injecter le payload: ...
4. Observer le résultat: ...

## Preuve de Concept (PoC)
```javascript
// Code ou screenshots
```

## Impact
- Données exposées: ...
- Utilisateurs affectés: ...
- Scénario d'exploitation: ...

## Recommandations
- Suggestion de correction
- Références (OWASP, CWE)

## Informations Chercheur
- Nom: [Votre nom ou pseudo]
- Email: [Votre email]
- Méthode de paiement préférée: [Virement/PayPal/Crypto]
```

### 4. Accusé de Réception

Vous recevrez un accusé de réception sous **24 heures**.

### 5. Validation

Notre équipe valide la vulnérabilité (3-7 jours).

**Statuts possibles** :
- ✅ **Accepté** : Vulnérabilité confirmée
- ⚠️ **Informations requises** : Besoin de clarifications
- ❌ **Rejeté** : Hors portée ou non reproductible
- 🔄 **Duplicate** : Déjà signalé

### 6. Correction

Nous corrigeons la vulnérabilité (selon sévérité).

**SLA de correction** :
- Critique : 7 jours
- Haute : 30 jours
- Moyenne : 60 jours
- Basse : 90 jours

### 7. Vérification

Vous vérifiez que la correction est effective.

### 8. Récompense

Nous versons la récompense (30 jours après correction).

### 9. Divulgation (Optionnel)

Après 90 jours, divulgation publique possible (coordonnée).

## Hall of Fame

Nous reconnaissons publiquement les chercheurs (avec leur accord).

### Top Contributors 2024

| Chercheur | Vulnérabilités | Récompense Totale |
|-----------|----------------|-------------------|
| [Nom] | 5 | 3500€ |
| [Nom] | 3 | 1200€ |
| [Nom] | 2 | 800€ |

### Dernières Découvertes

| Date | Chercheur | Vulnérabilité | Sévérité |
|------|-----------|---------------|----------|
| 2024-01 | [Nom] | SQL Injection | Critique |
| 2024-01 | [Nom] | XSS Stored | Haute |

## Exemples de Rapports

### Exemple 1 : SQL Injection (Critique)

```markdown
Sujet: [Bug Bounty] [Critique] SQL Injection dans l'API de recherche

## Résumé
L'endpoint /api/search est vulnérable à une injection SQL permettant 
l'extraction de données sensibles de la base de données.

## Sévérité
Critique

## Détails Techniques
- URL: https://api.attendancex.com/api/search
- Paramètre: query
- Type: SQL Injection (Error-based)

## Étapes de Reproduction
1. Envoyer une requête POST à /api/search
2. Injecter le payload: `' OR '1'='1' --`
3. Observer la réponse contenant toutes les données

## PoC
```bash
curl -X POST https://api.attendancex.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "' OR '1'='1' --"}'
```

## Impact
- Accès à toutes les données utilisateurs
- Extraction de mots de passe hashés
- Modification potentielle de données

## Recommandations
- Utiliser des requêtes paramétrées
- Valider et sanitiser les entrées
- Implémenter un WAF
```

### Exemple 2 : XSS (Haute)

```markdown
Sujet: [Bug Bounty] [Haute] XSS Stocké dans les descriptions d'événements

## Résumé
Un XSS stocké est possible dans le champ description des événements,
permettant l'exécution de JavaScript arbitraire.

## Sévérité
Haute

## Détails Techniques
- URL: https://attendancex.com/events/create
- Champ: description
- Type: Stored XSS

## Étapes de Reproduction
1. Créer un événement
2. Dans la description, injecter: `<script>alert(document.cookie)</script>`
3. Sauvegarder l'événement
4. Visiter la page de l'événement
5. Le script s'exécute

## PoC
[Screenshot montrant l'alerte]

## Impact
- Vol de cookies de session
- Phishing des utilisateurs
- Redirection malveillante

## Recommandations
- Sanitiser les entrées HTML (DOMPurify)
- Implémenter une CSP stricte
- Encoder les sorties
```

## FAQ

### Q: Puis-je utiliser des outils automatisés ?
**R:** Oui, mais avec modération. Les scans agressifs sont interdits.

### Q: Que se passe-t-il si je trouve une vulnérabilité critique ?
**R:** Signalez-la immédiatement. Nous priorisons les corrections critiques.

### Q: Puis-je rester anonyme ?
**R:** Oui, vous pouvez utiliser un pseudonyme.

### Q: Combien de temps pour recevoir la récompense ?
**R:** 30 jours après validation et correction.

### Q: Puis-je divulguer publiquement ?
**R:** Oui, après 90 jours et coordination avec nous.

### Q: Que faire si ma soumission est rejetée ?
**R:** Vous pouvez demander des clarifications ou soumettre des preuves supplémentaires.

## Contact

### Email Principal
**security@attendancex.com**

### PGP Key
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[Votre clé PGP publique]
-----END PGP PUBLIC KEY BLOCK-----
```

### Réseaux Sociaux
- Twitter: @AttendanceXSec
- LinkedIn: AttendanceX Security Team

## Ressources

### Pour les Chercheurs
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackerOne Resources](https://www.hackerone.com/resources)

### Documentation API
- [API Documentation](https://docs.attendancex.com/api)
- [OpenAPI Spec](https://api.attendancex.com/openapi.yaml)

## Mises à Jour du Programme

### Changelog

**v1.0 - 2024-01**
- Lancement initial du programme
- Portée: Production et Staging
- Récompenses: 50€ - 2000€

---

**Version** : 1.0  
**Dernière mise à jour** : [Date]  
**Contact** : security@attendancex.com
