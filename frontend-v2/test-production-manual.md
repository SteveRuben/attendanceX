# Tests Manuels Production - AttendanceX

## 🎯 URL de Production
**https://attendance-x.vercel.app**

## ✅ Checklist de Tests Manuels

### 1. Homepage (/)
- [ ] Page charge en < 3 secondes
- [ ] Logo AttendanceX visible
- [ ] Navigation fonctionne
- [ ] Bouton "Get Started" fonctionne
- [ ] Hero section avec titre visible
- [ ] Stats section affichée
- [ ] Feature cards visibles (6 cards)
- [ ] Pricing section fonctionne
- [ ] Toggle Monthly/Yearly fonctionne
- [ ] Footer complet
- [ ] Pas d'erreurs console (F12)
- [ ] Responsive mobile (DevTools)
- [ ] Dark mode fonctionne (si disponible)

### 2. Events Discovery (/events)
- [ ] Page charge correctement
- [ ] Hero avec titre "Découvrez des Événements"
- [ ] Barre de recherche visible
- [ ] Bouton "Filtres" fonctionne
- [ ] Panel de filtres s'ouvre/ferme
- [ ] Filtres par catégorie fonctionnent
- [ ] Filtres par lieu fonctionnent
- [ ] Filtres par prix fonctionnent
- [ ] Tri fonctionne (date, popularité, etc.)
- [ ] Events cards affichées
- [ ] Pagination fonctionne
- [ ] Compteur d'événements correct
- [ ] Clic sur event card → event detail
- [ ] Responsive mobile
- [ ] Pas d'erreurs console

### 3. Event Detail (/events/[slug])
- [ ] Page charge avec cover image
- [ ] Titre de l'événement visible
- [ ] Informations organisateur
- [ ] Date et heure affichées
- [ ] Lieu affiché
- [ ] Description complète
- [ ] Tags affichés
- [ ] Bouton "S'inscrire" visible
- [ ] Card de prix visible
- [ ] Boutons Partager/Sauvegarder
- [ ] Informations sidebar complètes
- [ ] Card organisateur cliquable
- [ ] Événements similaires (si disponibles)
- [ ] Responsive mobile
- [ ] Pas d'erreurs console

### 4. Organizer Profile (/organizers/[slug])
- [ ] Page charge avec cover image
- [ ] Avatar organisateur visible
- [ ] Nom et badge vérifié
- [ ] Stats cards (4 cards)
- [ ] Localisation affichée
- [ ] Note moyenne visible
- [ ] Section "À propos" complète
- [ ] Tabs "À venir" / "Passés"
- [ ] Events de l'organisateur affichés
- [ ] Sidebar contact fonctionnel
- [ ] Liens réseaux sociaux (si disponibles)
- [ ] Bouton "Contacter" visible
- [ ] CTA "Créer un compte" fonctionne
- [ ] Responsive mobile
- [ ] Pas d'erreurs console

### 5. Navigation Globale
- [ ] Logo cliquable → homepage
- [ ] Menu "Events" → /events
- [ ] Menu "Pricing" → /pricing
- [ ] Bouton "Login" → /auth/login
- [ ] Bouton "Get Started" → /auth/register
- [ ] Menu mobile fonctionne (< 768px)
- [ ] Footer links fonctionnent
- [ ] Transitions smooth
- [ ] Pas de flash de contenu

### 6. Design & UX
- [ ] Police Inter appliquée partout
- [ ] Couleurs slate cohérentes
- [ ] Pas de gradients bleu/indigo (remplacés par slate)
- [ ] Espacements cohérents
- [ ] Hover states fonctionnent
- [ ] Focus states visibles (Tab navigation)
- [ ] Animations smooth
- [ ] Pas de layout shifts (CLS)
- [ ] Images chargent correctement
- [ ] Icons Lucide affichés

### 7. Performance
- [ ] Lighthouse Score > 80
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 3s
- [ ] Time to Interactive < 4s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Pas de requêtes bloquantes
- [ ] Images optimisées
- [ ] Fonts chargent rapidement

### 8. SEO & Meta Tags
- [ ] Title tag présent sur chaque page
- [ ] Meta description présente
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Twitter Card tags
- [ ] Canonical URL
- [ ] Favicon visible
- [ ] Sitemap accessible (si disponible)
- [ ] robots.txt accessible

### 9. Accessibilité
- [ ] Navigation au clavier fonctionne (Tab)
- [ ] Focus visible sur éléments interactifs
- [ ] Alt text sur images
- [ ] ARIA labels présents
- [ ] Contraste texte suffisant (WCAG AA)
- [ ] Headings hiérarchie correcte (h1, h2, h3)
- [ ] Formulaires avec labels
- [ ] Boutons avec texte descriptif

### 10. Erreurs & Edge Cases
- [ ] Page 404 fonctionne (/page-inexistante)
- [ ] Event inexistant → 404 ou message
- [ ] Organizer inexistant → 404 ou message
- [ ] Recherche sans résultats → empty state
- [ ] Filtres sans résultats → empty state
- [ ] Slow 3G simulation fonctionne
- [ ] Offline mode (si PWA)

## 🐛 Bugs Trouvés

### Template de Bug Report
```markdown
**Page:** [URL]
**Navigateur:** Chrome/Firefox/Safari [Version]
**Device:** Desktop/Mobile/Tablet
**Résolution:** 1920x1080 / 375x667 / etc.

**Description:**
[Description claire du bug]

**Steps to Reproduce:**
1. Aller sur [URL]
2. Cliquer sur [élément]
3. Observer [comportement]

**Expected:**
[Comportement attendu]

**Actual:**
[Comportement observé]

**Screenshot:**
[Lien ou capture d'écran]

**Console Errors:**
```
[Erreurs console si présentes]
```

**Priority:** Critical / High / Medium / Low
```

## 📊 Résultats des Tests

### Date: [À remplir]
### Testeur: [À remplir]

| Catégorie | Tests Passés | Tests Échoués | Taux de Réussite |
|-----------|--------------|---------------|------------------|
| Homepage | /13 | /13 | % |
| Events Discovery | /15 | /15 | % |
| Event Detail | /14 | /14 | % |
| Organizer Profile | /14 | /14 | % |
| Navigation | /9 | /9 | % |
| Design & UX | /10 | /10 | % |
| Performance | /7 | /7 | % |
| SEO | /8 | /8 | % |
| Accessibilité | /9 | /9 | % |
| Erreurs | /7 | /7 | % |
| **TOTAL** | /106 | /106 | % |

## 🎯 Actions Requises

### Bugs Critiques (À corriger immédiatement)
1. [À remplir]

### Bugs Haute Priorité (Cette semaine)
1. [À remplir]

### Améliorations (Ce mois)
1. [À remplir]

## 📝 Notes Additionnelles

[Observations générales, suggestions, commentaires]

---

**Prochaine révision:** [Date]
**Status:** ✅ Validé / ⚠️ Avec réserves / ❌ À corriger
