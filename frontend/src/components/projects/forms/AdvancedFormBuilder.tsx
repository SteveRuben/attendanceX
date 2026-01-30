import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  FormField, 
  FormSection,
  FormFieldType,
  FormFieldOption 
} from '@/types/form-builder.types'
import { 
  Plus, 
  Trash2, 
  Eye,
  Settings,
  Copy,
  ArrowUp,
  ArrowDown,
  FileText,
  Type,
  Mail,
  Phone,
  Calendar,
  Upload,
  CheckSquare,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdvancedFormBuilderProps {
  sections: FormSection[]
  onSectionsChange: (sections: FormSection[]) => void
  className?: string
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: React.ComponentType<any> }[] = [
  { type: FormFieldType.TEXT, label: 'Texte', icon: Type },
  { type: FormFieldType.EMAIL, label: 'Email', icon: Mail },
  { type: FormFieldType.PHONE, label: 'Téléphone', icon: Phone },
  { type: FormFieldType.TEXTAREA, label: 'Texte long', icon: FileText },
  { type: FormFieldType.SELECT, label: 'Liste déroulante', icon: List },
  { type: FormFieldType.MULTISELECT, label: 'Sélection multiple', icon: CheckSquare },
  { type: FormFieldType.CHECKBOX, label: 'Case à cocher', icon: CheckSquare },
  { type: FormFieldType.DATE, label: 'Date', icon: Calendar },
  { type: FormFieldType.FILE, label: 'Fichier', icon: Upload },
]

export const AdvancedFormBuilder: React.FC<AdvancedFormBuilderProps> = ({
  sections,
  onSectionsChange,
  className
}) => {
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Générer un ID unique
  const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Ajouter une nouvelle section
  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: generateId(),
      title: 'Nouvelle section',
      description: '',
      fields: [],
      order: sections.length,
      collapsible: false,
      defaultCollapsed: false
    }
    onSectionsChange([...sections, newSection])
  }, [sections, onSectionsChange])

  // Supprimer une section
  const deleteSection = useCallback((sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId)
    onSectionsChange(updatedSections)
  }, [sections, onSectionsChange])

  // Mettre à jour une section
  const updateSection = useCallback((sectionId: string, updates: Partial<FormSection>) => {
    const updatedSections = sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    )
    onSectionsChange(updatedSections)
  }, [sections, onSectionsChange])

  // Ajouter un champ à une section
  const addField = useCallback((sectionId: string, fieldType: FormFieldType) => {
    const newField: FormField = {
      id: generateId(),
      type: fieldType,
      label: `Nouveau champ ${fieldType}`,
      placeholder: '',
      required: false,
      order: 0,
      validation: {},
      conditionalLogic: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Ajouter des options par défaut pour les champs de sélection
    if (fieldType === FormFieldType.SELECT || fieldType === FormFieldType.MULTISELECT) {
      newField.options = []
    }

    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        const fields = [...section.fields, newField]
        return { ...section, fields }
      }
      return section
    })

    onSectionsChange(updatedSections)
    setSelectedField(newField.id)
  }, [sections, onSectionsChange])

  // Supprimer un champ
  const deleteField = useCallback((sectionId: string, fieldId: string) => {
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        }
      }
      return section
    })
    onSectionsChange(updatedSections)
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }, [sections, onSectionsChange, selectedField])

  // Mettre à jour un champ
  const updateField = useCallback((sectionId: string, fieldId: string, updates: Partial<FormField>) => {
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.map(field =>
            field.id === fieldId ? { ...field, ...updates } : field
          )
        }
      }
      return section
    })
    onSectionsChange(updatedSections)
  }, [sections, onSectionsChange])

  // Déplacer un champ
  const moveField = useCallback((sectionId: string, fieldId: string, direction: 'up' | 'down') => {
    const updatedSections = sections.map(section => {
      if (section.id === sectionId) {
        const fields = [...section.fields]
        const fieldIndex = fields.findIndex(f => f.id === fieldId)
        
        if (fieldIndex === -1) return section
        
        const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1
        if (newIndex < 0 || newIndex >= fields.length) return section
        
        // Échanger les positions
        const temp = fields[fieldIndex]
        fields[fieldIndex] = fields[newIndex]
        fields[newIndex] = temp
        
        return { ...section, fields }
      }
      return section
    })
    onSectionsChange(updatedSections)
  }, [sections, onSectionsChange])

  // Dupliquer un champ
  const duplicateField = useCallback((sectionId: string, fieldId: string) => {
    const section = sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    
    if (!field) return
    
    const duplicatedField: FormField = {
      ...field,
      id: generateId(),
      label: `${field.label} (copie)`
    }
    
    addField(sectionId, field.type)
    // Mettre à jour avec les données dupliquées
    setTimeout(() => {
      updateField(sectionId, duplicatedField.id, duplicatedField)
    }, 0)
  }, [sections, addField, updateField])

  // Rendu d'un champ dans l'éditeur
  const renderFieldEditor = (section: FormSection, field: FormField) => {
    const isSelected = selectedField === field.id
    const Icon = FIELD_TYPES.find(t => t.type === field.type)?.icon || Type

    return (
      <div
        key={field.id}
        className={cn(
          "border rounded-lg p-4 cursor-pointer transition-all",
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        )}
        onClick={() => setSelectedField(field.id)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{field.label}</span>
            {field.required && <Badge variant="destructive" className="text-xs">Requis</Badge>}
            {field.conditionalLogic && <Badge variant="secondary" className="text-xs">Conditionnel</Badge>}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                moveField(section.id, field.id, 'up')
              }}
              disabled={section.fields.indexOf(field) === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                moveField(section.id, field.id, 'down')
              }}
              disabled={section.fields.indexOf(field) === section.fields.length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                duplicateField(section.id, field.id)
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                deleteField(section.id, field.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">{field.placeholder || 'Aucun placeholder'}</p>
      </div>
    )
  }

  // Rendu d'une section
  const renderSection = (section: FormSection) => (
    <Card key={section.id} className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              value={section.title}
              onChange={(e) => updateSection(section.id, { title: e.target.value })}
              className="font-semibold text-lg border-none p-0 focus:ring-0"
              placeholder="Titre de la section"
            />
            <Input
              value={section.description}
              onChange={(e) => updateSection(section.id, { description: e.target.value })}
              className="text-sm text-gray-600 border-none p-0 focus:ring-0 mt-1"
              placeholder="Description de la section (optionnel)"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteSection(section.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Champs existants */}
        {section.fields.map(field => renderFieldEditor(section, field))}
        
        {/* Boutons d'ajout de champs */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">Ajouter un champ :</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                onClick={() => addField(section.id, type)}
                className="flex items-center gap-2 h-auto py-2"
              >
                <Icon className="h-3 w-3" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Rendu du panneau de propriétés
  const renderPropertiesPanel = () => {
    if (!selectedField) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Propriétés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Sélectionnez un champ pour modifier ses propriétés
            </p>
          </CardContent>
        </Card>
      )
    }

    const section = sections.find(s => s.fields.some(f => f.id === selectedField))
    const field = section?.fields.find(f => f.id === selectedField)
    
    if (!section || !field) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Propriétés du champ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Label */}
          <div>
            <Label>Label du champ</Label>
            <Input
              value={field.label}
              onChange={(e) => updateField(section.id, field.id, { label: e.target.value })}
              placeholder="Nom du champ"
            />
          </div>

          {/* Placeholder */}
          <div>
            <Label>Placeholder</Label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => updateField(section.id, field.id, { placeholder: e.target.value })}
              placeholder="Texte d'aide"
            />
          </div>

          {/* Requis */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={field.required}
              onChange={(e) => updateField(section.id, field.id, { required: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="required">Champ requis</Label>
          </div>

          {/* Options pour select/multiselect */}
          {(field.type === FormFieldType.SELECT || field.type === FormFieldType.MULTISELECT) && (
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])]
                        newOptions[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                        updateField(section.id, field.id, { options: newOptions })
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newOptions = field.options?.filter((_, i) => i !== index)
                        updateField(section.id, field.id, { options: newOptions })
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newOptions = [...(field.options || []), { 
                      id: `option_${Date.now()}`, 
                      label: `Option ${(field.options?.length || 0) + 1}`, 
                      value: `option_${(field.options?.length || 0) + 1}` 
                    }]
                    updateField(section.id, field.id, { options: newOptions })
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une option
                </Button>
              </div>
            </div>
          )}

          {/* Support d'image - Removed as it's not in the FormField type */}

          {/* Validation */}
          <div>
            <Label>Validation</Label>
            <div className="space-y-2">
              {field.type === FormFieldType.TEXT && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Min. caractères</Label>
                      <Input
                        type="number"
                        value={field.validation?.minLength || ''}
                        onChange={(e) => updateField(section.id, field.id, {
                          validation: { ...field.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max. caractères</Label>
                      <Input
                        type="number"
                        value={field.validation?.maxLength || ''}
                        onChange={(e) => updateField(section.id, field.id, {
                          validation: { ...field.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                        })}
                        placeholder="∞"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {/* Éditeur principal */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Constructeur de formulaire</h2>
            <p className="text-gray-600">Créez votre formulaire d'inscription personnalisé</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={previewMode ? "default" : "outline"}
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? 'Édition' : 'Aperçu'}
            </Button>
            <Button onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une section
            </Button>
          </div>
        </div>

        {/* Sections */}
        {sections.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune section
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Commencez par ajouter une section à votre formulaire
              </p>
              <Button onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première section
              </Button>
            </CardContent>
          </Card>
        ) : (
          sections.map(renderSection)
        )}
      </div>

      {/* Panneau de propriétés */}
      <div className="space-y-6">
        {renderPropertiesPanel()}
      </div>
    </div>
  )
}

export default AdvancedFormBuilder