import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  FormSection,
  FormField,
  FormFieldType,
  FIELD_TEMPLATES
} from '@/types/form-builder.types'
import { 
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Clock,
  Upload,
  Link,
  Star,
  Sliders,
  Edit3,
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormSectionEditorProps {
  section: FormSection
  isSelected: boolean
  selectedFieldId?: string
  onSelect: () => void
  onUpdate: (updates: Partial<FormSection>) => void
  onDelete: () => void
  onAddField: (fieldType: FormFieldType) => void
  onSelectField: (fieldId: string) => void
  onUpdateField: (fieldId: string, updates: Partial<FormField>) => void
  onDeleteField: (fieldId: string) => void
  className?: string
}

const FIELD_TYPE_ICONS = {
  [FormFieldType.TEXT]: Type,
  [FormFieldType.EMAIL]: Mail,
  [FormFieldType.PHONE]: Phone,
  [FormFieldType.NUMBER]: Hash,
  [FormFieldType.TEXTAREA]: AlignLeft,
  [FormFieldType.SELECT]: List,
  [FormFieldType.MULTISELECT]: List,
  [FormFieldType.CHECKBOX]: CheckSquare,
  [FormFieldType.RADIO]: CheckSquare,
  [FormFieldType.DATE]: Calendar,
  [FormFieldType.TIME]: Clock,
  [FormFieldType.DATETIME]: Calendar,
  [FormFieldType.FILE]: Upload,
  [FormFieldType.URL]: Link,
  [FormFieldType.RATING]: Star,
  [FormFieldType.SLIDER]: Sliders
}

const FIELD_TYPE_LABELS = {
  [FormFieldType.TEXT]: 'Texte',
  [FormFieldType.EMAIL]: 'Email',
  [FormFieldType.PHONE]: 'Téléphone',
  [FormFieldType.NUMBER]: 'Nombre',
  [FormFieldType.TEXTAREA]: 'Zone de texte',
  [FormFieldType.SELECT]: 'Liste déroulante',
  [FormFieldType.MULTISELECT]: 'Sélection multiple',
  [FormFieldType.CHECKBOX]: 'Case à cocher',
  [FormFieldType.RADIO]: 'Boutons radio',
  [FormFieldType.DATE]: 'Date',
  [FormFieldType.TIME]: 'Heure',
  [FormFieldType.DATETIME]: 'Date et heure',
  [FormFieldType.FILE]: 'Fichier',
  [FormFieldType.URL]: 'URL',
  [FormFieldType.RATING]: 'Notation',
  [FormFieldType.SLIDER]: 'Curseur'
}

const QUICK_ADD_FIELDS = [
  { type: FormFieldType.TEXT, label: 'Texte', template: 'fullName' },
  { type: FormFieldType.EMAIL, label: 'Email', template: 'email' },
  { type: FormFieldType.PHONE, label: 'Téléphone', template: 'phone' },
  { type: FormFieldType.TEXTAREA, label: 'Zone de texte', template: 'comments' },
  { type: FormFieldType.SELECT, label: 'Liste', template: null },
  { type: FormFieldType.CHECKBOX, label: 'Case à cocher', template: null }
]

export const FormSectionEditor: React.FC<FormSectionEditorProps> = ({
  section,
  isSelected,
  selectedFieldId,
  onSelect,
  onUpdate,
  onDelete,
  onAddField,
  onSelectField,
  onUpdateField,
  onDeleteField,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(isSelected)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(section.title)
  const [showFieldMenu, setShowFieldMenu] = useState(false)

  React.useEffect(() => {
    if (isSelected) {
      setIsExpanded(true)
    }
  }, [isSelected])

  const handleTitleSave = () => {
    onUpdate({ title: editTitle })
    setIsEditing(false)
  }

  const handleTitleCancel = () => {
    setEditTitle(section.title)
    setIsEditing(false)
  }

  const handleAddFieldFromTemplate = (fieldType: FormFieldType, templateKey?: string) => {
    onAddField(fieldType)
    setShowFieldMenu(false)
    
    // If there's a template, apply it after the field is created
    if (templateKey && FIELD_TEMPLATES[templateKey]) {
      setTimeout(() => {
        const newField = section.fields[section.fields.length - 1]
        if (newField) {
          onUpdateField(newField.id, FIELD_TEMPLATES[templateKey])
        }
      }, 100)
    }
  }

  const renderField = (field: FormField) => {
    const Icon = FIELD_TYPE_ICONS[field.type]
    const isFieldSelected = selectedFieldId === field.id

    return (
      <div
        key={field.id}
        className={cn(
          'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
          isFieldSelected 
            ? 'bg-blue-100 border border-blue-300' 
            : 'hover:bg-gray-100'
        )}
        onClick={() => onSelectField(field.id)}
        data-cy="field-item"
        data-field-id={field.id}
      >
        <GripVertical className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="p-1 bg-gray-100 rounded">
          <Icon className="h-3 w-3 text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{field.label}</span>
            {field.required && (
              <span className="text-xs text-red-500">*</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{FIELD_TYPE_LABELS[field.type]}</span>
            {field.validation && (
              <span className="px-1 bg-gray-200 rounded">validé</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              // Duplicate field logic could go here
            }}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteField(field.id)
            }}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn(
      'transition-all duration-200',
      isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm',
      className
    )}>
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave()
                    if (e.key === 'Escape') handleTitleCancel()
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={handleTitleSave}>
                  ✓
                </Button>
                <Button size="sm" variant="ghost" onClick={handleTitleCancel}>
                  ✕
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-medium truncate">{section.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {section.fields.length} champ{section.fields.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {section.description && (
          <p className="text-xs text-gray-600 mt-1 ml-8">
            {section.description}
          </p>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {section.fields.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <div className="mb-3">
                  <List className="h-8 w-8 mx-auto text-gray-400" />
                </div>
                <p className="text-sm mb-3">Aucun champ dans cette section</p>
                <div className="relative">
                  <Button
                    size="sm"
                    onClick={() => setShowFieldMenu(!showFieldMenu)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un champ
                  </Button>
                  
                  {showFieldMenu && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10">
                      <div className="p-3">
                        <h4 className="text-sm font-medium mb-3">Champs rapides</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {QUICK_ADD_FIELDS.map(({ type, label, template }) => {
                            const Icon = FIELD_TYPE_ICONS[type]
                            return (
                              <Button
                                key={type}
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddFieldFromTemplate(type, template || undefined)}
                                className="flex items-center gap-2 justify-start h-8"
                              >
                                <Icon className="h-3 w-3" />
                                <span className="text-xs">{label}</span>
                              </Button>
                            )
                          })}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="text-sm font-medium mb-2">Tous les types</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => {
                              const Icon = FIELD_TYPE_ICONS[type as FormFieldType]
                              return (
                                <Button
                                  key={type}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddFieldFromTemplate(type as FormFieldType)}
                                  className="w-full flex items-center gap-2 justify-start h-7 text-xs"
                                >
                                  <Icon className="h-3 w-3" />
                                  {label}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {section.fields
                  .sort((a, b) => a.order - b.order)
                  .map(renderField)}
                
                <div className="pt-2 border-t">
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFieldMenu(!showFieldMenu)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un champ
                    </Button>
                    
                    {showFieldMenu && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10">
                        <div className="p-3">
                          <h4 className="text-sm font-medium mb-3">Champs rapides</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {QUICK_ADD_FIELDS.map(({ type, label, template }) => {
                              const Icon = FIELD_TYPE_ICONS[type]
                              return (
                                <Button
                                  key={type}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddFieldFromTemplate(type, template || undefined)}
                                  className="flex items-center gap-2 justify-start h-8"
                                >
                                  <Icon className="h-3 w-3" />
                                  <span className="text-xs">{label}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default FormSectionEditor