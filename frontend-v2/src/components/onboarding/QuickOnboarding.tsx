import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Clock,
  MapPin,
  Zap
} from 'lucide-react';

interface QuickOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  organizationName: string;
  role: string;
  primaryUseCase: string;
  timezone: string;
}

const roles = [
  { id: 'organizer', label: 'Organisateur d\'événements', icon: '🎯' },
  { id: 'manager', label: 'Manager d\'équipe', icon: '👥' },
  { id: 'admin', label: 'Administrateur', icon: '⚙️' },
  { id: 'assistant', label: 'Assistant(e)', icon: '📋' }
];

const useCases = [
  { id: 'meetings', label: 'Réunions d\'équipe', icon: '💼', color: 'bg-blue-100 text-blue-800' },
  { id: 'events', label: 'Événements corporate', icon: '🎪', color: 'bg-purple-100 text-purple-800' },
  { id: 'training', label: 'Formations', icon: '📚', color: 'bg-green-100 text-green-800' },
  { id: 'social', label: 'Événements sociaux', icon: '🎉', color: 'bg-pink-100 text-pink-800' }
];

export const QuickOnboarding: React.FC<QuickOnboardingProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    organizationName: '',
    role: '',
    primaryUseCase: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const progress = (step / 3) * 100;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(data);
      onOpenChange(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.organizationName.trim().length > 0;
      case 2:
        return data.role.length > 0;
      case 3:
        return data.primaryUseCase.length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Bienvenue sur AttendanceX
          </DialogTitle>
          <DialogDescription>
            Configurons votre espace en 3 étapes rapides
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Étape {step} sur 3</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step 1: Organization */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Votre organisation</h3>
                <p className="text-sm text-muted-foreground">
                  Comment s'appelle votre entreprise ou équipe ?
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="orgName">Nom de l'organisation</Label>
                <Input
                  id="orgName"
                  value={data.organizationName}
                  onChange={(e) => setData(prev => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="Ex: Mon Entreprise, Équipe Marketing..."
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Votre rôle</h3>
                <p className="text-sm text-muted-foreground">
                  Quel est votre rôle principal dans l'organisation ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setData(prev => ({ ...prev, role: role.id }))}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      data.role === role.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{role.icon}</div>
                    <div className="font-medium text-sm">{role.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Use Case */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Usage principal</h3>
                <p className="text-sm text-muted-foreground">
                  Quel type d'événements organisez-vous le plus souvent ?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {useCases.map((useCase) => (
                  <button
                    key={useCase.id}
                    onClick={() => setData(prev => ({ ...prev, primaryUseCase: useCase.id }))}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      data.primaryUseCase === useCase.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{useCase.icon}</div>
                    <div className="font-medium text-sm">{useCase.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Précédent
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {step === 3 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Commencer
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Quick Tips */}
          {step === 3 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Prêt à commencer !
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Créez votre premier événement en moins de 2 minutes</li>
                <li>• Utilisez l'IA pour générer des événements complets</li>
                <li>• Invitez votre équipe et suivez les participations</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};