import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FormField, 
  FormFieldType, 
  FormFieldOption,
  FormFieldValidation,
  ConditionalLogic
} from '@/types/form-builder.types'
import { 
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
  Trash2,
  Plus,
  Settings,
  Eye,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldEditorProps {
  field: FormField
  onUpdate: (updates: Partial<FormField>) => void
  onDelete: () => void
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

export const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  onUpdate,
  onDelete,
  className
}) => {
  const [activeTab, setActiveTab] = useState('basic')
  const Icon = FIELD_TYPE_ICONS[field.type]

  const handleBasicUpdate = (key: keyof FormField, value: any) => {
    onUpdate({ [key]: value })
  }

  const handleValidationUpdate = (key: keyof FormFieldValidation, value: any) => {
    onUpdate({
      validation: {
        ...field.validation,
        [key]: value
      }
    })
  }

  const handleAddOption = () => {
    const newOption: FormFieldOption = {
      id: `option_${Date.now()}`,
      label: 'Nouvelle option',
      value: `option_${field.options?.length || 0 + 1}`
    }
    onUpdate({
      options: [...(field.options || []), newOption]
    })
  }

  const handleUpdateOption = (optionId: string, updates: Partial<FormFieldOption>) => {
    onUpdate({
      options: field.options?.map(option =>
        option.id === optionId ? { ...option, ...updates } : option
      )
    })
  }

  const handleDeleteOption = (optionId: string) => {
    onUpdate({
      options: field.options?.filter(option => option.id !== optionId)
    })
  }

  const needsOptions = [
    FormFieldType.SELECT,
    FormFieldType.MULTISELECT,
    FormFieldType.RADIO
  ].includes(field.type)

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">{field.label}</h3>
              <p className="text-sm text-muted-foreground">
                {FIELD_TYPE_LABELS[field.type]}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="styling" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Style
            </TabsTrigger>
          </TabsList>

          <div className="px-4 pb-4">
            <TabsContent value="basic" className="space-y-6 mt-0">
              {/* Basic Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Paramètres de base</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fieldLabel">Libellé du champ *</Label>
                    <Input
                      id="fieldLabel"
                      value={field.label}
                      onChange={(e) => handleBasicUpdate('label', e.target.value)}
                      placeholder="Libellé du champ"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fieldPlaceholder">Texte d'aide</Label>
                    <Input
                      id="fieldPlaceholder"
                      value={field.placeholder || ''}
                      onChange={(e) => handleBasicUpdate('placeholder', e.target.value)}
                      placeholder="Texte affiché dans le champ"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fieldDescription">Description</Label>
                    <textarea
                      id="fieldDescription"
                      value={field.description || ''}
                      onChange={(e) => handleBasicUpdate('description', e.target.value)}
                      placeholder="Description ou instructions pour ce champ"
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fieldType">Type de champ</Label>
                    <Select
                      id="fieldType"
                      value={field.type}
                      onChange={(e) => handleBasicUpdate('type', e.target.value as FormFieldType)}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fieldRequired"
                      checked={field.required}
                      onChange={(e) => handleBasicUpdate('required', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="fieldRequired">Champ obligatoire</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Options for select/radio fields */}
              {needsOptions && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Options</CardTitle>
                      <Button size="sm" onClick={handleAddOption}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {field.options?.map((option, index) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <Input
                              value={option.label}
                              onChange={(e) => handleUpdateOption(option.id, { label: e.target.value })}
                              placeholder="Libellé"
                            />
                            <Input
                              value={option.value}
                              onChange={(e) => handleUpdateOption(option.id, { value: e.target.value })}
                              placeholder="Valeur"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOption(option.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {(!field.options || field.options.length === 0) && (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">Aucune option définie</p>
                          <Button size="sm" onClick={handleAddOption} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une option
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="validation" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Règles de validation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Text length validation */}
                  {[FormFieldType.TEXT, FormFieldType.TEXTAREA, FormFieldType.EMAIL].includes(field.type) && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="minLength">Longueur minimale</Label>
                          <Input
                            id="minLength"
                            type="number"
                            min="0"
                            value={field.validation?.minLength || ''}
                            onChange={(e) => handleValidationUpdate('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxLength">Longueur maximale</Label>
                          <Input
                            id="maxLength"
                            type="number"
                            min="1"
                            value={field.validation?.maxLength || ''}
                            onChange={(e) => handleValidationUpdate('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                            placeholder="Illimité"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Number validation */}
                  {field.type === FormFieldType.NUMBER && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minValue">Valeur minimale</Label>
                        <Input
                          id="minValue"
                          type="number"
                          value={field.validation?.min || ''}
                          onChange={(e) => handleValidationUpdate('min', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Aucune limite"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxValue">Valeur maximale</Label>
                        <Input
                          id="maxValue"
                          type="number"
                          value={field.validation?.max || ''}
                          onChange={(e) => handleValidationUpdate('max', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="Aucune limite"
                        />
                      </div>
                    </div>
                  )}

                  {/* File validation */}
                  {field.type === FormFieldType.FILE && (
                    <>
                      <div>
                        <Label htmlFor="fileTypes">Types de fichiers autorisés</Label>
                        <Input
                          id="fileTypes"
                          value={field.validation?.fileTypes?.join(', ') || ''}
                          onChange={(e) => handleValidationUpdate('fileTypes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                          placeholder="pdf, jpg, png, doc"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Séparez les extensions par des virgules
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="maxFileSize">Taille maximale (MB)</Label>
                        <Input
                          id="maxFileSize"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={field.validation?.maxFileSize || ''}
                          onChange={(e) => handleValidationUpdate('maxFileSize', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="10"
                        />
                      </div>
                    </>
                  )}

                  {/* Custom pattern */}
                  <div>
                    <Label htmlFor="pattern">Expression régulière</Label>
                    <Input
                      id="pattern"
                      value={field.validation?.pattern || ''}
                      onChange={(e) => handleValidationUpdate('pattern', e.target.value)}
                      placeholder="^[A-Za-z0-9]+$"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pattern de validation personnalisé (regex)
                    </p>
                  </div>

                  {/* Custom error message */}
                  <div>
                    <Label htmlFor="customMessage">Message d'erreur personnalisé</Label>
                    <Input
                      id="customMessage"
                      value={field.validation?.customMessage || ''}
                      onChange={(e) => handleValidationUpdate('customMessage', e.target.value)}
                      placeholder="Message affiché en cas d'erreur"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="styling" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Apparence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fieldWidth">Largeur du champ</Label>
                    <Select
                      id="fieldWidth"
                      value={field.styling?.width || 'full'}
                      onChange={(e) => onUpdate({
                        styling: {
                          ...field.styling,
                          width: e.target.value as 'full' | 'half' | 'third' | 'quarter'
                        }
                      })}
                    >
                      <option value="full">Pleine largeur</option>
                      <option value="half">Demi-largeur</option>
                      <option value="third">Un tiers</option>
                      <option value="quarter">Un quart</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customClass">Classes CSS personnalisées</Label>
                    <Input
                      id="customClass"
                      value={field.styling?.className || ''}
                      onChange={(e) => onUpdate({
                        styling: {
                          ...field.styling,
                          className: e.target.value
                        }
                      })}
                      placeholder="custom-class another-class"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default FormFieldEditor