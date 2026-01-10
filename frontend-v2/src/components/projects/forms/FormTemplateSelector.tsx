import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FormTemplate,
  COMPLETE_FORM_TEMPLATES,
  getAllTemplates
} from '@/types/form-builder.types'
import { 
  Search,
  Filter,
  Users,
  Briefcase,
  GraduationCap,
  Music,
  Coffee,
  Zap,
  Star,
  Eye,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormTemplateSelectorProps {
  onSelectTemplate: (template: FormTemplate) => void
  className?: string
}

const CATEGORY_ICONS = {
  'Professionnel': Briefcase,
  'Formation': GraduationCap,
  'Social': Users,
  'Divertissement': Music,
  'Networking': Coffee,
  'Sport': Zap
}

const TEMPLATE_ICONS = {
  '🎤': Briefcase,
  '🛠️': GraduationCap,
  '🎉': Music,
  '🏆': Zap,
  '🎵': Music,
  '📚': GraduationCap,
  '🤝': Coffee,
  '☕': Coffee
}

export const FormTemplateSelector: React.FC<FormTemplateSelectorProps> = ({
  onSelectTemplate,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null)

  const templates = getAllTemplates().map(({ id, template }) => template)
  
  const categories = Array.from(new Set(templates.map(t => t.category)))
  
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleUseTemplate = (template: FormTemplate) => {
    onSelectTemplate(template)
  }

  const renderTemplatePreview = (template: FormTemplate) => {
    const IconComponent = TEMPLATE_ICONS[template.icon as keyof typeof TEMPLATE_ICONS] || Briefcase
    
    return (
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <IconComponent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  {template.name}
                </CardTitle>
                <Badge variant="secondary" className="text-xs mt-1">
                  {template.category}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3" />
              {template.usageCount}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {template.description}
          </p>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">
                Sections ({template.sections.length})
              </p>
              <div className="space-y-1">
                {template.sections.map((section, sectionIndex) => {
                  // Get fields for this section
                  const sectionFields = template.fields.filter(field => field.sectionId === section.id)
                  
                  return (
                    <div key={sectionIndex} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{section.title}</span>
                      <span className="text-gray-400">{sectionFields.length} champs</span>
                    </div>
                  )
                })}
                {template.sections.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{template.sections.length - 3} autres sections
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewTemplate(template)
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Aperçu
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleUseTemplate(template)
              }}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-1" />
              Utiliser
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderDetailedPreview = (template: FormTemplate) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {React.createElement(TEMPLATE_ICONS[template.icon as keyof typeof TEMPLATE_ICONS] || Briefcase, {
                className: "h-5 w-5 text-blue-600"
              })}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleUseTemplate(template)}
              className="min-w-[120px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Utiliser ce modèle
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewTemplate(null)}
            >
              Fermer
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Structure du formulaire</h3>
              <div className="space-y-4">
                {template.sections.map((section, sectionIndex) => {
                  // Get fields for this section
                  const sectionFields = template.fields.filter(field => field.sectionId === section.id)
                  
                  return (
                    <Card key={sectionIndex}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        {section.description && (
                          <p className="text-sm text-gray-600">{section.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {sectionFields.map((field, fieldIndex) => (
                            <div key={fieldIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span className="text-sm font-medium">{field.label}</span>
                                {field.validation.required && (
                                  <span className="text-xs text-red-500">*</span>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Informations</h3>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Catégorie</p>
                        <Badge className="mt-1">{template.category}</Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sections</p>
                        <p className="text-sm text-gray-600">{template.sections.length} sections</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Champs total</p>
                        <p className="text-sm text-gray-600">
                          {template.fields.length} champs
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Utilisations</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">{template.usageCount} fois</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className={cn('space-y-6', className)}>
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500" />
            <Button
              variant={selectedCategory === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('')}
            >
              Tous
            </Button>
            {categories.map(category => {
              const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Briefcase
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex items-center gap-1"
                >
                  <IconComponent className="h-3 w-3" />
                  {category}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Aucun modèle trouvé
              </h3>
              <p className="text-gray-500">
                Essayez de modifier vos critères de recherche
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id}>
                {renderTemplatePreview(template)}
              </div>
            ))}
          </div>
        )}

        {/* Results Summary */}
        <div className="text-center text-sm text-gray-500">
          {filteredTemplates.length} modèle{filteredTemplates.length !== 1 ? 's' : ''} trouvé{filteredTemplates.length !== 1 ? 's' : ''}
          {selectedCategory && ` dans la catégorie "${selectedCategory}"`}
          {searchTerm && ` pour "${searchTerm}"`}
        </div>
      </div>

      {/* Detailed Preview Modal */}
      {previewTemplate && renderDetailedPreview(previewTemplate)}
    </>
  )
}

export default FormTemplateSelector