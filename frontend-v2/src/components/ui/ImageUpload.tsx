import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Upload, 
  X, 
  Image as ImageIcon,
  Crop,
  RotateCw,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void
  onImageRemove?: () => void
  currentImage?: string
  aspectRatio?: string // "16:9", "1:1", "4:3", etc.
  maxSize?: number // en MB
  accept?: string
  className?: string
  placeholder?: string
  showPreview?: boolean
  allowCrop?: boolean
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  currentImage,
  aspectRatio = "16:9",
  maxSize = 5,
  accept = "image/*",
  className,
  placeholder = "Cliquez ou glissez une image ici",
  showPreview = true,
  allowCrop = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "1:1": return "aspect-square"
      case "4:3": return "aspect-[4/3]"
      case "3:2": return "aspect-[3/2]"
      case "16:9": return "aspect-video"
      default: return "aspect-video"
    }
  }

  const validateFile = (file: File): string | null => {
    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      return 'Le fichier doit être une image'
    }

    // Vérifier la taille
    const sizeInMB = file.size / (1024 * 1024)
    if (sizeInMB > maxSize) {
      return `L'image ne doit pas dépasser ${maxSize}MB`
    }

    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    
    // Créer la preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
      onImageSelect(file, result)
    }
    reader.readAsDataURL(file)
  }, [onImageSelect, maxSize])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onImageRemove?.()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card 
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          error ? 'border-red-500 bg-red-50' : ''
        )}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {preview && showPreview ? (
            <div className="space-y-4">
              {/* Preview de l'image */}
              <div className={cn('relative rounded-lg overflow-hidden', getAspectRatioClass())}>
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex gap-2">
                    {allowCrop && (
                      <Button size="sm" variant="secondary">
                        <Crop className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="secondary">
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Image sélectionnée
                </p>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClick()
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Changer
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove()
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {placeholder}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Formats supportés: JPG, PNG, GIF (max {maxSize}MB)
              </p>
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Sélectionner une image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Erreur */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

export default ImageUpload