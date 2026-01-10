import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { campaignService } from '@/services/campaignService'
import { CreateEventCampaignRequest } from '@/types/campaign.types'
import { useNotify } from '@/components/ui/notification-system'
import { Send, Mail, MessageSquare, QrCode, Hash, Clock, Calendar } from 'lucide-react'

interface CreateCampaignButtonProps {
  eventId: string
  eventTitle: string
  participantCount: number
  onCampaignCreated?: (campaignId: string) => void
}

export const CreateCampaignButton: React.FC<CreateCampaignButtonProps> = ({
  eventId,
  eventTitle,
  participantCount,
  onCampaignCreated
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const notify = useNotify()
  
  const [formData, setFormData] = useState<CreateEventCampaignRequest>({
    type: 'confirmation',
    notificationMethods: {
      email: {
        enabled: true,
        generateQR: false
      },
      sms: {
        enabled: false,
        generatePIN: false
      }
    },
    reminderSettings: {
      send24hBefore: true,
      send1hBefore: false
    }
  })

  const campaignTypes = [
    { value: 'confirmation', label: 'Confirmation', description: 'Confirmer la participation à l\'événement' },
    { value: 'reminder', label: 'Rappel', description: 'Rappeler l\'événement aux participants' },
    { value: 'update', label: 'Mise à jour', description: 'Informer d\'un changement dans l\'événement' },
    { value: 'cancellation', label: 'Annulation', description: 'Notifier l\'annulation de l\'événement' }
  ]

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedFormData = (parent: keyof CreateEventCampaignRequest, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }))
  }

  const updateNotificationMethod = (method: 'email' | 'sms', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      notificationMethods: {
        ...prev.notificationMethods,
        [method]: {
          ...prev.notificationMethods[method],
          [field]: value
        }
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.notificationMethods.email?.enabled && !formData.notificationMethods.sms?.enabled) {
      notify.error('Erreur de validation', 'Veuillez sélectionner au moins une méthode de notification')
      return
    }

    setLoading(true)
    try {
      const result = await campaignService.createEventCampaign(eventId, formData)
      
      notify.success('Campagne créée', `Campagne créée avec succès ! ${result.participantCount} participants seront notifiés.`)
      
      if (onCampaignCreated) {
        onCampaignCreated(result.campaignId)
      }
      
      setIsOpen(false)
      
      // Reset form
      setFormData({
        type: 'confirmation',
        notificationMethods: {
          email: {
            enabled: true,
            generateQR: false
          },
          sms: {
            enabled: false,
            generatePIN: false
          }
        },
        reminderSettings: {
          send24hBefore: true,
          send1hBefore: false
        }
      })
    } catch (error) {
      console.error('Error creating campaign:', error)
      notify.error('Erreur', 'Erreur lors de la création de la campagne')
    } finally {
      setLoading(false)
    }
  }

  const selectedType = campaignTypes.find(t => t.value === formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Créer une Campagne
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Créer une Campagne pour l'Événement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Informations de l'Événement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Événement</span>
                <p className="font-semibold">{eventTitle}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Participants</span>
                <p>{participantCount} participant{participantCount > 1 ? 's' : ''}</p>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Type de Campagne</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="type">Type de notification *</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={e => updateFormData('type', e.target.value)}
                >
                  {campaignTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
                {selectedType && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedType.description}
                  </p>
                )}
              </div>

              {formData.customMessage !== undefined && (
                <div>
                  <Label htmlFor="customMessage">Message personnalisé</Label>
                  <Textarea
                    id="customMessage"
                    value={formData.customMessage || ''}
                    onChange={e => updateFormData('customMessage', e.target.value)}
                    placeholder="Ajoutez un message personnalisé (optionnel)"
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Méthodes de Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email-enabled"
                    checked={formData.notificationMethods.email?.enabled || false}
                    onCheckedChange={checked => updateNotificationMethod('email', 'enabled', checked)}
                  />
                  <Label htmlFor="email-enabled" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Notification par Email
                  </Label>
                </div>
                
                {formData.notificationMethods.email?.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="generate-qr"
                        checked={formData.notificationMethods.email?.generateQR || false}
                        onCheckedChange={checked => updateNotificationMethod('email', 'generateQR', checked)}
                      />
                      <Label htmlFor="generate-qr" className="flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        Générer des QR codes pour le check-in
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* SMS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sms-enabled"
                    checked={formData.notificationMethods.sms?.enabled || false}
                    onCheckedChange={checked => updateNotificationMethod('sms', 'enabled', checked)}
                  />
                  <Label htmlFor="sms-enabled" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notification par SMS
                  </Label>
                </div>
                
                {formData.notificationMethods.sms?.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="generate-pin"
                        checked={formData.notificationMethods.sms?.generatePIN || false}
                        onCheckedChange={checked => updateNotificationMethod('sms', 'generatePIN', checked)}
                      />
                      <Label htmlFor="generate-pin" className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Générer des codes PIN pour le check-in
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reminder Settings */}
          {formData.type === 'reminder' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5" />
                  Paramètres de Rappel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-24h"
                    checked={formData.reminderSettings?.send24hBefore || false}
                    onCheckedChange={checked => updateNestedFormData('reminderSettings', 'send24hBefore', checked)}
                  />
                  <Label htmlFor="send-24h">Envoyer 24h avant l'événement</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-1h"
                    checked={formData.reminderSettings?.send1hBefore || false}
                    onCheckedChange={checked => updateNestedFormData('reminderSettings', 'send1hBefore', checked)}
                  />
                  <Label htmlFor="send-1h">Envoyer 1h avant l'événement</Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Programmation</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="scheduledAt">Programmer l'envoi (optionnel)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt || ''}
                  onChange={e => updateFormData('scheduledAt', e.target.value)}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Laissez vide pour envoyer immédiatement
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Créer la Campagne
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}