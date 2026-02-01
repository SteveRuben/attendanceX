# Instructions Kiro - Application de Gestion d'Événements

## Vue d'ensemble du projet
Créer une application web moderne de gestion d'événements avec un design épuré et professionnel, permettant aux utilisateurs de découvrir, gérer et participer à des événements selon leur localisation.

---

## 1. STRUCTURE GÉNÉRALE DE L'APPLICATION

### Page d'accueil / Dashboard principal
- **En-tête (Header)**
  - Logo de l'application en haut à gauche
  - Barre de recherche centrale avec icône de recherche et placeholder "Rechercher un événement..."
  - Menu de navigation horizontal : Accueil, Événements, Mes événements, Favoris, Paramètres
  - Icônes utilisateur à droite : notifications (avec badge numérique), profil avec avatar circulaire
  - Bouton CTA principal : "Créer un événement" (couleur accent, style bouton primaire)

- **Section de localisation**
  - Sélecteur de ville avec icône de localisation
  - Bouton "Près de moi" avec icône GPS pour géolocalisation
  - Affichage de la distance des événements par rapport à la position actuelle
  - Filtre de rayon : 5km, 10km, 25km, 50km, 100km+

- **Barre latérale gauche (Sidebar)**
  - Navigation principale avec icônes :
    - Dashboard (icône graphique)
    - Tous les événements (icône calendrier)
    - Événements à venir (icône horloge)
    - Mes événements (icône utilisateur)
    - Événements favoris (icône cœur)
    - Billets (icône ticket)
    - Statistiques (icône graphique)
  - Indicateur visuel de la page active (couleur accent, barre verticale ou fond)
  - Version compacte possible avec icônes seules

---

## 2. PALETTE DE COULEURS ET DESIGN SYSTEM

