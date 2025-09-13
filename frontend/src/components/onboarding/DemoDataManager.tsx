/**
 * Gestionnaire de données de démonstration
 * Interface pour générer, prévisualiser et nettoyer les données de démo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Database,
  Users,
  Calendar,
  CheckSquare,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  Info,
  BarChart3,
  Download
} from 'lucide-react';

interface DemoDataStatus {
  hasDemoData: boolean;
  counts: {
    users: number;
    events: number;
    attendance: number;
  };
  lastGenerated: Date | null;
}

interface IndustryTemplate {
  userRoles: string[];
  departments: string[];
  eventTypes: string[];
  eventTitles: string[];
  locations: string[];
  skills: string[];
  defaultEventDuration: number;
  workingHours: {
    start: number;
    end: number;
  };
}

interface DemoDataOptions {
  industry: string;
  generateUsers: boolean;
  generateEvents: boolean;
  generateAttendance: boolean;
  userCount: number;
  eventCount: number;
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

interface GenerationResult {
  summary: {
    usersCreated: number;
    eventsCreated: number;
    attendanceRecordsCreated: number;
  };
}

const INDUSTRIES = [
  { value: 'education', label: 'Éducation', description: 'Écoles, universités, centres de formation' },
  { value: 'healthcare', label: 'Santé', description: 'Hôpitaux, cliniques, cabinets médicaux' },
  { value: 'corporate', label: 'Entreprise', description: 'Entreprises, bureaux, organisations' },
  { value: 'technology', label: 'Technologie', description: 'Startups tech, équipes de développement' }
];

export const DemoDataManager: React.FC = () => {
  const [status, setStatus] = useState<DemoDataStatus | null>(null);
  const [template, setTemplate] = useState<IndustryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  const [options, setOptions] = useState<DemoDataOptions>({
    industry: 'corporate',
    generateUsers: true,
    generateEvents: true,
    generateAttendance: true,
    userCount: 15,
    eventCount: 30,
    timeRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (options.industry) {
      loadTemplate(options.industry);
    }
  }, [options.industry]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/demo-data/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error loading demo data status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (industry: string) => {
    try {
      const response = await fetch(`/api/demo-data/templates/${industry}`);
      const data = await response.json();
      
      if (data.success) {
        setTemplate(data.data.template);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const generatePreview = async () => {
    try {
      setPreviewing(true);
      const response = await fetch('/api/demo-data/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: options.industry,
          userCount: Math.min(options.userCount, 5),
          eventCount: Math.min(options.eventCount, 5)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPreview(data.data);
      } else {
        setErrors({ preview: data.error });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      setErrors({ preview: 'Erreur de connexion' });
    } finally {
      setPreviewing(false);
    }
  };

  const generateDemoData = async () => {
    try {
      setGenerating(true);
      setErrors({});
      
      const response = await fetch('/api/demo-data/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options)
      });

      const data = await response.json();
      
      if (data.success) {
        setGenerationResult(data.data);
        await loadStatus(); // Recharger le statut
      } else {
        setErrors({ generate: data.error });
      }
    } catch (error) {
      console.error('Error generating demo data:', error);
      setErrors({ generate: 'Erreur de connexion' });
    } finally {
      setGenerating(false);
    }
  };

  const cleanupDemoData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données de démonstration ? Cette action est irréversible.')) {
      return;
    }

    try {
      setCleaning(true);
      const response = await fetch('/api/demo-data/cleanup', {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setGenerationResult(null);
        await loadStatus(); // Recharger le statut
      } else {
        setErrors({ cleanup: data.error });
      }
    } catch (error) {
      console.error('Error cleaning up demo data:', error);
      setErrors({ cleanup: 'Erreur de connexion' });
    } finally {
      setCleaning(false);
    }
  };

  const updateOption = (key: keyof DemoDataOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const validateOptions = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!options.generateUsers && !options.generateEvents && !options.generateAttendance) {
      newErrors.generate = 'Vous devez sélectionner au moins un type de données';
    }

    if (options.userCount < 1 || options.userCount > 100) {
      newErrors.userCount = 'Le nombre d\'utilisateurs doit être entre 1 et 100';
    }

    if (options.eventCount < 1 || options.eventCount > 500) {
      newErrors.eventCount = 'Le nombre d\'événements doit être entre 1 et 500';
    }

    if (new Date(options.timeRange.startDate) >= new Date(options.timeRange.endDate)) {
      newErrors.timeRange = 'La date de début doit être antérieure à la date de fin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (loading) {
    return (
      <div className=\"flex items-center justify-center p-8\">
        <Loader2 className=\"w-8 h-8 animate-spin\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <Database className=\"w-5 h-5\" />
            Statut des données de démonstration
          </CardTitle>
          <CardDescription>
            Aperçu des données de démonstration actuellement présentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.hasDemoData ? (
            <div className=\"space-y-4\">
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <div className=\"bg-blue-50 p-4 rounded-lg\">
                  <div className=\"flex items-center gap-2 mb-2\">
                    <Users className=\"w-4 h-4 text-blue-600\" />
                    <span className=\"font-medium\">Utilisateurs</span>
                  </div>
                  <div className=\"text-2xl font-bold text-blue-600\">{status.counts.users}</div>
                </div>
                
                <div className=\"bg-green-50 p-4 rounded-lg\">
                  <div className=\"flex items-center gap-2 mb-2\">
                    <Calendar className=\"w-4 h-4 text-green-600\" />
                    <span className=\"font-medium\">Événements</span>
                  </div>
                  <div className=\"text-2xl font-bold text-green-600\">{status.counts.events}</div>
                </div>
                
                <div className=\"bg-purple-50 p-4 rounded-lg\">
                  <div className=\"flex items-center gap-2 mb-2\">
                    <CheckSquare className=\"w-4 h-4 text-purple-600\" />
                    <span className=\"font-medium\">Présences</span>
                  </div>
                  <div className=\"text-2xl font-bold text-purple-600\">{status.counts.attendance}</div>
                </div>
              </div>

              {status.lastGenerated && (
                <div className=\"text-sm text-gray-600\">
                  Dernière génération : {new Date(status.lastGenerated).toLocaleString()}
                </div>
              )}

              <Alert>
                <AlertTriangle className=\"h-4 w-4\" />
                <AlertDescription>
                  Des données de démonstration sont présentes. Vous pouvez les nettoyer ou en générer de nouvelles.
                </AlertDescription>
              </Alert>

              <Button
                variant=\"destructive\"
                onClick={cleanupDemoData}
                disabled={cleaning}
                className=\"w-full\"
              >
                {cleaning ? (
                  <>
                    <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                    Nettoyage en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className=\"w-4 h-4 mr-2\" />
                    Nettoyer les données de démonstration
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className=\"text-center py-8\">
              <Database className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />
              <h3 className=\"text-lg font-medium mb-2\">Aucune donnée de démonstration</h3>
              <p className=\"text-gray-600 mb-4\">
                Générez des données d'exemple pour découvrir les fonctionnalités de la plateforme.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration de génération */}
      <Card>
        <CardHeader>
          <CardTitle>Générer des données de démonstration</CardTitle>
          <CardDescription>
            Configurez les données d'exemple à générer selon votre secteur d'activité
          </CardDescription>
        </CardHeader>
        <CardContent className=\"space-y-6\">
          {/* Sélection de l'industrie */}
          <div>
            <Label htmlFor=\"industry\">Secteur d'activité</Label>
            <Select value={options.industry} onValueChange={(value) => updateOption('industry', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(industry => (
                  <SelectItem key={industry.value} value={industry.value}>
                    <div>
                      <div className=\"font-medium\">{industry.label}</div>
                      <div className=\"text-sm text-gray-600\">{industry.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Types de données à générer */}
          <div>
            <Label>Types de données à générer</Label>
            <div className=\"space-y-3 mt-2\">
              <div className=\"flex items-center space-x-2\">
                <Checkbox
                  id=\"generateUsers\"
                  checked={options.generateUsers}
                  onCheckedChange={(checked) => updateOption('generateUsers', checked)}
                />
                <Label htmlFor=\"generateUsers\" className=\"flex items-center gap-2\">
                  <Users className=\"w-4 h-4\" />
                  Utilisateurs de démonstration
                </Label>
              </div>
              
              <div className=\"flex items-center space-x-2\">
                <Checkbox
                  id=\"generateEvents\"
                  checked={options.generateEvents}
                  onCheckedChange={(checked) => updateOption('generateEvents', checked)}
                />
                <Label htmlFor=\"generateEvents\" className=\"flex items-center gap-2\">
                  <Calendar className=\"w-4 h-4\" />
                  Événements de démonstration
                </Label>
              </div>
              
              <div className=\"flex items-center space-x-2\">
                <Checkbox
                  id=\"generateAttendance\"
                  checked={options.generateAttendance}
                  onCheckedChange={(checked) => updateOption('generateAttendance', checked)}
                  disabled={!options.generateUsers || !options.generateEvents}
                />
                <Label htmlFor=\"generateAttendance\" className=\"flex items-center gap-2\">
                  <CheckSquare className=\"w-4 h-4\" />
                  Données de présence
                </Label>
              </div>
            </div>
          </div>

          {/* Quantités */}
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <div>
              <Label htmlFor=\"userCount\">Nombre d'utilisateurs (1-100)</Label>
              <Input
                id=\"userCount\"
                type=\"number\"
                min=\"1\"
                max=\"100\"
                value={options.userCount}
                onChange={(e) => updateOption('userCount', parseInt(e.target.value) || 1)}
                disabled={!options.generateUsers}
              />
              {errors.userCount && (
                <p className=\"text-red-500 text-sm mt-1\">{errors.userCount}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor=\"eventCount\">Nombre d'événements (1-500)</Label>
              <Input
                id=\"eventCount\"
                type=\"number\"
                min=\"1\"
                max=\"500\"
                value={options.eventCount}
                onChange={(e) => updateOption('eventCount', parseInt(e.target.value) || 1)}
                disabled={!options.generateEvents}
              />
              {errors.eventCount && (
                <p className=\"text-red-500 text-sm mt-1\">{errors.eventCount}</p>
              )}
            </div>
          </div>

          {/* Plage de dates */}
          <div>
            <Label>Plage de dates pour les événements</Label>
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 mt-2\">
              <div>
                <Label htmlFor=\"startDate\">Date de début</Label>
                <Input
                  id=\"startDate\"
                  type=\"date\"
                  value={options.timeRange.startDate}
                  onChange={(e) => updateOption('timeRange', {
                    ...options.timeRange,
                    startDate: e.target.value
                  })}
                  disabled={!options.generateEvents}
                />
              </div>
              
              <div>
                <Label htmlFor=\"endDate\">Date de fin</Label>
                <Input
                  id=\"endDate\"
                  type=\"date\"
                  value={options.timeRange.endDate}
                  onChange={(e) => updateOption('timeRange', {
                    ...options.timeRange,
                    endDate: e.target.value
                  })}
                  disabled={!options.generateEvents}
                />
              </div>
            </div>
            {errors.timeRange && (
              <p className=\"text-red-500 text-sm mt-1\">{errors.timeRange}</p>
            )}
          </div>

          {/* Aperçu du template */}
          {template && (
            <div className=\"bg-gray-50 p-4 rounded-lg\">
              <h4 className=\"font-medium mb-3\">Aperçu pour le secteur {INDUSTRIES.find(i => i.value === options.industry)?.label}</h4>
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm\">
                <div>
                  <strong>Rôles d'utilisateurs :</strong>
                  <div className=\"text-gray-600\">{template.userRoles.slice(0, 3).join(', ')}...</div>
                </div>
                <div>
                  <strong>Types d'événements :</strong>
                  <div className=\"text-gray-600\">{template.eventTypes.slice(0, 3).join(', ')}...</div>
                </div>
                <div>
                  <strong>Départements :</strong>
                  <div className=\"text-gray-600\">{template.departments.slice(0, 3).join(', ')}...</div>
                </div>
                <div>
                  <strong>Durée par défaut :</strong>
                  <div className=\"text-gray-600\">{template.defaultEventDuration} minutes</div>
                </div>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className=\"flex gap-3\">
            <Button
              variant=\"outline\"
              onClick={generatePreview}
              disabled={previewing}
              className=\"flex-1\"
            >
              {previewing ? (
                <>
                  <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                  Génération...
                </>
              ) : (
                <>
                  <Eye className=\"w-4 h-4 mr-2\" />
                  Aperçu
                </>
              )}
            </Button>
            
            <Button
              onClick={() => {
                if (validateOptions()) {
                  generateDemoData();
                }
              }}
              disabled={generating}
              className=\"flex-1\"
            >
              {generating ? (
                <>
                  <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Database className=\"w-4 h-4 mr-2\" />
                  Générer les données
                </>
              )}
            </Button>
          </div>

          {/* Erreurs */}
          {Object.keys(errors).length > 0 && (
            <Alert>
              <AlertTriangle className=\"h-4 w-4\" />
              <AlertDescription>
                {Object.values(errors)[0]}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Aperçu */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <Eye className=\"w-5 h-5\" />
              Aperçu des données
            </CardTitle>
            <CardDescription>
              Exemples de données qui seraient générées
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            {preview.examples.users && (
              <div>
                <h4 className=\"font-medium mb-2\">Exemples d'utilisateurs</h4>
                <div className=\"space-y-2\">
                  {preview.examples.users.slice(0, 3).map((user: any, index: number) => (
                    <div key={index} className=\"bg-gray-50 p-3 rounded text-sm\">
                      <strong>{user.firstName} {user.lastName}</strong> - {user.role} ({user.department})
                      <div className=\"text-gray-600\">{user.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.examples.events && (
              <div>
                <h4 className=\"font-medium mb-2\">Exemples d'événements</h4>
                <div className=\"space-y-2\">
                  {preview.examples.events.slice(0, 3).map((event: any, index: number) => (
                    <div key={index} className=\"bg-gray-50 p-3 rounded text-sm\">
                      <strong>{event.title}</strong> - {event.type}
                      <div className=\"text-gray-600\">{event.location} • {event.duration} min • Max {event.maxAttendees} participants</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.examples.attendanceScenarios && (
              <div>
                <h4 className=\"font-medium mb-2\">Scénarios de présence</h4>
                <div className=\"space-y-2\">
                  {preview.examples.attendanceScenarios.map((scenario: any, index: number) => (
                    <div key={index} className=\"bg-gray-50 p-3 rounded text-sm flex justify-between\">
                      <span>{scenario.description}</span>
                      <span className=\"font-medium\">{scenario.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultat de génération */}
      {generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2 text-green-600\">
              <CheckSquare className=\"w-5 h-5\" />
              Génération terminée avec succès
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
              <div className=\"text-center\">
                <div className=\"text-2xl font-bold text-blue-600\">{generationResult.summary.usersCreated}</div>
                <div className=\"text-sm text-gray-600\">Utilisateurs créés</div>
              </div>
              <div className=\"text-center\">
                <div className=\"text-2xl font-bold text-green-600\">{generationResult.summary.eventsCreated}</div>
                <div className=\"text-sm text-gray-600\">Événements créés</div>
              </div>
              <div className=\"text-center\">
                <div className=\"text-2xl font-bold text-purple-600\">{generationResult.summary.attendanceRecordsCreated}</div>
                <div className=\"text-sm text-gray-600\">Enregistrements de présence</div>
              </div>
            </div>

            <Alert className=\"mt-4\">
              <Info className=\"h-4 w-4\" />
              <AlertDescription>
                Les données de démonstration ont été générées avec succès. Vous pouvez maintenant explorer les fonctionnalités de la plateforme.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DemoDataManager;