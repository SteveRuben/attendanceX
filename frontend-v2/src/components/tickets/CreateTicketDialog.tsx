import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { CreateTicketRequest, TicketType } from '@/types/ticket.types';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess: () => void;
}

export const CreateTicketDialog: React.FC<CreateTicketDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  
  const [formData, setFormData] = useState<CreateTicketRequest>({
    eventId,
    participantName: '',
    participantEmail: '',
    participantPhone: '',
    type: TicketType.STANDARD,
    price: undefined,
    currency: 'EUR',
    metadata: {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation basique
      if (!formData.participantName.trim()) {
        throw new Error('Le nom du participant est requis');
      }
      if (!formData.participantEmail.trim()) {
        throw new Error('L\'email du participant est requis');
      }

      // Créer le billet
      const ticket = await ticketService.createTicket({
        ...formData,
        participantName: formData.participantName.trim(),
        participantEmail: formData.participantEmail.trim(),
        participantPhone: formData.participantPhone?.trim() || undefined,
        price: formData.price || undefined
      });

      // Envoyer l'email si demandé
      if (sendEmail) {
        try {
          await ticketService.sendTicketEmail(ticket.id, {
            includeCalendarInvite: true,
            includeEventDetails: true
          });
        } catch (emailError) {
          console.warn('Erreur lors de l\'envoi de l\'email:', emailError);
          // Ne pas faire échouer la création du billet pour un problème d'email
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du billet');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        eventId,
        participantName: '',
        participantEmail: '',
        participantPhone: '',
        type: TicketType.STANDARD,
        price: undefined,
        currency: 'EUR',
        metadata: {}
      });
      setError(null);
      setSendEmail(true);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau billet</DialogTitle>
          <DialogDescription>
            Créez un billet pour un participant à votre événement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informations du participant */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="participantName">Nom complet *</Label>
                <Input
                  id="participantName"
                  value={formData.participantName}
                  onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantEmail">Email *</Label>
                <Input
                  id="participantEmail"
                  type="email"
                  value={formData.participantEmail}
                  onChange={(e) => setFormData({ ...formData, participantEmail: e.target.value })}
                  placeholder="jean@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="participantPhone">Téléphone</Label>
              <Input
                id="participantPhone"
                type="tel"
                value={formData.participantPhone}
                onChange={(e) => setFormData({ ...formData, participantPhone: e.target.value })}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
          </div>

          {/* Type et prix */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de billet</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as TicketType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TicketType.STANDARD}>Standard</SelectItem>
                  <SelectItem value={TicketType.VIP}>VIP</SelectItem>
                  <SelectItem value={TicketType.EARLY_BIRD}>Early Bird</SelectItem>
                  <SelectItem value={TicketType.GROUP}>Groupe</SelectItem>
                  <SelectItem value={TicketType.COMPLIMENTARY}>Gratuit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix</Label>
              <div className="flex gap-2">
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    price: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="0.00"
                />
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Options d'envoi */}
          <div className="flex items-center space-x-2">
            <Switch
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
            <Label htmlFor="sendEmail">
              Envoyer le billet par email automatiquement
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le billet'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};