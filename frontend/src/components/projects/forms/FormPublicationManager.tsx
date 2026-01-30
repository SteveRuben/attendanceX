import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { PublicationLinks } from '@/types/form-builder.types'
import { 
  Share, 
  Copy, 
  QrCode, 
  Code, 
  ExternalLink,
  Eye,
  Calendar,
  Users,
  TrendingUp,
  Link as LinkIcon,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormPublicationManagerProps {
  formId: string
  publicationLinks?: PublicationLinks
  onGenerateLinks: () => Promise<PublicationLinks>
  onUpdateLinks: (updates: Partial<PublicationLinks>) => Promise<void>
  className?: string
}

export const FormPublicationManager: React.FC<FormPublicationManagerProps> = ({
  formId,
  publicationLinks,
  onGenerateLinks,
  onUpdateLinks,
  className
}) => {
  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleGenerateLinks = async () => {
    setLoading(true)
    try {
      await onGenerateLinks()
    } catch (error) {
      console.error('Error generating links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublishToggle = async (isPublished: boolean) => {
    try {
      await onUpdateLinks({ 
        isPublished,
        publishedAt: isPublished ? new Date() : undefined
      })
    } catch (error) {
      console.error('Error updating publication status:', error)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const openPreview = (url: string) => {
    window.open(url, '_blank', 'width=800,height=600')
  }

  if (!publicationLinks) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Publication du Formulaire
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Share className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Prêt à publier ?</h3>
          <p className="text-muted-foreground mb-6">
            Générez les liens de publication pour partager votre formulaire
          </p>
          <Button onClick={handleGenerateLinks} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                Génération...
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                Générer les liens
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Publication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share className="h-5 w-5" />
              Statut de Publication
            </div>
            <Badge variant={publicationLinks.isPublished ? "default" : "secondary"}>
              {publicationLinks.isPublished ? "Publié" : "Brouillon"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Publier le formulaire</Label>
              <p className="text-sm text-muted-foreground">
                Rendre le formulaire accessible via les liens publics
              </p>
            </div>
            <Switch
              checked={publicationLinks.isPublished}
              onCheckedChange={handlePublishToggle}
            />
          </div>

          {publicationLinks.isPublished && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Vues</span>
                </div>
                <p className="text-2xl font-bold">{publicationLinks.accessCount}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Publié le</span>
                </div>
                <p className="text-sm">
                  {publicationLinks.publishedAt 
                    ? new Date(publicationLinks.publishedAt).toLocaleDateString('fr-FR')
                    : 'N/A'
                  }
                </p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Dernière visite</span>
                </div>
                <p className="text-sm">
                  {publicationLinks.lastAccessedAt 
                    ? new Date(publicationLinks.lastAccessedAt).toLocaleDateString('fr-FR')
                    : 'Jamais'
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Links Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Liens de Partage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Long URL */}
          <div className="space-y-2">
            <Label>Lien de l'organisation</Label>
            <div className="flex gap-2">
              <Input
                value={publicationLinks.longUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(publicationLinks.longUrl, 'longUrl')}
              >
                {copiedField === 'longUrl' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPreview(publicationLinks.longUrl)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {publicationLinks.organizationSubdomain 
                ? `Sous-domaine de votre organisation : ${publicationLinks.organizationSubdomain}.attendancex.app`
                : publicationLinks.organizationDomain
                ? `Domaine personnalisé : ${publicationLinks.organizationDomain}`
                : 'Lien standard AttendanceX'
              }
            </p>
          </div>

          {/* Short URL */}
          <div className="space-y-2">
            <Label>Lien court</Label>
            <div className="flex gap-2">
              <Input
                value={publicationLinks.shortUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(publicationLinks.shortUrl, 'shortUrl')}
              >
                {copiedField === 'shortUrl' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPreview(publicationLinks.shortUrl)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Lien raccourci, idéal pour les réseaux sociaux
            </p>
          </div>

          {/* QR Code */}
          {publicationLinks.qrCodeUrl && (
            <div className="space-y-2">
              <Label>Code QR</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex gap-2">
                    <Input
                      value={publicationLinks.qrCodeUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(publicationLinks.qrCodeUrl!, 'qrCode')}
                    >
                      {copiedField === 'qrCode' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Code QR pour accès mobile rapide
                  </p>
                </div>
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embed Code */}
      {publicationLinks.embedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Code d'Intégration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Code HTML</Label>
              <div className="relative">
                <textarea
                  value={publicationLinks.embedCode}
                  readOnly
                  className="w-full h-24 p-3 font-mono text-sm bg-gray-50 border rounded-lg resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(publicationLinks.embedCode!, 'embedCode')}
                >
                  {copiedField === 'embedCode' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Intégrez ce formulaire directement dans votre site web
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Paramètres d'Expiration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Date d'expiration (optionnel)</Label>
            <Input
              type="datetime-local"
              value={publicationLinks.expiresAt 
                ? new Date(publicationLinks.expiresAt).toISOString().slice(0, 16)
                : ''
              }
              onChange={(e) => onUpdateLinks({ 
                expiresAt: e.target.value ? new Date(e.target.value) : undefined 
              })}
            />
            <p className="text-xs text-muted-foreground">
              Le formulaire ne sera plus accessible après cette date
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FormPublicationManager