# Guide de Design des Boutons - Cohérence UI

## 🎯 Objectif

Uniformiser le design des boutons entre les pages de connexion et de création d'organisation pour une expérience utilisateur cohérente.

## 🔍 Boutons à Harmoniser

### Pages Concernées
- **Page de connexion** (référence de design)
- **Pages de création d'organisation** :
  - Formulaire de création
  - Sélecteur de templates
  - Configuration des paramètres
  - Finalisation

### Types de Boutons
1. **Boutons principaux** : "Continuer", "Valider", "Se connecter"
2. **Boutons secondaires** : "Ignorer pour le moment", "Retour"
3. **Boutons d'action** : "Afficher", "Masquer" (mots de passe)
4. **Boutons de navigation** : "Précédent", "Suivant"

## 🎨 Recommandations de Design

### 1. **Classes CSS Communes**

Créer des classes CSS réutilisables :

```css
/* Boutons principaux */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

/* Boutons secondaires */
.btn-secondary {
  background: transparent;
  color: #6b7280;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  border-color: #667eea;
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

/* Boutons d'action (afficher/masquer) */
.btn-action {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background: rgba(102, 126, 234, 0.1);
}

/* États de chargement */
.btn-loading {
  position: relative;
  color: transparent;
}

.btn-loading::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* États désactivés */
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
```

### 2. **Composants React Réutilisables**

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'action';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button'
}) => {
  const baseClasses = 'btn transition-all duration-300 ease-in-out';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    action: 'btn-action'
  };
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    loading && 'btn-loading',
    disabled && 'opacity-60 cursor-not-allowed'
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {children}
    </button>
  );
};

export default Button;
```

### 3. **Utilisation dans les Composants**

```typescript
// Exemple d'utilisation dans OrganizationCreationForm
import Button from '../ui/Button';

const OrganizationCreationForm = () => {
  return (
    <form>
      {/* Contenu du formulaire */}
      
      <div className="flex gap-4 mt-6">
        <Button 
          variant="secondary" 
          onClick={handleSkip}
        >
          Ignorer pour le moment
        </Button>
        
        <Button 
          variant="primary" 
          type="submit"
          loading={isSubmitting}
        >
          Continuer
        </Button>
      </div>
    </form>
  );
};

// Exemple pour les boutons afficher/masquer mot de passe
const PasswordField = () => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="relative">
      <input 
        type={showPassword ? 'text' : 'password'}
        // ... autres props
      />
      <Button
        variant="action"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        {showPassword ? 'Masquer' : 'Afficher'}
      </Button>
    </div>
  );
};
```

### 4. **Thème et Variables CSS**

```css
:root {
  /* Couleurs principales */
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-color: #667eea;
  --primary-hover: #5a67d8;
  
  /* Couleurs secondaires */
  --secondary-color: #6b7280;
  --secondary-border: #e5e7eb;
  --secondary-hover: rgba(102, 126, 234, 0.05);
  
  /* Espacements */
  --btn-padding-sm: 8px 16px;
  --btn-padding-md: 12px 24px;
  --btn-padding-lg: 16px 32px;
  
  /* Bordures */
  --btn-radius: 8px;
  --btn-radius-sm: 6px;
  
  /* Ombres */
  --btn-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  --btn-shadow-hover: 0 6px 20px rgba(102, 126, 234, 0.4);
  
  /* Transitions */
  --btn-transition: all 0.3s ease;
}
```

### 5. **Responsive Design**

```css
/* Adaptations mobiles */
@media (max-width: 768px) {
  .btn {
    padding: 10px 20px;
    font-size: 14px;
  }
  
  .btn-lg {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  /* Stack vertical sur mobile */
  .btn-group {
    flex-direction: column;
    gap: 12px;
  }
  
  .btn-group .btn {
    width: 100%;
  }
}
```

## 📋 Checklist d'Implémentation

### Phase 1 : Composants de Base
- [ ] Créer le composant `Button` réutilisable
- [ ] Définir les classes CSS communes
- [ ] Tester les différentes variantes

### Phase 2 : Application aux Pages d'Organisation
- [ ] Remplacer les boutons dans `OrganizationCreationForm`
- [ ] Harmoniser les boutons dans `SectorTemplateSelector`
- [ ] Mettre à jour les boutons de navigation
- [ ] Uniformiser les boutons d'action (afficher/masquer)

### Phase 3 : Tests et Finitions
- [ ] Tester la cohérence visuelle
- [ ] Vérifier la responsivité
- [ ] Valider l'accessibilité
- [ ] Optimiser les animations

## 🎯 Résultat Attendu

### Avant
- Boutons avec des styles différents entre les pages
- Incohérence dans les couleurs, tailles, et animations
- Expérience utilisateur fragmentée

### Après
- Design uniforme sur toutes les pages
- Cohérence dans les interactions (hover, active, loading)
- Expérience utilisateur fluide et professionnelle

## 🔧 Outils Recommandés

### CSS Framework
- **Tailwind CSS** : Pour une approche utility-first
- **Styled Components** : Pour des composants React stylés
- **CSS Modules** : Pour l'encapsulation des styles

### Design System
- **Storybook** : Pour documenter les composants
- **Figma** : Pour les maquettes et spécifications
- **Design Tokens** : Pour la cohérence des valeurs

## 📱 Considérations d'Accessibilité

```css
/* Focus visible pour la navigation clavier */
.btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Contraste suffisant */
.btn-primary {
  /* Assurer un ratio de contraste ≥ 4.5:1 */
}

/* Taille minimale tactile (44px) */
.btn {
  min-height: 44px;
  min-width: 44px;
}
```

## 🚀 Prochaines Étapes

1. **Analyser** les boutons existants dans la page de connexion
2. **Extraire** les styles CSS utilisés
3. **Créer** le composant Button réutilisable
4. **Appliquer** progressivement aux pages d'organisation
5. **Tester** la cohérence visuelle et fonctionnelle