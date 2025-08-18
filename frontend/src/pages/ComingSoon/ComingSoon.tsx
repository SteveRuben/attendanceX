import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Calendar, 
  Bell, 
  ArrowRight,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ComingSoonProps {
  feature: string;
  phase: string;
  description?: string;
  estimatedDate?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ 
  feature, 
  phase, 
  description,
  estimatedDate 
}) => {
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'Phase 3':
        return {
          color: 'bg-blue-100 text-blue-800',
          timeline: 'Q3 2025',
          features: [
            'Gestion complète des rendez-vous',
            'Système CRM avancé',
            'Facturation et paiements',
            'Gestion des ventes'
          ]
        };
      case 'Phase 4':
        return {
          color: 'bg-purple-100 text-purple-800',
          timeline: 'Q4 2025',
          features: [
            'Assistant IA intelligent',
            'Recommandations automatiques',
            'Marketing automation',
            'API publique et SDK'
          ]
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          timeline: 'À déterminer',
          features: []
        };
    }
  };

  const phaseInfo = getPhaseInfo(phase);

  const getFeatureDescription = (feature: string) => {
    const descriptions: Record<string, string> = {
      'Gestion des Rendez-vous': 'Planifiez, gérez et suivez vos rendez-vous avec un système complet de réservation en ligne, rappels automatiques et intégration calendrier.',
      'Gestion des Clients (CRM)': 'Un système CRM complet pour gérer vos relations clients, suivre les interactions et analyser les données de vente.',
      'Gestion des Opportunités': 'Suivez votre pipeline de ventes, gérez les opportunités et optimisez votre processus commercial.',
      'Facturation et Paiements': 'Créez des factures, gérez les paiements et suivez votre comptabilité directement dans l\'application.',
      'Gestion des Ventes': 'Outils avancés pour gérer vos produits, services et processus de vente.',
      'Marketing Automation': 'Automatisez vos campagnes marketing, segmentez vos clients et analysez les performances.',
      'Assistant IA et Recommandations': 'Intelligence artificielle pour optimiser vos processus et fournir des recommandations personnalisées.'
    };
    return descriptions[feature] || description || 'Cette fonctionnalité sera bientôt disponible.';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Rocket className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{feature}</h1>
        <Badge className={phaseInfo.color}>{phase}</Badge>
        <p className="text-muted-foreground mt-4 text-lg">
          {getFeatureDescription(feature)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Timeline Card */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-foreground">Calendrier de développement</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm text-muted-foreground">Phase 1 - Système de présence</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm text-muted-foreground">Phase 2 - Intégrations</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-foreground">
                {phase} - {phaseInfo.timeline}
              </span>
            </div>
          </div>
        </Card>

        {/* Notification Card */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-orange-600 mr-2" />
            <h3 className="font-semibold text-foreground">Restez informé</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Soyez le premier à savoir quand cette fonctionnalité sera disponible.
          </p>
          <Button className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            M'alerter lors de la sortie
          </Button>
        </Card>
      </div>

      {/* Features Preview */}
      {phaseInfo.features.length > 0 && (
        <Card className="p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">
            Fonctionnalités prévues pour {phase}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {phaseInfo.features.map((featureItem, index) => (
              <div key={index} className="flex items-center">
                <ArrowRight className="w-4 h-4 text-blue-500 mr-2" />
                <span className="text-sm text-muted-foreground">{featureItem}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current Features */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">
          En attendant, découvrez nos fonctionnalités actuelles
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            <Clock className="w-4 h-4 mr-2" />
            Gestion des présences
          </Button>
          <Button variant="outline" className="justify-start">
            <Calendar className="w-4 h-4 mr-2" />
            Événements
          </Button>
          <Button variant="outline" className="justify-start">
            <Rocket className="w-4 h-4 mr-2" />
            Intégrations
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ComingSoon;