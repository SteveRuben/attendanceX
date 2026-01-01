import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, ArrowLeft, Loader2 } from 'lucide-react';

interface ProjectFormData {
  name: string;
  description: string;
  template: string;
  visibility: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    template: 'basic',
    visibility: 'private'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const templates = [
    { value: 'basic', label: 'Projet Basique', description: 'Projet simple avec fonctionnalités de base' },
    { value: 'event', label: 'Événement', description: 'Projet orienté événement avec gestion des participants' },
    { value: 'training', label: 'Formation', description: 'Projet de formation avec modules et évaluations' },
    { value: 'conference', label: 'Conférence', description: 'Projet de conférence avec sessions multiples' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du projet est requis';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caractères';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simuler la création du projet
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Rediriger vers le projet créé
      const projectId = 'new-project-' + Date.now();
      router.push(`/app/projects/${projectId}`);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AppShell title="Créer un Projet">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Créer un Nouveau Projet
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez votre projet et commencez à organiser vos événements
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} data-cy="project-form">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire Principal */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations Générales</CardTitle>
                    <CardDescription>
                      Définissez les informations de base de votre projet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du Projet *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Ex: Conférence Tech 2024"
                        data-cy="project-name-input"
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive" data-cy="name-error">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Décrivez votre projet..."
                        rows={4}
                        data-cy="project-description-input"
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive" data-cy="description-error">
                          {errors.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visibility">Visibilité</Label>
                      <Select 
                        value={formData.visibility} 
                        onValueChange={(value) => handleInputChange('visibility', value)}
                      >
                        <SelectTrigger data-cy="project-visibility-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Privé</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="restricted">Restreint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Template Selector */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Modèle de Projet</CardTitle>
                    <CardDescription>
                      Choisissez un modèle pour démarrer rapidement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4" data-cy="project-template-selector">
                    {templates.map((template) => (
                      <div
                        key={template.value}
                        className={`
                          p-3 border rounded-lg cursor-pointer transition-colors
                          ${formData.template === template.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => handleInputChange('template', template.value)}
                        data-cy={`template-${template.value}`}
                      >
                        <h4 className="font-medium">{template.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-cy="create-project-button"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      'Créer le Projet'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}