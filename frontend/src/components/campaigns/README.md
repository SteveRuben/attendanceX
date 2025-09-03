# Composants de Campagne Email

Ce dossier contient tous les composants React pour la gestion des campagnes email dans Attendance-X.

## Structure des Composants

### CampaignDashboard
Composant principal qui orchestre l'affichage du tableau de bord des campagnes.

**Props:**
- `organizationId: string` - ID de l'organisation

**Fonctionnalités:**
- Affichage des statistiques globales
- Filtrage et recherche des campagnes
- Liste des campagnes avec actions
- Navigation vers la création de campagne

### CampaignStats
Affiche les statistiques globales des campagnes sous forme de cartes.

**Props:**
- `campaigns: Campaign[]` - Liste des campagnes pour calculer les stats

**Métriques affichées:**
- Total des campagnes
- Destinataires totaux
- Taux d'ouverture moyen
- Taux de clic moyen

### CampaignFilters
Composant de filtrage et recherche des campagnes.

**Props:**
- `filters: CampaignFilters` - Filtres actuels
- `onFilterChange: (filters: Partial<CampaignFilters>) => void` - Callback de changement
- `campaignCount: number` - Nombre de campagnes trouvées

**Filtres disponibles:**
- Recherche par nom/sujet
- Statut (brouillon, programmé, envoyé, etc.)
- Type (newsletter, annonce, etc.)
- Période de création
- Tri et ordre

### CampaignList
Liste des campagnes avec actions rapides.

**Props:**
- `campaigns: Campaign[]` - Liste des campagnes à afficher
- `loading: boolean` - État de chargement
- `onRefresh: () => void` - Callback de rafraîchissement

**Fonctionnalités:**
- Sélection multiple
- Actions contextuelles selon le statut
- Affichage des métriques de performance
- Actions en lot

### CampaignStatusBadge
Badge d'affichage du statut d'une campagne.

**Props:**
- `status: Campaign['status']` - Statut de la campagne
- `size?: 'sm' | 'md'` - Taille du badge

**Statuts supportés:**
- `draft` - Brouillon
- `scheduled` - Programmé
- `sending` - En cours d'envoi
- `sent` - Envoyé
- `paused` - En pause
- `cancelled` - Annulé
- `failed` - Échec

## Types de Données

### Campaign
Interface principale représentant une campagne email.

```typescript
interface Campaign {
  id: string;
  name: string;
  subject: string;
  type: 'newsletter' | 'announcement' | 'event_reminder' | 'hr_communication' | 'custom';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled' | 'failed';
  recipients: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
  createdBy: string;
  templateId?: string;
  tags: string[];
}
```

### CampaignFilters
Interface pour les filtres de campagne.

```typescript
interface CampaignFilters {
  search: string;
  status: string;
  type: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
```

## Services

### campaignService
Service pour les appels API liés aux campagnes.

**Méthodes principales:**
- `getCampaigns(filters?)` - Récupérer les campagnes
- `createCampaign(data)` - Créer une campagne
- `updateCampaign(data)` - Mettre à jour une campagne
- `deleteCampaign(id)` - Supprimer une campagne
- `sendCampaign(id)` - Envoyer une campagne
- `pauseCampaign(id)` - Mettre en pause
- `scheduleCampaign(id, date)` - Programmer

## Hooks

### useCampaigns
Hook personnalisé pour la gestion des campagnes.

**Options:**
- `autoLoad?: boolean` - Chargement automatique
- `filters?: Partial<CampaignFilters>` - Filtres initiaux

**Retour:**
- `campaigns` - Liste des campagnes
- `loading` - État de chargement
- `error` - Erreur éventuelle
- `stats` - Statistiques calculées
- Actions (loadCampaigns, createCampaign, etc.)

## Utilisation

### Intégration dans une page

```typescript
import { CampaignDashboard } from '@/components/campaigns';

export const CampaignPage = () => {
  const { organization } = useAuth();
  
  return (
    <CampaignDashboard organizationId={organization.id} />
  );
};
```

### Utilisation du hook

```typescript
import { useCampaigns } from '@/hooks/useCampaigns';

export const MyCampaignComponent = () => {
  const {
    campaigns,
    loading,
    createCampaign,
    sendCampaign
  } = useCampaigns();
  
  // Utiliser les données et actions...
};
```

## Permissions

Les composants vérifient automatiquement les permissions utilisateur :
- `admin` - Accès complet
- `manager` - Gestion des campagnes de l'organisation
- `manage_campaigns` - Permission spécifique

## Intégration avec Attendance-X

Les composants s'intègrent avec l'écosystème existant :
- Utilisation des composants UI partagés
- Respect des patterns d'authentification
- Intégration avec le système de notifications
- Cohérence avec le design system

## Prochaines Étapes

1. **Wizard de création** - Interface de création de campagne
2. **Éditeur de templates** - Éditeur WYSIWYG
3. **Analytics détaillés** - Graphiques et métriques avancées
4. **Gestion des destinataires** - Sélection et import
5. **Tests A/B** - Fonctionnalités de test