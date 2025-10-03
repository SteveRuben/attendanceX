import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { X, Monitor, Smartphone, Eye, Mail } from 'lucide-react';
import { campaignService, CampaignPreview } from '../../../services/campaignService';
import { toast } from 'react-toastify';

interface CampaignPreviewModalProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onSendTest?: () => void;
}

export const CampaignPreviewModal: React.FC<CampaignPreviewModalProps> = ({
  campaignId,
  isOpen,
  onClose,
  onSendTest
}) => {
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen, campaignId]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const data = await campaignService.previewCampaign(campaignId);
      setPreview(data);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Erreur lors du chargement de l\'aperçu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Aperçu de la campagne
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Button
              variant={device === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('desktop')}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Desktop
            </Button>
            <Button
              variant={device === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('mobile')}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'html' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('html')}
            >
              HTML
            </Button>
            <Button
              variant={viewMode === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('text')}
            >
              Texte
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : preview ? (
            <div className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden"
                 style={{ maxWidth: device === 'desktop' ? '800px' : '375px' }}>
              <div className="bg-gray-800 text-white p-4">
                <div className="text-sm text-gray-400 mb-1">Sujet:</div>
                <div className="font-semibold">{preview.subject}</div>
                {preview.previewText && (
                  <div className="text-sm text-gray-300 mt-2">{preview.previewText}</div>
                )}
              </div>
              
              <div className="p-4">
                {viewMode === 'html' ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: preview.htmlContent }}
                    className="prose max-w-none"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                    {preview.textContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Aucun aperçu disponible
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onSendTest && (
            <Button onClick={onSendTest}>
              <Mail className="h-4 w-4 mr-2" />
              Envoyer un test
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

