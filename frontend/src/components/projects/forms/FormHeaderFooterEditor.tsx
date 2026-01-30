import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { FormHeader, FormFooter, FooterLink } from '@/types/form-builder.types'
import { 
  Image as ImageIcon, 
  Type, 
  Plus, 
  Trash2,
  Link as LinkIcon,
  Mail,
  Phone,
  MapPin,
  Globe
} from 'lucide-react'

interface FormHeaderFooterEditorProps {
  header: FormHeader
  footer: FormFooter
  onUpdateHeader: (updates: Partial<FormHeader>) => void
  onUpdateFooter: (updates: Partial<FormFooter>) => void
}

export const FormHeaderFooterEditor: React.FC<FormHeaderFooterEditorProps> = ({
  header,
  footer,
  onUpdateHeader,
  onUpdateFooter
}) => {
  const addFooterLink = () => {
    const newLink: FooterLink = {
      id: `link_${Date.now()}`,
      text: 'Nouveau lien',
      url: 'https://',
      openInNewTab: true
    }
    
    onUpdateFooter({
      links: [...(footer.links || []), newLink]
    })
  }

  const updateFooterLink = (linkId: string, updates: Partial<FooterLink>) => {
    onUpdateFooter({
      links: footer.links?.map(link => 
        link.id === linkId ? { ...link, ...updates } : link
      )
    })
  }

  const removeFooterLink = (linkId: string) => {
    onUpdateFooter({
      links: footer.links?.filter(link => link.id !== linkId)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Configuration de l'Entête
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Logo</Label>
              <Switch
                checked={header.showLogo}
                onCheckedChange={(checked) => onUpdateHeader({ showLogo: checked })}
              />
            </div>
            
            {header.showLogo && (
              <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                <div>
                  <Label>Image du logo</Label>
                  <ImageUpload
                    onImageSelect={(_, preview) => onUpdateHeader({ logoUrl: preview })}
                    onImageRemove={() => onUpdateHeader({ logoUrl: undefined })}
                    currentImage={header.logoUrl}
                    aspectRatio="16:9"
                    placeholder="Logo de l'organisation"
                  />
                </div>
                
                <div>
                  <Label>Position du logo</Label>
                  <Select 
                    value={header.logoPosition} 
                    onChange={(e) => onUpdateHeader({ logoPosition: e.target.value as 'left' | 'center' | 'right' })}
                  >
                    <option value="left">À gauche</option>
                    <option value="center">Au centre</option>
                    <option value="right">À droite</option>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Title Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Titre</Label>
              <Switch
                checked={header.showTitle}
                onCheckedChange={(checked) => onUpdateHeader({ showTitle: checked })}
              />
            </div>
            
            {header.showTitle && (
              <div className="pl-4 border-l-2 border-blue-100">
                <Input
                  value={header.title || ''}
                  onChange={(e) => onUpdateHeader({ title: e.target.value })}
                  placeholder="Titre du formulaire"
                />
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Description</Label>
              <Switch
                checked={header.showDescription}
                onCheckedChange={(checked) => onUpdateHeader({ showDescription: checked })}
              />
            </div>
            
            {header.showDescription && (
              <div className="pl-4 border-l-2 border-blue-100">
                <Textarea
                  value={header.description || ''}
                  onChange={(e) => onUpdateHeader({ description: e.target.value })}
                  placeholder="Description du formulaire"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Visual Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Couleur de fond</Label>
              <ColorPicker
                value={header.backgroundColor || '#ffffff'}
                onChange={(color) => onUpdateHeader({ backgroundColor: color })}
                label="Couleur de fond de l'entête"
              />
            </div>
            
            <div>
              <Label>Couleur du texte</Label>
              <ColorPicker
                value={header.textColor || '#1f2937'}
                onChange={(color) => onUpdateHeader({ textColor: color })}
                label="Couleur du texte de l'entête"
              />
            </div>
          </div>

          <div>
            <Label>Hauteur de l'entête</Label>
            <Select 
              value={header.height} 
              onChange={(e) => onUpdateHeader({ height: e.target.value as 'small' | 'medium' | 'large' })}
            >
              <option value="small">Petite</option>
              <option value="medium">Moyenne</option>
              <option value="large">Grande</option>
            </Select>
          </div>

          {/* Background Image */}
          <div>
            <Label>Image de fond (optionnel)</Label>
            <ImageUpload
              onImageSelect={(_, preview) => onUpdateHeader({ backgroundImage: preview })}
              onImageRemove={() => onUpdateHeader({ backgroundImage: undefined })}
              currentImage={header.backgroundImage}
              aspectRatio="21:9"
              placeholder="Image de fond de l'entête"
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Configuration du Pied de Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show Footer Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Afficher le pied de page</Label>
            <Switch
              checked={footer.showFooter}
              onCheckedChange={(checked) => onUpdateFooter({ showFooter: checked })}
            />
          </div>

          {footer.showFooter && (
            <div className="space-y-6 pl-4 border-l-2 border-green-100">
              {/* Footer Content */}
              <div>
                <Label>Contenu du pied de page</Label>
                <Textarea
                  value={footer.content || ''}
                  onChange={(e) => onUpdateFooter({ content: e.target.value })}
                  placeholder="Informations utiles, rappels, remerciements..."
                  rows={4}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Informations de contact</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={footer.contactInfo?.email || ''}
                      onChange={(e) => onUpdateFooter({
                        contactInfo: { ...footer.contactInfo, email: e.target.value }
                      })}
                      placeholder="contact@example.com"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Téléphone
                    </Label>
                    <Input
                      type="tel"
                      value={footer.contactInfo?.phone || ''}
                      onChange={(e) => onUpdateFooter({
                        contactInfo: { ...footer.contactInfo, phone: e.target.value }
                      })}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Site web
                    </Label>
                    <Input
                      type="url"
                      value={footer.contactInfo?.website || ''}
                      onChange={(e) => onUpdateFooter({
                        contactInfo: { ...footer.contactInfo, website: e.target.value }
                      })}
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </Label>
                    <Input
                      value={footer.contactInfo?.address || ''}
                      onChange={(e) => onUpdateFooter({
                        contactInfo: { ...footer.contactInfo, address: e.target.value }
                      })}
                      placeholder="123 Rue Example, Paris"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Liens utiles</Label>
                  <Button size="sm" onClick={addFooterLink}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un lien
                  </Button>
                </div>
                
                {footer.links && footer.links.length > 0 && (
                  <div className="space-y-3">
                    {footer.links.map((link) => (
                      <div key={link.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            value={link.text}
                            onChange={(e) => updateFooterLink(link.id, { text: e.target.value })}
                            placeholder="Texte du lien"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => updateFooterLink(link.id, { url: e.target.value })}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={link.openInNewTab}
                            onCheckedChange={(checked) => updateFooterLink(link.id, { openInNewTab: checked })}
                          />
                          <span className="text-xs text-muted-foreground">Nouvel onglet</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFooterLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Couleur de fond</Label>
                  <ColorPicker
                    value={footer.backgroundColor || '#f8fafc'}
                    onChange={(color) => onUpdateFooter({ backgroundColor: color })}
                    label="Couleur de fond du pied de page"
                  />
                </div>
                
                <div>
                  <Label>Couleur du texte</Label>
                  <ColorPicker
                    value={footer.textColor || '#64748b'}
                    onChange={(color) => onUpdateFooter({ textColor: color })}
                    label="Couleur du texte du pied de page"
                  />
                </div>
              </div>

              {/* Powered By */}
              <div className="flex items-center justify-between">
                <Label>Afficher "Powered by AttendanceX"</Label>
                <Switch
                  checked={footer.showPoweredBy}
                  onCheckedChange={(checked) => onUpdateFooter({ showPoweredBy: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default FormHeaderFooterEditor