### Couleurs principales
- **Couleur primaire** : Bleu moderne (#4F46E5 ou équivalent indigo/violet)
- **Couleur secondaire** : Couleur d'accent vive (orange/corail #F59E0B ou rose #EC4899)
- **Arrière-plan** : Gris très clair (#F9FAFB) pour contraste doux
- **Cartes** : Blanc (#FFFFFF) avec ombres légères (box-shadow)
- **Texte principal** : Gris foncé (#1F2937)
- **Texte secondaire** : Gris moyen (#6B7280)
- **Bordures** : Gris très clair (#E5E7EB)

### Typographie
- **Police principale** : Inter, SF Pro, ou Poppins (sans-serif moderne)
- **Titres H1** : 32-36px, font-weight 700
- **Titres H2** : 24-28px, font-weight 600
- **Titres H3** : 18-20px, font-weight 600
- **Corps de texte** : 14-16px, font-weight 400
- **Petits textes** : 12-14px, font-weight 400

### Espacements
- Padding des cartes : 20-24px
- Gap entre éléments : 16-20px
- Marges sections : 32-40px
- Border-radius : 12-16px pour cartes, 8px pour boutons

---

## 3. PAGE LISTE DES ÉVÉNEMENTS

### Filtres et recherche
- **Barre de filtres horizontale** au-dessus de la liste :
  - Catégories (musique, sport, conférence, festival, etc.) avec badges cliquables
  - Filtre par date : "Aujourd'hui", "Cette semaine", "Ce mois-ci", "Personnalisé"
  - Filtre par prix : "Gratuit", "Payant", "Toutes gammes"
  - Tri : "Plus récents", "Plus populaires", "Prix croissant/décroissant", "Distance"
  
- **Compteur de résultats** : "142 événements trouvés à Montréal"

### Grille d'événements
**Disposition** : Grille 3 colonnes sur desktop, 2 sur tablette, 1 sur mobile

**Chaque carte d'événement contient** :
- Image de couverture (ratio 16:9) avec coins arrondis en haut
- Badge catégorie en overlay sur l'image (coin supérieur gauche)
- Badge de distance "À 2.5 km" (coin supérieur droit)
- Date et heure avec icône calendrier (format : "Mar. 15 Fév • 19h00")
- Titre de l'événement (2 lignes max, ellipsis)
- Lieu avec icône de localisation (1 ligne, ellipsis)
- Nombre de participants avec icône utilisateurs ("245 participants")
- Prix en évidence (badge coloré ou texte bold) : "Gratuit" ou "À partir de 25€"
- Bouton d'action : "S'inscrire" ou "Voir détails"
- Icône favori (cœur) en haut à droite pour sauvegarder
- Au survol : légère élévation (shadow), effet de zoom subtil sur l'image

---

## 4. PAGE DÉTAILS D'UN ÉVÉNEMENT

### En-tête de l'événement
- Grande image de bannière (hero) en haut
- Overlay gradient pour le texte
- Retour arrière (flèche) en haut à gauche
- Boutons d'action en haut à droite : Partager, Favoris
- Badge de catégorie
- Titre de l'événement (grand, bold)
- Organisateur avec avatar et nom

### Informations principales (layout 2 colonnes)

**Colonne gauche (70%)** :
- **Section Description**
  - Texte complet de description
  - "Lire plus/moins" si texte long
  
- **Section Détails**
  - Date et heure avec icône
  - Lieu complet avec icône de map
  - Carte interactive (Google Maps ou équivalent)
  - Bouton "Itinéraire"
  
- **Section Programme/Agenda**
  - Timeline verticale avec heures
  - Points de programme avec descriptions
  
- **Section Organisateur**
  - Photo, nom, bio
  - Bouton "Suivre"
  - Statistiques : événements créés, abonnés

**Colonne droite (30%)** - Carte sticky :
- **Carte de réservation**
  - Prix mis en évidence
  - Nombre de billets disponibles
  - Sélecteur de quantité
  - Types de billets (si plusieurs)
  - Bouton CTA principal "Réserver maintenant"
  - Date limite de réservation
  
- **Événements similaires**
  - Mini-cartes avec 3-4 suggestions
  - "Voir plus"

---

## 5. DASHBOARD UTILISATEUR ("MES ÉVÉNEMENTS")

### Statistiques en haut (Cards horizontales)
- **Événements créés** : Nombre avec icône
- **Événements à venir** : Nombre avec icône
- **Total participants** : Somme avec icône
- **Revenus totaux** : Montant avec icône (si applicable)

Chaque card avec :
- Couleur de fond légère différente
- Icône à gauche
- Valeur principale en grand
- Label en petit texte
- Indicateur de tendance (flèche ↑ ou ↓) avec pourcentage

### Onglets de navigation
- "Tous mes événements"
- "Événements actifs"
- "Événements passés"
- "Brouillons"

### Liste/Tableau d'événements
**Colonnes** :
- Image miniature
- Nom de l'événement
- Date
- Statut (badge coloré : "En cours", "Terminé", "Annulé")
- Participants (nombre/capacité)
- Ventes (si applicable)
- Actions (menu à 3 points : Modifier, Dupliquer, Supprimer, Voir statistiques)

**Vue alternative** : Possibilité de basculer entre vue liste et vue cartes

---

## 6. FORMULAIRE CRÉATION D'ÉVÉNEMENT

### Étapes du formulaire (Stepper en haut)
1. Informations de base
2. Détails et description
3. Billets et tarification
4. Paramètres et publication

### Étape 1 : Informations de base
- Upload image de couverture (drag & drop zone)
- Titre de l'événement (input large)
- Catégorie (dropdown avec icônes)
- Tags (input avec suggestions)
- Date de début (date picker)
- Date de fin (date picker)
- Heure de début (time picker)
- Heure de fin (time picker)

### Étape 2 : Détails et description
- Description complète (éditeur de texte riche)
- Lieu :
  - Recherche d'adresse avec autocomplétion
  - Affichage carte interactive
  - Option "Événement en ligne" avec champ URL
- Programme/Agenda (possibilité d'ajouter plusieurs points)

### Étape 3 : Billets
- Options :
  - Événement gratuit
  - Événement payant
- Si payant, possibilité de créer plusieurs types de billets :
  - Nom du billet
  - Prix
  - Quantité disponible
  - Description
  - Date limite de vente
- Bouton "+ Ajouter un type de billet"

### Étape 4 : Paramètres
- Visibilité : Public / Privé
- Capacité maximale
- Option d'approbation manuelle des inscriptions
- Paramètres de notification
- Boutons finaux :
  - "Enregistrer comme brouillon"
  - "Publier l'événement" (bouton primaire)

---

## 7. FONCTIONNALITÉS DE LOCALISATION

### Détection automatique
- Demander l'autorisation de géolocalisation au premier chargement
- Icône "Près de moi" dans l'en-tête
- Affichage "Localisation : Montréal, QC" avec possibilité de changer

### Sélecteur de ville
- Dropdown avec recherche
- Villes populaires suggérées
- Géolocalisation automatique proposée
- Affichage de la ville actuelle avec icône

### Affichage des distances
- Sur chaque carte d'événement : badge "À X km"
- Sur la page détails : distance et temps de trajet estimé
- Filtre par rayon de distance

### Carte interactive
- Vue carte pour voir tous les événements géographiquement
- Clusters pour les zones denses
- Pop-ups au survol avec infos essentielles
- Clic pour voir détails complets

---

## 8. COMPOSANTS UI SPÉCIFIQUES

### Cartes d'événements
```
Style général :
- Background blanc
- Border-radius 12-16px
- Box-shadow légère : 0 2px 8px rgba(0,0,0,0.08)
- Transition smooth au survol
- Hover : shadow plus prononcée, légère translation vers le haut (4px)
```

### Badges de catégorie
```
Style :
- Background couleur avec opacité (ex: rgba(239, 68, 68, 0.1))
- Couleur texte assortie
- Padding 4px 12px
- Border-radius 20px (pill shape)
- Font-size 12px
- Font-weight 500
```

### Boutons
```
Bouton primaire :
- Background couleur primaire (#4F46E5)
- Texte blanc
- Padding 12px 24px
- Border-radius 8px
- Font-weight 600
- Hover : légère darkening, shadow

Bouton secondaire :
- Background transparent
- Border 2px solid couleur primaire
- Texte couleur primaire
- Mêmes dimensions

Bouton tertiaire/ghost :
- Background transparent
- Texte couleur primaire
- Pas de border
- Hover : légère opacité
```

### Avatars et images
```
Avatar utilisateur :
- Circulaire
- Tailles : 32px (petit), 48px (moyen), 64px (grand)
- Border 2px blanc si sur fond coloré

Images événements :
- Ratio 16:9 pour les cartes
- Ratio 21:9 pour les bannières hero
- Object-fit: cover
- Border-radius en haut seulement pour les cartes
```

---

## 9. ANIMATIONS ET INTERACTIONS

### Transitions
- Tous les hover : transition 200-300ms ease
- Changements de page : fade-in 300ms
- Apparition des cartes : stagger animation (décalage 50ms)
- Ouverture des modals : scale et fade 250ms

### Loading states
- Skeletons pour le chargement des cartes
- Spinner pour les actions (boutons)
- Progress bar en haut pour navigation entre pages

### Feedback utilisateur
- Toast notifications pour succès/erreur (coin supérieur droit)
- Confirmations modales pour actions destructives
- Micro-animations sur les favoris (cœur qui bat)
- Badges "Nouveau" sur les événements récents

---

## 10. RESPONSIVE DESIGN

### Breakpoints
- Mobile : < 640px
- Tablette : 640px - 1024px
- Desktop : > 1024px

### Adaptations mobile
- Menu burger pour navigation
- Sidebar devient bottom navigation bar
- Grille passe à 1 colonne
- Filtres deviennent menu overlay
- Formulaire en pleine largeur
- Sticky header réduit au scroll

### Touch interactions
- Zones de touch minimum 44x44px
- Swipe pour naviguer entre onglets
- Pull to refresh sur la liste
- Double tap sur images pour zoom

---

## 11. ACCESSIBILITÉ

### Standards WCAG
- Contraste minimum 4.5:1 pour texte normal
- Contraste minimum 3:1 pour texte large
- Tous les inputs avec labels visibles
- Focus visible sur tous les éléments interactifs
- Navigation au clavier complète
- Attributs ARIA appropriés

### Images
- Alt text descriptif pour toutes les images
- Images décoratives avec alt vide
- Icônes avec aria-label

---

## 12. PAGES ADDITIONNELLES

### Page Profil utilisateur
- Photo de profil éditable
- Informations personnelles
- Événements créés
- Événements auxquels je participe
- Événements favoris
- Statistiques personnelles

### Page Billets/Tickets
- Liste des billets achetés
- QR codes pour entrée
- Détails de la commande
- Option d'annulation (si applicable)
- Téléchargement PDF

### Page Notifications
- Centre de notifications
- Filtres : Toutes, Non lues, Importantes
- Types : Rappels événements, Nouveaux événements dans votre ville, Confirmations, Messages organisateurs

### Page Paramètres
- Informations du compte
- Préférences de notification
- Préférences de localisation
- Langue
- Mode sombre/clair
- Confidentialité
- Se déconnecter

---

## 13. FONCTIONNALITÉS AVANCÉES SUGGÉRÉES

### Système de favoris/wishlist
- Bouton cœur sur chaque événement
- Page dédiée aux favoris
- Notifications si changement de prix ou derniers billets

### Système de recommandations
- "Événements suggérés pour vous"
- Basé sur l'historique et les favoris
- Basé sur la localisation
- Basé sur la catégorie préférée

### Partage social
- Boutons de partage : Facebook, Twitter, LinkedIn, WhatsApp
- Lien de partage direct
- Prévisualisation avec Open Graph

### Calendrier intégré
- Vue calendrier des événements
- Export vers Google Calendar, iCal
- Rappels automatiques

### Système de notation et avis
- Notes par étoiles (1-5)
- Commentaires écrits
- Photos uploadées par participants
- "Événements les mieux notés"

---

## 14. ÉLÉMENTS DE GAMIFICATION (OPTIONNEL)

- Badges pour participants réguliers
- Points de fidélité
- Réductions pour membres actifs
- Classement des organisateurs populaires

---

## 15. INSTRUCTIONS TECHNIQUES SPÉCIFIQUES POUR KIRO

### Structure du prompt principal pour Kiro :

```
Crée une application web moderne de gestion d'événements avec les caractéristiques suivantes :

DESIGN :
- Style moderne et épuré inspiré des dashboards SaaS
- Palette : bleu indigo (#4F46E5) comme couleur primaire, orange (#F59E0B) comme accent
- Typographie : police sans-serif moderne (Inter ou Poppins)
- Layout : sidebar fixe à gauche, contenu principal au centre, cards avec ombres légères
- Espacement généreux, border-radius 12-16px, micro-animations subtiles

NAVIGATION :
- Header avec : logo, recherche, menu principal, notifications, profil utilisateur
- Sidebar gauche avec icônes : Dashboard, Événements, Mes événements, Favoris, Billets, Statistiques
- Indicateur visuel de page active

FONCTIONNALITÉS DE LOCALISATION :
- Sélecteur de ville en haut avec dropdown
- Bouton "Près de moi" pour géolocalisation
- Affichage de la distance sur chaque carte d'événement (ex: "À 2.5 km")
- Filtre par rayon de distance (5km, 10km, 25km, 50km)
- Carte interactive pour visualiser les événements géographiquement

PAGE LISTE D'ÉVÉNEMENTS :
- Grille responsive (3 colonnes desktop, 2 tablette, 1 mobile)
- Chaque carte contient : image 16:9, badge catégorie, badge distance, date/heure, titre, lieu, nombre participants, prix, bouton "S'inscrire", icône favori
- Filtres horizontaux : catégories, dates, prix, tri
- Animation au survol : élévation et zoom léger

COMPOSANTS CLÉS :
- Cartes blanches avec box-shadow: 0 2px 8px rgba(0,0,0,0.08)
- Badges pill-shaped avec background en opacité
- Boutons primaires avec couleur principale, arrondis, padding généreux
- Avatars circulaires
- Loading skeletons pendant chargement

RESPONSIVE :
- Mobile-first
- Menu burger sur mobile
- Bottom navigation au lieu de sidebar
- Grille adaptative
```

### Prompts spécifiques par section :

**Pour la page d'accueil/dashboard :**
```
Crée le dashboard principal avec :
- En haut : 4 cards de statistiques (événements créés, à venir, participants, revenus) avec icônes et couleurs différentes
- Section "Événements près de chez vous" avec sélecteur de ville
- Grille d'événements avec filtres par catégorie en badges cliquables
- Chaque carte d'événement affiche la distance en km
- Design moderne avec espacements généreux
```

**Pour la page détails événement :**
```
Crée une page détails événement avec :
- Hero banner avec image pleine largeur, overlay gradient, titre grand format
- Layout 2 colonnes : 70% gauche (description, détails, carte interactive du lieu, programme), 30% droite (card de réservation sticky avec prix, quantité, CTA "Réserver")
- Afficher la distance depuis la position de l'utilisateur
- Bouton "Itinéraire" qui ouvre la carte
- Section événements similaires en bas
```

**Pour le formulaire de création :**
```
Crée un formulaire multi-étapes (stepper en haut) pour créer un événement :
Étapes : 1) Infos de base 2) Détails 3) Billets 4) Publication
- Upload image avec drag & drop
- Champ de lieu avec autocomplétion et affichage carte
- Pour les billets : possibilité d'ajouter plusieurs types avec prix différents
- Design clean avec validation en temps réel
- Boutons "Brouillon" et "Publier"
```

**Pour la carte interactive :**
```
Intègre une carte interactive (type Google Maps) qui :
- Affiche tous les événements avec des markers
- Clusters pour zones denses
- Popup au clic avec infos essentielles de l'événement
- Filtre par distance avec slider
- Centre automatiquement sur la position de l'utilisateur
- Bouton pour recentrer sur ma position
```

---

## 16. CHECKLIST FINALE AVANT LIVRAISON

### Design
- [ ] Palette de couleurs cohérente appliquée partout
- [ ] Typographie consistante (tailles, poids)
- [ ] Espacements uniformes
- [ ] Tous les coins arrondis (border-radius)
- [ ] Ombres légères sur les cartes
- [ ] Animations au survol fluides

### Fonctionnalités localisation
- [ ] Détection de position automatique
- [ ] Sélecteur de ville fonctionnel
- [ ] Distance affichée sur chaque événement
- [ ] Filtre par rayon opérationnel
- [ ] Carte interactive avec markers
- [ ] Tri par distance

### Responsive
- [ ] Mobile : 1 colonne, menu burger
- [ ] Tablette : 2 colonnes
- [ ] Desktop : 3 colonnes, sidebar fixe
- [ ] Touch zones suffisamment grandes (44x44px min)
- [ ] Texte lisible sur tous écrans

### Performance
- [ ] Images optimisées
- [ ] Lazy loading des images
- [ ] Loading states partout
- [ ] Pas de lag sur animations

### Accessibilité
- [ ] Contrastes suffisants
- [ ] Alt text sur images
- [ ] Labels sur inputs
- [ ] Navigation clavier possible
- [ ] Focus visible

---

## RESSOURCES DE RÉFÉRENCE

Pour aller plus loin, inspirez-vous de :
- Eventbrite (structure et flow)
- Meetup (fonctionnalités communautaires)
- Airbnb Experiences (design et présentation)
- Facebook Events (filtres et recommandations)

---

**Note finale** : Ces instructions peuvent être données à Kiro de manière globale ou section par section selon la complexité souhaitée. Commencez par le layout général et les composants de base, puis itérez sur les fonctionnalités avancées.
