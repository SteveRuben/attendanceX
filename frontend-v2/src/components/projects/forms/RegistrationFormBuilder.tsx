import React, { useReducer, useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  RegistrationFormBuilder as FormBuilderType,
  FormBuilderState,
  FormBuilderAction,
  FormSection,
  FormField,
  FormFieldType,
  FormTemplate,
  createNewSection,
  createNewField,
  getDefaultFormSettings,
  getDefaultFormHeader,
  getDefaultFormFooter,
  generatePublicationLinks
} from '@/types/form-builder.types'
import { FormFieldEditor } from '@/components/projects/forms/FormFieldEditor'
import { FormPreview } from '@/components/projects/forms/FormPreview'
import { FormTemplateSelector } from '@/components/projects/forms/FormTemplateSelector'
import { FormSectionEditor } from '@/components/projects/forms/FormSectionEditor'
import { FormHeaderFooterEditor } from '@/components/projects/forms/FormHeaderFooterEditor'
import { FormPublicationManager } from '@/components/projects/forms/FormPublicationManager'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ProjectService } from '@/services/projectService'
import { 
  Plus, 
  Eye, 
  Settings, 
  Save, 
  Undo, 
  Redo,
  Layout,
  Palette,
  Code,
  Share,
  Image as ImageIcon,
  Type,
  Link as LinkIcon,
  FileText,
  Paintbrush
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RegistrationFormBuilderProps {
  projectId: string
  initialForm?: FormBuilderType
  onSave?: (form: FormBuilderType) => Promise<void>
  onPublish?: (form: FormBuilderType) => Promise<void>
  className?: string
}

// Form builder reducer
const formBuilderReducer = (state: FormBuilderState, action: FormBuilderAction): FormBuilderState => {
  switch (action.type) {
    case 'SET_FORM':
      return {
        ...state,
        form: action.payload,
        isDirty: false
      }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        form: {
          ...state.form,
          settings: { ...state.form.settings, ...action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_HEADER':
      return {
        ...state,
        form: {
          ...state.form,
          header: { ...getDefaultFormHeader(), ...state.form.header, ...action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_FOOTER':
      return {
        ...state,
        form: {
          ...state.form,
          footer: { ...getDefaultFormFooter(), ...state.form.footer, ...action.payload }
        },
        isDirty: true
      }

    case 'GENERATE_PUBLICATION_LINKS':
      return {
        ...state,
        form: {
          ...state.form,
          publicationLinks: action.payload
        },
        isDirty: true
      }

    case 'ADD_SECTION':
      const newSection = createNewSection('Nouvelle Section', state.form.sections.length)
      return {
        ...state,
        form: {
          ...state.form,
          sections: [...state.form.sections, newSection]
        },
        selectedSectionId: newSection.id,
        isDirty: true
      }

    case 'UPDATE_SECTION':
      return {
        ...state,
        form: {
          ...state.form,
          sections: state.form.sections.map(section =>
            section.id === action.payload.id
              ? { ...section, ...action.payload.updates }
              : section
          )
        },
        isDirty: true
      }

    case 'DELETE_SECTION':
      return {
        ...state,
        form: {
          ...state.form,
          sections: state.form.sections.filter(section => section.id !== action.payload)
        },
        selectedSectionId: state.selectedSectionId === action.payload ? undefined : state.selectedSectionId,
        isDirty: true
      }

    case 'ADD_FIELD':
      const { sectionId, fieldType } = action.payload
      const section = state.form.sections.find(s => s.id === sectionId)
      if (!section) return state

      const newField = createNewField(fieldType, sectionId, section.fields.length)
      return {
        ...state,
        form: {
          ...state.form,
          sections: state.form.sections.map(s =>
            s.id === sectionId
              ? { ...s, fields: [...s.fields, newField] }
              : s
          )
        },
        selectedFieldId: newField.id,
        isDirty: true
      }

    case 'UPDATE_FIELD':
      return {
        ...state,
        form: {
          ...state.form,
          sections: state.form.sections.map(section => ({
            ...section,
            fields: section.fields.map(field =>
              field.id === action.payload.id
                ? { ...field, ...action.payload.updates, updatedAt: new Date() }
                : field
            )
          }))
        },
        isDirty: true
      }

    case 'DELETE_FIELD':
      return {
        ...state,
        form: {
          ...state.form,
          sections: state.form.sections.map(section => ({
            ...section,
            fields: section.fields.filter(field => field.id !== action.payload)
          }))
        },
        selectedFieldId: state.selectedFieldId === action.payload ? undefined : state.selectedFieldId,
        isDirty: true
      }

    case 'SELECT_FIELD':
      return {
        ...state,
        selectedFieldId: action.payload,
        selectedSectionId: undefined
      }

    case 'SELECT_SECTION':
      return {
        ...state,
        selectedSectionId: action.payload,
        selectedFieldId: undefined
      }

    case 'TOGGLE_PREVIEW':
      return {
        ...state,
        previewMode: !state.previewMode
      }

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload
      }

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.message
        }
      }

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {}
      }

    default:
      return state
  }
}

export const RegistrationFormBuilder: React.FC<RegistrationFormBuilderProps> = ({
  projectId,
  initialForm,
  onSave,
  onPublish,
  className
}) => {
  const [activeTab, setActiveTab] = useState('builder')
  
  // Initialize form builder state
  const initialState: FormBuilderState = {
    form: initialForm || {
      id: `form_${Date.now()}`,
      projectId,
      settings: getDefaultFormSettings(),
      sections: [],
      fields: [],
      status: 'draft',
      version: 1,
      createdBy: 'current-user',
      tenantId: 'current-tenant',
      header: getDefaultFormHeader(),
      footer: getDefaultFormFooter(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    previewMode: false,
    isDirty: false,
    isSaving: false,
    errors: {},
    history: [],
    historyIndex: -1
  }

  const [state, dispatch] = useReducer(formBuilderReducer, initialState)

  // Auto-save functionality
  useEffect(() => {
    if (state.isDirty && onSave) {
      const timeoutId = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [state.isDirty, state.form])

  const handleSave = useCallback(async () => {
    if (!onSave) {
      // Utiliser le service par défaut si pas de onSave fourni
      try {
        dispatch({ type: 'SET_SAVING', payload: true })
        const result = await ProjectService.saveFormBuilderForm(projectId, state.form)
        dispatch({ type: 'SET_FORM', payload: { ...state.form, ...result } })
        console.log('Form saved successfully via ProjectService')
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { field: 'save', message: 'Erreur lors de la sauvegarde' }
        })
        console.error('Save error:', error)
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false })
      }
      return
    }

    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      await onSave(state.form)
      dispatch({ type: 'SET_FORM', payload: state.form })
      console.log('Form saved successfully')
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { field: 'save', message: 'Erreur lors de la sauvegarde' }
      })
      console.error('Save error:', error)
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.form, onSave, projectId])

  const handlePublish = useCallback(async () => {
    if (!onPublish) {
      // Utiliser le service par défaut si pas de onPublish fourni
      try {
        dispatch({ type: 'SET_SAVING', payload: true })
        
        // Generate publication links if they don't exist
        if (!state.form.publicationLinks) {
          const links = generatePublicationLinks(state.form.id)
          dispatch({ type: 'GENERATE_PUBLICATION_LINKS', payload: links })
        }

        const publishedForm = {
          ...state.form,
          status: 'published',
          publicationLinks: state.form.publicationLinks || generatePublicationLinks(state.form.id),
          updatedAt: new Date()
        }
        
        const result = await ProjectService.publishFormBuilderForm(projectId, publishedForm)
        dispatch({ type: 'SET_FORM', payload: { ...publishedForm, ...result } })
        console.log('Form published successfully via ProjectService')
      } catch (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { field: 'publish', message: 'Erreur lors de la publication' }
        })
        console.error('Publish error:', error)
      } finally {
        dispatch({ type: 'SET_SAVING', payload: false })
      }
      return
    }

    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      // Generate publication links if they don't exist
      if (!state.form.publicationLinks) {
        const links = generatePublicationLinks(state.form.id)
        dispatch({ type: 'GENERATE_PUBLICATION_LINKS', payload: links })
      }

      const publishedForm: FormBuilderType = {
        ...state.form,
        status: 'published',
        publicationLinks: state.form.publicationLinks || generatePublicationLinks(state.form.id),
        updatedAt: new Date()
      }
      await onPublish(publishedForm)
      dispatch({ type: 'SET_FORM', payload: publishedForm })
      console.log('Form published successfully')
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { field: 'publish', message: 'Erreur lors de la publication' }
      })
      console.error('Publish error:', error)
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.form, onPublish, projectId])

  const handleGenerateLinks = useCallback(async () => {
    // Récupérer les informations de l'organisation depuis le contexte ou les props
    const organizationData = {
      subdomain: 'demo-org', // À récupérer depuis le tenant/organization
      name: 'Organisation Demo'
    }
    
    const links = generatePublicationLinks(state.form.id, organizationData)
    dispatch({ type: 'GENERATE_PUBLICATION_LINKS', payload: links })
    return links
  }, [state.form.id])

  const handleUpdateLinks = useCallback(async (updates: any) => {
    dispatch({ 
      type: 'GENERATE_PUBLICATION_LINKS', 
      payload: { ...state.form.publicationLinks, ...updates }
    })
  }, [state.form.publicationLinks])

  const handleAddSection = useCallback(() => {
    dispatch({ type: 'ADD_SECTION' })
  }, [])

  const handleAddField = useCallback((sectionId: string, fieldType: FormFieldType) => {
    dispatch({ type: 'ADD_FIELD', payload: { sectionId, fieldType } })
  }, [])

  const selectedField = state.selectedFieldId 
    ? state.form.sections
        .flatMap((s: FormSection) => s.fields)
        .find((f: FormField) => f.id === state.selectedFieldId)
    : undefined

  const selectedSection = state.selectedSectionId
    ? state.form.sections.find((s: FormSection) => s.id === state.selectedSectionId)
    : undefined

  if (state.previewMode) {
    return (
      <div className={cn('h-full', className)}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Aperçu du formulaire</h2>
          <Button
            variant="outline"
            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
          >
            <Layout className="h-4 w-4 mr-2" />
            Retour à l'éditeur
          </Button>
        </div>
        <div className="p-6">
          <FormPreview form={state.form} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold" data-cy="form-builder-title">{state.form.settings.title}</h2>
            <p className="text-sm text-muted-foreground" data-cy="form-builder-stats">
              {state.form.sections.length} sections • {state.form.sections.reduce((acc: number, s: FormSection) => acc + s.fields.length, 0)} champs
            </p>
          </div>
          {state.isDirty && (
            <div className="flex items-center gap-2 text-sm text-orange-600" data-cy="unsaved-indicator">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Non sauvegardé
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
            data-cy="preview-button"
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Créer une nouvelle fenêtre avec l'aperçu du formulaire
              const previewWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
              if (previewWindow) {
                previewWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Aperçu - ${state.form.settings.title}</title>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>
                        body { font-family: Inter, system-ui, sans-serif; }
                      </style>
                    </head>
                    <body class="bg-gray-50 p-8">
                      <div class="max-w-4xl mx-auto">
                        <div class="bg-white rounded-lg shadow-sm p-8">
                          <div class="text-center mb-8">
                            <h1 class="text-3xl font-bold text-gray-900 mb-4">
                              ${state.form.settings.title}
                            </h1>
                            <p class="text-lg text-gray-600">
                              ${state.form.settings.description || ''}
                            </p>
                          </div>
                          <div class="text-center text-gray-500">
                            <p>Aperçu du formulaire - Fonctionnalité en cours de développement</p>
                            <p class="mt-2">Utilisez l'onglet "Aperçu" dans l'éditeur pour voir le formulaire complet</p>
                          </div>
                        </div>
                      </div>
                    </body>
                  </html>
                `)
                previewWindow.document.close()
              }
            }}
            data-cy="preview-new-tab-button"
          >
            <Eye className="h-4 w-4 mr-2" />
            Nouvel onglet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={state.isSaving || !state.isDirty}
            data-cy="save-form-button"
          >
            <Save className="h-4 w-4 mr-2" />
            {state.isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={state.isSaving || !state.form.sections.length}
            data-cy="publish-form-button"
          >
            <Share className="h-4 w-4 mr-2" />
            Publier
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form Structure */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Configuration</h3>
              <Button size="sm" onClick={handleAddSection} data-cy="add-section-button">
                <Plus className="h-4 w-4 mr-2" />
                Section
              </Button>
            </div>
            
            {/* Form name editor */}
            <div className="space-y-2">
              <Label htmlFor="formName">Nom du formulaire</Label>
              <Input
                id="formName"
                value={state.form.settings.title}
                onChange={(e) => dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { title: e.target.value }
                })}
                placeholder="Nom du formulaire"
                data-cy="form-title-input"
              />
            </div>

            {/* Theme Settings */}
            <div className="space-y-2 mt-4 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Couleur principale
              </Label>
              <ColorPicker
                value={state.form.settings.theme?.primaryColor || '#3B82F6'}
                onChange={(color) => dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: {
                    theme: {
                      ...state.form.settings.theme,
                      primaryColor: color
                    }
                  }
                })}
                label="Couleur du thème du formulaire"
                data-cy="theme-color-picker"
              />
            </div>
          </div>

          {/* Sections List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-cy="section-list">
            {state.form.sections.length === 0 ? (
              <div className="text-center py-8" data-cy="empty-sections-state">
                <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-500 mb-4">
                  Aucune section créée
                </p>
                <Button size="sm" onClick={handleAddSection} data-cy="create-first-section-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une section
                </Button>
              </div>
            ) : (
              state.form.sections.map((section) => (
                <FormSectionEditor
                  key={section.id}
                  section={section}
                  isSelected={state.selectedSectionId === section.id}
                  selectedFieldId={state.selectedFieldId}
                  onSelect={() => dispatch({ type: 'SELECT_SECTION', payload: section.id })}
                  onUpdate={(updates: Partial<FormSection>) => dispatch({
                    type: 'UPDATE_SECTION',
                    payload: { id: section.id, updates }
                  })}
                  onDelete={() => dispatch({ type: 'DELETE_SECTION', payload: section.id })}
                  onAddField={(fieldType: FormFieldType) => handleAddField(section.id, fieldType)}
                  onSelectField={(fieldId: string) => dispatch({ type: 'SELECT_FIELD', payload: fieldId })}
                  onUpdateField={(fieldId: string, updates: Partial<FormField>) => dispatch({
                    type: 'UPDATE_FIELD',
                    payload: { id: fieldId, updates }
                  })}
                  onDeleteField={(fieldId: string) => dispatch({ type: 'DELETE_FIELD', payload: fieldId })}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Tabbed Interface */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
              <TabsTrigger value="builder" className="flex items-center gap-2" data-cy="builder-tab">
                <Settings className="h-4 w-4" />
                Éditeur
              </TabsTrigger>
              <TabsTrigger value="design" className="flex items-center gap-2" data-cy="design-tab">
                <Paintbrush className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2" data-cy="preview-tab">
                <Eye className="h-4 w-4" />
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="publication" className="flex items-center gap-2" data-cy="publication-tab">
                <Share className="h-4 w-4" />
                Publication
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2" data-cy="templates-tab">
                <FileText className="h-4 w-4" />
                Modèles
              </TabsTrigger>
            </TabsList>

            {/* Builder Tab */}
            <TabsContent value="builder" className="flex-1 overflow-hidden">
              {selectedField ? (
                <FormFieldEditor
                  field={selectedField}
                  onUpdate={(updates: Partial<FormField>) => dispatch({
                    type: 'UPDATE_FIELD',
                    payload: { id: selectedField.id, updates }
                  })}
                  onDelete={() => dispatch({ type: 'DELETE_FIELD', payload: selectedField.id })}
                />
              ) : selectedSection ? (
                <div className="p-6" data-cy="section-editor">
                  <h3 className="text-lg font-semibold mb-4">Configuration de la section</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sectionTitle">Titre de la section</Label>
                      <Input
                        id="sectionTitle"
                        value={selectedSection.title}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_SECTION',
                          payload: {
                            id: selectedSection.id,
                            updates: { title: e.target.value }
                          }
                        })}
                        data-cy="section-title-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectionDescription">Description</Label>
                      <textarea
                        id="sectionDescription"
                        value={selectedSection.description || ''}
                        onChange={(e) => dispatch({
                          type: 'UPDATE_SECTION',
                          payload: {
                            id: selectedSection.id,
                            updates: { description: e.target.value }
                          }
                        })}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Description de la section (optionnel)"
                        data-cy="section-description-input"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center" data-cy="empty-builder-state">
                  <div className="text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Configurez votre formulaire</h3>
                    <p className="text-gray-500 mb-4">
                      Sélectionnez une section ou un champ pour commencer l'édition
                    </p>
                    <Button onClick={handleAddSection} data-cy="add-section-from-empty-button">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une section
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Design Tab */}
            <TabsContent value="design" className="flex-1 overflow-y-auto">
              <div className="p-6">
                <FormHeaderFooterEditor
                  header={state.form.header || getDefaultFormHeader()}
                  footer={state.form.footer || getDefaultFormFooter()}
                  onUpdateHeader={(updates) => dispatch({ type: 'UPDATE_HEADER', payload: updates })}
                  onUpdateFooter={(updates) => dispatch({ type: 'UPDATE_FOOTER', payload: updates })}
                />
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="flex-1 overflow-y-auto">
              <div className="p-6" data-cy="form-preview">
                <FormPreview form={state.form} />
              </div>
            </TabsContent>

            {/* Publication Tab */}
            <TabsContent value="publication" className="flex-1 overflow-y-auto">
              <div className="p-6">
                <FormPublicationManager
                  formId={state.form.id}
                  publicationLinks={state.form.publicationLinks}
                  onGenerateLinks={handleGenerateLinks}
                  onUpdateLinks={handleUpdateLinks}
                />
              </div>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="text-center mb-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Modèles de formulaire</h3>
                  <p className="text-gray-500 mb-6">
                    Utilisez un modèle prédéfini pour démarrer rapidement
                  </p>
                </div>
                <FormTemplateSelector
                  onSelectTemplate={(template: FormTemplate) => {
                    // Apply template to form
                    const formWithTemplate = {
                      ...state.form,
                      sections: template.sections ? template.sections.map((section: FormSection, index: number) => ({
                        ...section,
                        id: `section_${Date.now()}_${index}`,
                        fields: template.fields ? template.fields
                          .filter((field: FormField) => field.sectionId === section.id)
                          .map((field: FormField, fieldIndex: number) => ({
                            ...field,
                            id: `field_${Date.now()}_${index}_${fieldIndex}`,
                            createdAt: new Date(),
                            updatedAt: new Date()
                          })) : []
                      })) : [],
                      settings: {
                        ...state.form.settings
                      }
                    }
                    dispatch({ type: 'SET_FORM', payload: formWithTemplate })
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default RegistrationFormBuilder