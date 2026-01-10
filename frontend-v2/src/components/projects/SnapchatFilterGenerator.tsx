import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { 
  Camera, 
  Download, 
  Palette, 
  Type, 
  Sparkles, 
  RotateCcw,
  Save,
  Share2,
  Eye,
  Settings,
  Image as ImageIcon,
  Layers,
  Move,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'frame'
  content: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  color?: string
  fontSize?: number
  fontFamily?: string
  borderRadius?: number
  borderWidth?: number
  borderColor?: string
}

interface SnapchatFilter {
  id: string
  name: string
  elements: FilterElement[]
  backgroundColor: string
  backgroundImage?: string
  eventId?: string
  isPublic: boolean
  usageCount: number
  createdAt: string
}

interface SnapchatFilterGeneratorProps {
  eventId?: string
  eventImage?: string
  eventColors?: string[]
  onSave?: (filter: SnapchatFilter) => Promise<void>
  onShare?: (filter: SnapchatFilter) => Promise<void>
  className?: string
}

const PRESET_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 
  'Verdana', 'Georgia', 'Palatino', 'Garamond', 
  'Comic Sans MS', 'Impact', 'Trebuchet MS'
]

const PRESET_SHAPES = [
  { name: 'Rectangle', type: 'rect' },
  { name: 'Cercle', type: 'circle' },
  { name: 'Étoile', type: 'star' },
  { name: 'Cœur', type: 'heart' },
  { name: 'Flèche', type: 'arrow' }
]

const PRESET_FRAMES = [
  { name: 'Cadre simple', style: 'simple' },
  { name: 'Cadre décoratif', style: 'decorative' },
  { name: 'Cadre polaroid', style: 'polaroid' },
  { name: 'Cadre vintage', style: 'vintage' }
]

