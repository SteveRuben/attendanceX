import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { TimezoneSelector } from '@/components/ui/TimezoneSelector'
import { 
  ProjectTemplate, 
  PROJECT_TEMPLATES,
  EventProject 
} from '@/types/project.types'
import { useProjects } from '@/hooks/useProjects'
import { TemplateSelector } from './TemplateSelector'
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Settings,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedProjectCreationWizardProps {
  onComplete?: (project: EventProject) => void
  onCancel?: () => void
}

interface WizardData {
  // Étape 1: Template
  template?: ProjectTemplate
  
  // Étape 2: Informations de base
  title: string
  description: string
  
  // Étape 3: Visuel
  eventImage?: File
  eventImagePreview?: string
  colorTheme: string
  timezone: string
  
  // Étape 4: Détails de l'événement
  eventDetails: {
    type: string
    startDate: string
    endDate: string
    capacity?: number
    isPublic: boolean
    requiresRegistration: boolean
    tags: string[]
  }
  
  // Étape 5: Lieu
  location: {
    type: 'physical' | 'virtual' | 'hybrid'
    name: string
    address?: {
      street: string
      city: string
      country: string
      postalCode?: string
      province?: string
    }
    virtualUrl?: string
  }
}

const STEPS = [
  { id: 'template', title: 'Template', icon: Sparkles },
  { id: 'basic', title: 'Informations', icon: Settings },
  { id: 'visual', title: 'Visuel', icon: ImageIcon },
  { id: 'event', title: 'Événement', icon: Calendar },
  { id: 'location', title: 'Lieu', icon: MapPin }
]

const countries = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'États-Unis' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' }
]

