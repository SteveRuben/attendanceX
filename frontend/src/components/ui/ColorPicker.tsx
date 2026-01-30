import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  presetColors?: string[]
  showCustomInput?: boolean
  className?: string
}

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#F97316', // Orange-600
  '#06B6D4', // Cyan
  '#8B5A2B', // Brown
  '#6B7280', // Gray
  '#1F2937', // Gray-800
  '#000000', // Black
  '#FFFFFF', // White
]

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label = "Couleur",
  presetColors = DEFAULT_COLORS,
  showCustomInput = true,
  className
}) => {
  const [customColor, setCustomColor] = useState(value)

  const handlePresetClick = (color: string) => {
    onChange(color)
    setCustomColor(color)
  }

  const handleCustomChange = (color: string) => {
    setCustomColor(color)
    onChange(color)
  }

  const isValidHex = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <Palette className="h-4 w-4" />
        {label}
      </Label>

      {/* Couleur actuelle */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1">
          <p className="text-sm font-medium">Couleur sélectionnée</p>
          <p className="text-xs text-gray-500 uppercase">{value}</p>
        </div>
      </div>

      {/* Couleurs prédéfinies */}
      <div>
        <Label className="text-xs text-gray-600 mb-2 block">
          Couleurs prédéfinies
        </Label>
        <div className="grid grid-cols-8 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 relative",
                value === color ? "border-gray-800 shadow-lg" : "border-gray-200 hover:border-gray-300"
              )}
              style={{ backgroundColor: color }}
              onClick={() => handlePresetClick(color)}
              title={color}
            >
              {value === color && (
                <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur personnalisée */}
      {showCustomInput && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">
            Couleur personnalisée
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#3B82F6"
                className={cn(
                  "font-mono text-sm",
                  !isValidHex(customColor) && customColor !== '' ? "border-red-500" : ""
                )}
              />
              {!isValidHex(customColor) && customColor !== '' && (
                <p className="text-xs text-red-500 mt-1">
                  Format invalide (ex: #3B82F6)
                </p>
              )}
            </div>
            <input
              type="color"
              value={isValidHex(customColor) ? customColor : '#3B82F6'}
              onChange={(e) => handleCustomChange(e.target.value)}
              className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleCustomChange(customColor)}
              disabled={!isValidHex(customColor)}
            >
              Appliquer
            </Button>
          </div>
        </div>
      )}

      {/* Suggestions de couleurs thématiques */}
      <div>
        <Label className="text-xs text-gray-600 mb-2 block">
          Thèmes suggérés
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick('#3B82F6')}
            className="justify-start"
          >
            <div className="w-4 h-4 rounded bg-blue-500 mr-2" />
            Professionnel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick('#10B981')}
            className="justify-start"
          >
            <div className="w-4 h-4 rounded bg-green-500 mr-2" />
            Nature
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick('#8B5CF6')}
            className="justify-start"
          >
            <div className="w-4 h-4 rounded bg-purple-500 mr-2" />
            Créatif
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick('#F59E0B')}
            className="justify-start"
          >
            <div className="w-4 h-4 rounded bg-orange-500 mr-2" />
            Énergique
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ColorPicker