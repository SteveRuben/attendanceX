import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  RegistrationFormBuilder,
  FormField,
  FormFieldType,
  FormSection
} from '@/types/form-builder.types'
import { 
  Calendar,
  Clock,
  Upload,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormPreviewProps {
  form: RegistrationFormBuilder
  className?: string
}

interface FormData {
  [key: string]: any
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  form,
  className
}) => {
  const [formData, setFormData] = useState<FormData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }))
    }
  }

  const validateField = (field: FormField, value: any): string | null => {
    if (field.isRequired && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'Ce champ est obligatoire'
    }

    if (field.validation) {
      const { validation } = field
      
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          return `Minimum ${validation.minLength} caractères requis`
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `Maximum ${validation.maxLength} caractères autorisés`
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return validation.customMessage || 'Format invalide'
        }
      }

      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return `La valeur doit être supérieure ou égale à ${validation.min}`
        }
        if (validation.max !== undefined && value > validation.max) {
          return `La valeur doit être inférieure ou égale à ${validation.max}`
        }
      }
    }

    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    
    // Validate all fields
    form.sections.forEach(section => {
      section.fields.forEach(field => {
        const error = validateField(field, formData[field.id])
        if (error) {
          newErrors[field.id] = error
        }
      })
    })

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      // Simulate form submission
      setTimeout(() => {
        setIsSubmitting(false)
        setIsSubmitted(true)
      }, 1500)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id] || field.properties?.defaultValue || ''
    const error = errors[field.id]
    const widthClass = field.width === 'half' ? 'md:col-span-1' : 
                      field.width === 'third' ? 'md:col-span-1 lg:col-span-1' :
                      field.width === 'quarter' ? 'md:col-span-1 lg:col-span-1' : 'md:col-span-2'

    const fieldContent = () => {
      switch (field.type) {
        case FormFieldType.TEXT:
        case FormFieldType.EMAIL:
        case FormFieldType.PHONE:
        case FormFieldType.URL:
          return (
            <Input
              type={field.type === FormFieldType.EMAIL ? 'email' : 
                    field.type === FormFieldType.PHONE ? 'tel' :
                    field.type === FormFieldType.URL ? 'url' : 'text'}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.properties?.placeholder}
              className={cn(error && 'border-red-500')}
            />
          )

        case FormFieldType.NUMBER:
          return (
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || '')}
              placeholder={field.properties?.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              className={cn(error && 'border-red-500')}
            />
          )

        case FormFieldType.TEXTAREA:
          return (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.properties?.placeholder}
              rows={4}
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-red-500'
              )}
            />
          )

        case FormFieldType.SELECT:
          return (
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-red-500'
              )}
            >
              <option value="">Sélectionnez une option</option>
              {field.properties?.options?.map((option, index) => (
                <option key={index} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )

        case FormFieldType.CHECKBOX:
          return (
            <div className="space-y-2">
              {field.properties?.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : []
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value)
                      handleFieldChange(field.id, newValues)
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )

        case FormFieldType.RADIO:
          return (
            <div className="space-y-2">
              {field.properties?.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )

        case FormFieldType.CHECKBOX:
          return (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{field.label}</span>
            </label>
          )

        case FormFieldType.DATE:
          return (
            <div className="relative">
              <Input
                type="date"
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={cn(error && 'border-red-500')}
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )

        case FormFieldType.TIME:
          return (
            <div className="relative">
              <Input
                type="time"
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={cn(error && 'border-red-500')}
              />
              <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )

        case FormFieldType.DATETIME:
          return (
            <Input
              type="datetime-local"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={cn(error && 'border-red-500')}
            />
          )

        case FormFieldType.FILE:
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                    </p>
                    {field.properties?.accept && (
                      <p className="text-xs text-gray-500">
                        {field.properties.accept}
                      </p>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept={field.properties?.accept}
                    onChange={(e) => handleFieldChange(field.id, e.target.files?.[0])}
                  />
                </label>
              </div>
              {value && (
                <p className="text-sm text-gray-600">
                  Fichier sélectionné: {value.name || value}
                </p>
              )}
            </div>
          )

        case FormFieldType.RATING:
          return (
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleFieldChange(field.id, rating)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      rating <= (value || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
              {value && (
                <span className="ml-2 text-sm text-gray-600">
                  {value}/5
                </span>
              )}
            </div>
          )

        case FormFieldType.SLIDER:
          return (
            <div className="space-y-2">
              <input
                type="range"
                min={field.validation?.min || 0}
                max={field.validation?.max || 100}
                value={value || field.validation?.min || 0}
                onChange={(e) => handleFieldChange(field.id, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{field.validation?.min || 0}</span>
                <span className="font-medium">{value || field.validation?.min || 0}</span>
                <span>{field.validation?.max || 100}</span>
              </div>
            </div>
          )

        default:
          return (
            <div className="p-4 bg-gray-100 rounded-md text-center text-gray-500">
              Type de champ non supporté: {field.type}
            </div>
          )
      }
    }

    return (
      <div key={field.id} className={cn('space-y-2', widthClass)}>
        {field.type !== FormFieldType.CHECKBOX && (
          <Label htmlFor={field.id} className="flex items-center gap-1">
            {field.label}
            {field.isRequired && <span className="text-red-500">*</span>}
          </Label>
        )}
        
        {field.properties?.helpText && (
          <p className="text-sm text-gray-600">{field.properties.helpText}</p>
        )}
        
        {fieldContent()}
        
        {error && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    )
  }

  const renderSection = (section: FormSection) => (
    <Card key={section.id} className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{section.title}</CardTitle>
        {section.description && (
          <p className="text-sm text-gray-600">{section.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {section.fields.map(renderField)}
        </div>
      </CardContent>
    </Card>
  )

  if (isSubmitted) {
    return (
      <div className={cn('max-w-2xl mx-auto', className)}>
        <Card className="text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-green-700 mb-2">
              {form.settings.successMessage}
            </h2>
            <p className="text-gray-600 mb-6">
              Votre inscription a été enregistrée avec succès.
            </p>
            <Button onClick={() => setIsSubmitted(false)}>
              Soumettre une nouvelle inscription
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <form onSubmit={handleSubmit}>
        {/* Form Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {form.settings.title}
          </h1>
          {form.settings.description && (
            <p className="text-lg text-gray-600">
              {form.settings.description}
            </p>
          )}
        </div>

        {/* Form Sections */}
        {form.sections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">
                Aucune section définie dans ce formulaire
              </p>
            </CardContent>
          </Card>
        ) : (
          form.sections
            .sort((a, b) => a.order - b.order)
            .map(renderSection)
        )}

        {/* Submit Button */}
        {form.sections.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="min-w-[200px]"
              style={{
                backgroundColor: form.settings.theme?.primaryColor || '#3B82F6',
                borderColor: form.settings.theme?.primaryColor || '#3B82F6'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Envoi en cours...
                </>
              ) : (
                form.settings.submitButtonText
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

export default FormPreview