export const SnapchatFilterGenerator: React.FC<SnapchatFilterGeneratorProps> = ({
  eventId,
  eventImage,
  eventColors = ['#3B82F6', '#10B981', '#F59E0B'],
  onSave,
  onShare,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [filter, setFilter] = useState<SnapchatFilter>({
    id: `filter_${Date.now()}`,
    name: 'Mon Filtre',
    elements: [],
    backgroundColor: '#FFFFFF',
    eventId,
    isPublic: false,
    usageCount: 0,
    createdAt: new Date().toISOString()
  })
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Générer un ID unique pour les éléments
  const generateElementId = () => `element_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Ajouter un élément texte
  const addTextElement = useCallback(() => {
    const newElement: FilterElement = {
      id: generateElementId(),
      type: 'text',
      content: 'Nouveau texte',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      rotation: 0,
      opacity: 1,
      color: eventColors[0] || '#3B82F6',
      fontSize: 24,
      fontFamily: 'Arial'
    }
    
    setFilter(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElement(newElement.id)
  }, [eventColors])

  // Ajouter un élément image
  const addImageElement = useCallback((imageUrl: string) => {
    const newElement: FilterElement = {
      id: generateElementId(),
      type: 'image',
      content: imageUrl,
      x: 100,
      y: 100,
      width: 150,
      height: 150,
      rotation: 0,
      opacity: 1
    }
    
    setFilter(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElement(newElement.id)
  }, [])

  // Ajouter une forme
  const addShapeElement = useCallback((shapeType: string) => {
    const newElement: FilterElement = {
      id: generateElementId(),
      type: 'shape',
      content: shapeType,
      x: 75,
      y: 75,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      color: eventColors[1] || '#10B981',
      borderRadius: shapeType === 'circle' ? 50 : 0,
      borderWidth: 2,
      borderColor: '#000000'
    }
    
    setFilter(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
    setSelectedElement(newElement.id)
  }, [eventColors])

  // Mettre à jour un élément
  const updateElement = useCallback((elementId: string, updates: Partial<FilterElement>) => {
    setFilter(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      )
    }))
  }, [])

  // Supprimer un élément
  const deleteElement = useCallback((elementId: string) => {
    setFilter(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId)
    }))
    if (selectedElement === elementId) {
      setSelectedElement(null)
    }
  }, [selectedElement])

  // Dupliquer un élément
  const duplicateElement = useCallback((elementId: string) => {
    const element = filter.elements.find(el => el.id === elementId)
    if (!element) return

    const duplicated: FilterElement = {
      ...element,
      id: generateElementId(),
      x: element.x + 20,
      y: element.y + 20
    }

    setFilter(prev => ({
      ...prev,
      elements: [...prev.elements, duplicated]
    }))
    setSelectedElement(duplicated.id)
  }, [filter.elements])

  // Sauvegarder le filtre
  const handleSave = useCallback(async () => {
    if (onSave) {
      try {
        await onSave(filter)
      } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error)
      }
    }
  }, [filter, onSave])

  // Partager le filtre
  const handleShare = useCallback(async () => {
    if (onShare) {
      try {
        await onShare({ ...filter, isPublic: true })
      } catch (error) {
        console.error('Erreur lors du partage:', error)
      }
    }
  }, [filter, onShare])

  // Exporter le filtre comme image
  const exportAsImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${filter.name.replace(/\s+/g, '_')}_filter.png`
    link.href = canvas.toDataURL()
    link.click()
  }, [filter.name])

  // Rendu d'un élément sur le canvas
  const renderElement = (element: FilterElement) => {
    const isSelected = selectedElement === element.id
    
    const elementStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      cursor: 'move',
      border: isSelected ? '2px dashed #3B82F6' : 'none',
      zIndex: isSelected ? 10 : 1
    }

    const handleElementClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedElement(element.id)
    }

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              color: element.color,
              fontSize: element.fontSize,
              fontFamily: element.fontFamily,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
            onClick={handleElementClick}
          >
            {element.content}
          </div>
        )

      case 'image':
        return (
          <div
            key={element.id}
            style={elementStyle}
            onClick={handleElementClick}
          >
            <img
              src={element.content}
              alt="Filter element"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: element.borderRadius || 0
              }}
            />
          </div>
        )

      case 'shape':
        return (
          <div
            key={element.id}
            style={{
              ...elementStyle,
              backgroundColor: element.color,
              borderRadius: element.borderRadius || 0,
              border: `${element.borderWidth || 0}px solid ${element.borderColor || 'transparent'}`
            }}
            onClick={handleElementClick}
          />
        )

      default:
        return null
    }
  }

  const selectedElementData = selectedElement 
    ? filter.elements.find(el => el.id === selectedElement)
    : null

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-4 gap-6', className)}>
      {/* Panneau d'outils */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Outils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nom du filtre */}
            <div>
              <Label>Nom du filtre</Label>
              <Input
                value={filter.name}
                onChange={(e) => setFilter(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Mon super filtre"
              />
            </div>

            {/* Couleur de fond */}
            <div>
              <Label>Arrière-plan</Label>
              <ColorPicker
                value={filter.backgroundColor}
                onChange={(color) => setFilter(prev => ({ ...prev, backgroundColor: color }))}
              />
            </div>

            {/* Ajouter des éléments */}
            <div className="space-y-2">
              <Label>Ajouter des éléments</Label>
              
              <Button
                size="sm"
                variant="outline"
                onClick={addTextElement}
                className="w-full justify-start"
              >
                <Type className="h-4 w-4 mr-2" />
                Texte
              </Button>

              <div>
                <ImageUpload
                  onImageSelect={(file, preview) => addImageElement(preview)}
                  placeholder="Ajouter une image"
                  compact
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_SHAPES.map(shape => (
                  <Button
                    key={shape.type}
                    size="sm"
                    variant="outline"
                    onClick={() => addShapeElement(shape.type)}
                    className="text-xs"
                  >
                    {shape.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Couleurs de l'événement */}
            {eventColors.length > 0 && (
              <div>
                <Label>Couleurs de l'événement</Label>
                <div className="flex gap-2 mt-2">
                  {eventColors.map((color, index) => (
                    <button
                      key={index}
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        if (selectedElementData) {
                          updateElement(selectedElementData.id, { color })
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Propriétés de l'élément sélectionné */}
        {selectedElementData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Propriétés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedElementData.type === 'text' && (
                <>
                  <div>
                    <Label>Texte</Label>
                    <Input
                      value={selectedElementData.content}
                      onChange={(e) => updateElement(selectedElementData.id, { content: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Taille</Label>
                    <Input
                      type="number"
                      value={selectedElementData.fontSize || 24}
                      onChange={(e) => updateElement(selectedElementData.id, { fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Police</Label>
                    <select
                      value={selectedElementData.fontFamily || 'Arial'}
                      onChange={(e) => updateElement(selectedElementData.id, { fontFamily: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {PRESET_FONTS.map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <Label>Opacité</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedElementData.opacity}
                  onChange={(e) => updateElement(selectedElementData.id, { opacity: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <Label>Rotation</Label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedElementData.rotation}
                  onChange={(e) => updateElement(selectedElementData.id, { rotation: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => duplicateElement(selectedElementData.id)}
                >
                  Dupliquer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteElement(selectedElementData.id)}
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Zone de prévisualisation */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Aperçu du Filtre
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? 'Édition' : 'Aperçu'}
                </Button>
                <Button size="sm" variant="outline" onClick={exportAsImage}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Canvas de prévisualisation */}
            <div className="relative mx-auto" style={{ width: 400, height: 600 }}>
              <div
                className="relative w-full h-full border-2 border-gray-300 rounded-lg overflow-hidden"
                style={{ backgroundColor: filter.backgroundColor }}
                onClick={() => setSelectedElement(null)}
              >
                {/* Image de fond de l'événement */}
                {eventImage && (
                  <img
                    src={eventImage}
                    alt="Event background"
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                )}

                {/* Éléments du filtre */}
                {filter.elements.map(renderElement)}

                {/* Canvas caché pour l'export */}
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={600}
                  className="hidden"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>Cliquez sur un élément pour le sélectionner et le modifier</p>
              <p>Utilisez les outils à gauche pour ajouter de nouveaux éléments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SnapchatFilterGenerator