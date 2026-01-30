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
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Plus, X, Upload } from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import { BulkTicketRequest, TicketType } from '@/types/ticket.types';

interface Participant {
  name: string;
  email: string;
  phone?: string;
  type?: TicketType;
}

interface BulkTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onSuccess: () => void;
}

export const BulkTicketDialog: React.FC<BulkTicketDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendEmails, setSendEmails] = useState(true);
  
  const [participants, setParticipants] = useState<Participant[]>([
    { name: '', email: '', phone: '' }
  ]);
  
  const [defaultSettings, setDefaultSettings] = useState({
    type: TicketType.STANDARD,
    price: undefined as number | undefined,
    currency: 'EUR'
  });

  const [csvInput, setCsvInput] = useState('');
  const [showCsvInput, setShowCsvInput] = useState(false);

  const addParticipant = () => {
    setParticipants([...participants, { name: '', email: '', phone: '' }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const parseCsvInput = () => {
    if (!csvInput.trim()) return;

    try {
      const lines = csvInput.trim().split('\n');
      const newParticipants: Participant[] = [];

      lines.forEach((line, index) => {
        const [name, email, phone] = line.split(',').map(s => s.trim());
        
        if (!name || !email) {
          throw new Error(`Ligne ${index + 1}: Nom et email requis`);
        }

        newParticipants.push({
          name,
          email,
          phone: phone || undefined
        });
      });

      setParticipants(newParticipants);
      setCsvInput('');
      setShowCsvInput(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      const validParticipants = participants.filter(p => p.name.trim() && p.email.trim());
      
      if (validParticipants.length === 0) {
        throw new Error('Au moins un participant avec nom et email est requis');
      }

      // Vérifier les emails en double
      const emails = validParticipants.map(p => p.email.toLowerCase());
      const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
      if (duplicates.length > 0) {
        throw new Error(`Emails en double détectés: ${duplicates.join(', ')}`);
      }

      const bulkRequest: BulkTicketRequest = {
        eventId,
        participants: validParticipants.map(p => ({
          name: p.name.trim(),
          email: p.email.trim(),
          phone: p.phone?.trim() || undefined,
          type: p.type || defaultSettings.type
        })),
        defaultType: defaultSettings.type,
        price: defaultSettings.price,
        currency: defaultSettings.currency
      };

      // Créer les billets
      const tickets = await ticketService.createBulkTickets(bulkRequest);

      // Envoyer les emails si demandé
      if (sendEmails) {
        try {
          const emailPromises = tickets.map(ticket =>
            ticketService.sendTicketEmail(ticket.id, {
              includeCalendarInvite: true,
              includeEventDetails: true
            })
          );
          await Promise.all(emailPromises);
        } catch (emailError) {
          console.warn('Erreur lors de l\'envoi des emails:', emailError);
          // Ne pas faire échouer la création pour un problème d'email
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création des billets');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setParticipants([{ name: '', email: '', phone: '' }]);
      setDefaultSettings({
        type: TicketType.STANDARD,
        price: undefined,
        currency: 'EUR'
      });
      setCsvInput('');
      setShowCsvInput(false);
      setError(null);
      setSendEmails(true);
      onOpenChange(false);
    }
  };

  const validParticipants = participants.filter(p => p.name.trim() && p.email.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer des billets en lot</DialogTitle>
          <DialogDescription>
            Créez plusieurs billets simultanément pour votre événement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Paramètres par défaut */}
          <div className="space-y-4">
            <h4 className="font-medium">Paramètres par défaut</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type de billet</Label>
                <Select
                  value={defaultSettings.type}
                  onValueChange={(value) => setDefaultSettings({ 
                    ...defaultSettings, 
                    type: value as TicketType 
                  })}
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
                <Label>Prix</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultSettings.price || ''}
                  onChange={(e) => setDefaultSettings({ 
                    ...defaultSettings, 
                    price: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Devise</Label>
                <Select
                  value={defaultSettings.currency}
                  onValueChange={(value) => setDefaultSettings({ 
                    ...defaultSettings, 
                    currency: value 
                  })}
                >
                  <SelectTrigger>
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

          {/* Import CSV */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Participants</h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCsvInput(!showCsvInput)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <Badge variant="secondary">
                  {validParticipants.length} valide{validParticipants.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            {showCsvInput && (
              <div className="space-y-2">
                <Label>Format CSV (Nom, Email, Téléphone)</Label>
                <Textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="Jean Dupont, jean@example.com, +33123456789&#10;Marie Martin, marie@example.com"
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={parseCsvInput}>
                    Importer
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCsvInput(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Liste des participants */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {participants.map((participant, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <Input
                    value={participant.name}
                    onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                    placeholder="Nom complet"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    type="email"
                    value={participant.email}
                    onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    value={participant.phone || ''}
                    onChange={(e) => updateParticipant(index, 'phone', e.target.value)}
                    placeholder="Téléphone"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeParticipant(index)}
                    disabled={participants.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addParticipant}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un participant
          </Button>

          {/* Options d'envoi */}
          <div className="flex items-center space-x-2">
            <Switch
              id="sendEmails"
              checked={sendEmails}
              onCheckedChange={setSendEmails}
            />
            <Label htmlFor="sendEmails">
              Envoyer les billets par email automatiquement
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || validParticipants.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                `Créer ${validParticipants.length} billet${validParticipants.length > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};