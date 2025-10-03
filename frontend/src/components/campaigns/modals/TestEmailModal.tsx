import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { X, Mail, Plus, Trash2 } from 'lucide-react';
import { campaignService } from '../../../services/campaignService';
import { toast } from 'react-toastify';

interface TestEmailModalProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TestEmailModal: React.FC<TestEmailModalProps> = ({
  campaignId,
  isOpen,
  onClose
}) => {
  const [emails, setEmails] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSendTest = async () => {
    const validEmails = emails.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return email.trim() && emailRegex.test(email.trim());
    });

    if (validEmails.length === 0) {
      toast.error('Veuillez entrer au moins une adresse email valide');
      return;
    }

    try {
      setSending(true);
      await campaignService.sendTestCampaign(campaignId, validEmails);
      toast.success(`Email de test envoyé à ${validEmails.length} destinataire(s)`);
      onClose();
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email de test');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Envoyer un email de test
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Envoyez un aperçu de cette campagne à une ou plusieurs adresses email pour tester le rendu.
          </p>

          <div className="space-y-3">
            {emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => updateEmail(index, e.target.value)}
                  className="flex-1"
                />
                {emails.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeEmailField(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addEmailField}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une adresse
          </Button>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSendTest} disabled={sending}>
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Envoi...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer le test
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