export const EnhancedProjectCreationWizard: React.FC<EnhancedProjectCreationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const router = useRouter()
  const { createProject } = useProjects()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WizardData>({
    title: '',
    description: '',
    colorTheme: '#3B82F6',
    timezone: 'Europe/Paris',
    eventDetails: {
      type: 'conference',
      startDate: '',
      endDate: '',
      capacity: 100,
      isPublic: true,
      requiresRegistration: false,
      tags: []
    },
    location: {
      type: 'physical',
      name: '',
      address: {
        street: '',
        city: '',
        country: 'FR',
        postalCode: '',
        province: ''
      }
    }
  })

  const updateData = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateEventDetails = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      eventDetails: {
        ...prev.eventDetails,
        [field]: value
      }
    }))
  }

  const updateLocation = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }))
  }

  const updateAddress = (field: string, value: any) => {
    setData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        address: {
          ...prev.location.address!,
          [field]: value
        }
      }
    }))
  }

  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Template
        return !!data.template
      case 1: // Basic info
        return data.title.trim() && data.description.trim()
      case 2: // Visual (optionnel)
        return true
      case 3: // Event details
        return data.eventDetails.startDate && data.eventDetails.endDate
      case 4: // Location
        if (data.location.type === 'physical' || data.location.type === 'hybrid') {
          return data.location.address?.street && 
                 data.location.address?.city && 
                 data.location.address?.country
        }
        if (data.location.type === 'virtual' || data.location.type === 'hybrid') {
          return !!data.location.virtualUrl
        }
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!data.template) return

    setLoading(true)
    try {
      const projectData = {
        title: data.title,
        description: data.description,
        template: data.template,
        eventDetails: {
          ...data.eventDetails,
          location: data.location,
          image: data.eventImagePreview,
          colorTheme: data.colorTheme,
          timezone: data.timezone
        }
      }

      const project = await createProject(projectData)
      onComplete?.(project)
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Template Selection
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choisissez un template</h2>
              <p className="text-muted-foreground">
                Sélectionnez le type de projet qui correspond le mieux à votre événement
              </p>
            </div>
            
            <TemplateSelector
              selectedTemplate={data.template}
              onTemplateSelect={(template) => updateData('template', template)}
            />
          </div>
        )

      case 1: // Basic Information
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Informations de base</h2>
              <p className="text-muted-foreground">
                Donnez un nom et une description à votre projet
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="title">Nom du projet *</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => updateData('title', e.target.value)}
                    placeholder="Ex: Conférence Tech 2024"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => updateData('description', e.target.value)}
                    placeholder="Décrivez votre projet en quelques phrases..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 2: // Visual Design
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                <Palette className="h-6 w-6" />
                Design visuel
              </h2>
              <p className="text-muted-foreground">
                Personnalisez l'apparence de votre événement
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload d'image */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Image de l'événement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    onImageSelect={(file, preview) => {
                      updateData('eventImage', file)
                      updateData('eventImagePreview', preview)
                    }}
                    onImageRemove={() => {
                      updateData('eventImage', undefined)
                      updateData('eventImagePreview', undefined)
                    }}
                    currentImage={data.eventImagePreview}
                    aspectRatio="16:9"
                    placeholder="Ajoutez une image pour votre événement"
                  />
                </CardContent>
              </Card>

              {/* Sélecteur de couleur */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Thème de couleur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ColorPicker
                    value={data.colorTheme}
                    onChange={(color) => updateData('colorTheme', color)}
                    label="Couleur principale"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Timezone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Fuseau horaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TimezoneSelector
                  value={data.timezone}
                  onChange={(timezone) => updateData('timezone', timezone)}
                />
              </CardContent>
            </Card>
          </div>
        )

      case 3: // Event Details
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Détails de l'événement</h2>
              <p className="text-muted-foreground">
                Configurez les paramètres de votre événement
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="eventType">Type d'événement</Label>
                  <Select
                    id="eventType"
                    value={data.eventDetails.type}
                    onChange={(e) => updateEventDetails('type', e.target.value)}
                  >
                    <option value="conference">Conférence</option>
                    <option value="workshop">Atelier</option>
                    <option value="seminar">Séminaire</option>
                    <option value="meeting">Réunion</option>
                    <option value="training">Formation</option>
                    <option value="other">Autre</option>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Date de début *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={data.eventDetails.startDate}
                      onChange={(e) => updateEventDetails('startDate', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">Date de fin *</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={data.eventDetails.endDate}
                      onChange={(e) => updateEventDetails('endDate', e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="capacity">Capacité</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={data.eventDetails.capacity || ''}
                    onChange={(e) => updateEventDetails('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Nombre maximum de participants"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.eventDetails.isPublic}
                      onChange={(e) => updateEventDetails('isPublic', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Événement public</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.eventDetails.requiresRegistration}
                      onChange={(e) => updateEventDetails('requiresRegistration', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Inscription requise</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 4: // Location
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Lieu de l'événement</h2>
              <p className="text-muted-foreground">
                Définissez où se déroulera votre événement
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="locationType">Type de lieu</Label>
                  <Select
                    id="locationType"
                    value={data.location.type}
                    onChange={(e) => updateLocation('type', e.target.value)}
                  >
                    <option value="physical">Présentiel</option>
                    <option value="virtual">Virtuel</option>
                    <option value="hybrid">Hybride</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="locationName">Nom du lieu</Label>
                  <Input
                    id="locationName"
                    value={data.location.name}
                    onChange={(e) => updateLocation('name', e.target.value)}
                    placeholder="Ex: Centre de conférences, Zoom, etc."
                  />
                </div>

                {(data.location.type === 'physical' || data.location.type === 'hybrid') && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Adresse physique</h4>
                    
                    <div>
                      <Label htmlFor="street">Rue *</Label>
                      <Input
                        id="street"
                        value={data.location.address?.street || ''}
                        onChange={(e) => updateAddress('street', e.target.value)}
                        placeholder="123 Rue de la Paix"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">Ville *</Label>
                        <Input
                          id="city"
                          value={data.location.address?.city || ''}
                          onChange={(e) => updateAddress('city', e.target.value)}
                          placeholder="Paris"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="postalCode">Code postal</Label>
                        <Input
                          id="postalCode"
                          value={data.location.address?.postalCode || ''}
                          onChange={(e) => updateAddress('postalCode', e.target.value)}
                          placeholder="75001"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="province">Province/État</Label>
                        <Input
                          id="province"
                          value={data.location.address?.province || ''}
                          onChange={(e) => updateAddress('province', e.target.value)}
                          placeholder="Île-de-France"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="country">Pays *</Label>
                        <Select
                          id="country"
                          value={data.location.address?.country || 'FR'}
                          onChange={(e) => updateAddress('country', e.target.value)}
                        >
                          {countries.map(country => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {(data.location.type === 'virtual' || data.location.type === 'hybrid') && (
                  <div>
                    <Label htmlFor="virtualUrl">Lien virtuel *</Label>
                    <Input
                      id="virtualUrl"
                      type="url"
                      value={data.location.virtualUrl || ''}
                      onChange={(e) => updateLocation('virtualUrl', e.target.value)}
                      placeholder="https://zoom.us/j/123456789"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  isActive ? "border-blue-500 bg-blue-500 text-white" :
                  isCompleted ? "border-green-500 bg-green-500 text-white" :
                  "border-gray-300 bg-white text-gray-400"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="ml-3 hidden sm:block">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive ? "text-blue-600" :
                    isCompleted ? "text-green-600" :
                    "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                </div>
                
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-4",
                    isCompleted ? "bg-green-500" : "bg-gray-300"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : handlePrevious}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Annuler' : 'Précédent'}
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!canGoNext() || loading}
        >
          {loading ? (
            'Création...'
          ) : currentStep === STEPS.length - 1 ? (
            'Créer le projet'
          ) : (
            <>
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default EnhancedProjectCreationWizard