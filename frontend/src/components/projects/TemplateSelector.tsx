import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectTemplate, PROJECT_TEMPLATES } from '@/types/project.types'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  selectedTemplate?: ProjectTemplate
  onSelect: (template: ProjectTemplate) => void
  className?: string
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelect,
  className
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Object.entries(PROJECT_TEMPLATES).map(([key, template]) => {
        const templateKey = key as ProjectTemplate
        const isSelected = selectedTemplate === templateKey
        
        return (
          <Card
            key={templateKey}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              isSelected 
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'hover:shadow-lg hover:border-gray-300'
            )}
            onClick={() => onSelect(templateKey)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{template.name}</span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'text-xs',
                        `bg-${template.color}-100 text-${template.color}-800 dark:bg-${template.color}-900/30 dark:text-${template.color}-200`
                      )}
                    >
                      {template.phases.length} phases
                    </Badge>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-3">
                {template.description}
              </p>
              
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Équipes types :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.teams.slice(0, 3).map((team, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {team.name}
                      </Badge>
                    ))}
                    {template.teams.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.teams.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Phases :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.phases.map((phase, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {phase.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default TemplateSelector