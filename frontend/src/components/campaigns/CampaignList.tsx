import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/badge';
import {
  Mail,
  Users,
  Eye,
  MousePointer,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Play,
  Pause,
  Copy,
  MoreHorizontal,
  Send,
  BarChart3,
  FileText
} from 'lucide-react';
import { Campaign } from './CampaignDashboard';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { TestEmailModal } from './modals/TestEmailModal';
import { CampaignPreviewModal } from './modals/CampaignPreviewModal';

interface CampaignListProps {
  campaigns: Campaign[];
  loading: boolean;
  onRefresh: () => void;
  onAction: (id: string, action: 'edit' | 'duplicate' | 'delete' | 'pause' | 'resume' | 'send' | 'analytics') => void;
  onCreateNew: () => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  loading,
  onRefresh,
  onAction,
  onCreateNew
}) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR');
  };

  const getTypeLabel = (type: Campaign['type']) => {
    const typeLabels = {
      newsletter: 'Newsletter',
      announcement: 'Annonce',
      event_reminder: 'Rappel événement',
      hr_communication: 'Communication RH',
      custom: 'Personnalisé'
    };
    return typeLabels[type];
  };

  const handleCampaignAction = (campaignId: string, action: 'edit' | 'duplicate' | 'delete' | 'pause' | 'resume' | 'send' | 'analytics') => {
    onAction(campaignId, action);
  };


  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const selectAllCampaigns = () => {
    setSelectedCampaigns(
      selectedCampaigns.length === campaigns.length
        ? []
        : campaigns.map(c => c.id)
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune campagne trouvée
            </h3>
            <p className="text-gray-600 mb-4">
              Créez votre première campagne email pour commencer à communiquer avec vos membres.
            </p>
            <Button onClick={onCreateNew}>
              <Send className="h-4 w-4 mr-2" />
              Créer une campagne
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mes Campagnes ({campaigns.length})</CardTitle>

          {/* Actions en lot */}
          {selectedCampaigns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedCampaigns.length} sélectionnée{selectedCampaigns.length > 1 ? 's' : ''}
              </span>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* En-tête de liste avec sélection */}
        <div className="flex items-center gap-4 p-3 border-b bg-gray-50 rounded-t-lg">
          <input
            type="checkbox"
            checked={selectedCampaigns.length === campaigns.length}
            onChange={selectAllCampaigns}
            className="rounded border-gray-300"
          />
          <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
            <div className="col-span-3">Campagne</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Destinataires</div>
            <div className="col-span-2">Performance</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>

        {/* Liste des campagnes */}
        <div className="space-y-0">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className={`flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedCampaigns.includes(campaign.id) ? 'bg-blue-50' : ''
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedCampaigns.includes(campaign.id)}
                onChange={() => toggleCampaignSelection(campaign.id)}
                className="rounded border-gray-300"
              />

              {/* Contenu principal */}
              <div className="flex-1 grid grid-cols-12 gap-4">
                {/* Informations campagne */}
                <div className="col-span-3">
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {campaign.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(campaign.type)}
                      </Badge>
                      {campaign.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Statut */}
                <div className="col-span-2 flex items-center">
                  <CampaignStatusBadge status={campaign.status} />
                </div>

                {/* Destinataires */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{formatNumber(campaign.recipients)}</span>
                  </div>
                  {campaign.status === 'sent' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(campaign.deliveredCount)} livrés
                    </div>
                  )}
                </div>

                {/* Performance */}
                <div className="col-span-2">
                  {campaign.status === 'sent' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-3 w-3 text-purple-500" />
                        <span>{campaign.openRate.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <MousePointer className="h-3 w-3 text-orange-500" />
                        <span>{campaign.clickRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ) : campaign.status === 'sending' ? (
                    <div className="text-sm text-blue-600">
                      En cours...
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      -
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-col">
                      {campaign.sentAt ? (
                        <>
                          <span className="text-xs text-gray-500">Envoyé</span>
                          <span>{formatDate(campaign.sentAt)}</span>
                        </>
                      ) : campaign.scheduledAt ? (
                        <>
                          <span className="text-xs text-gray-500">Programmé</span>
                          <span>{formatDate(campaign.scheduledAt)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">Créé</span>
                          <span>{formatDate(campaign.createdAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1">
                    {/* Actions rapides selon le statut */}
                    {campaign.status === 'draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'edit')}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'send')}
                          title="Envoyer"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {campaign.status === 'scheduled' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'edit')}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'pause')}
                          title="Annuler"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {campaign.status === 'sending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCampaignAction(campaign.id, 'pause')}
                        title="Mettre en pause"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}

                    {campaign.status === 'sent' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'analytics')}
                          title="Voir les analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCampaignAction(campaign.id, 'duplicate')}
                          title="Dupliquer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Menu plus d'actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Plus d'actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedCampaignId(campaign.id);
                          setPreviewModalOpen(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Aperçu
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedCampaignId(campaign.id);
                          setTestEmailModalOpen(true);
                        }}>
                          <Mail className="h-4 w-4 mr-2" />
                          Envoyer un test
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {campaign.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'send')}>
                            Envoyer
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'scheduled' && (
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'pause')}>
                            Mettre en pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'sending' && (
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'pause')}>
                            Mettre en pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'resume')}>
                            Reprendre
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'sent' && (
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'analytics')}>
                            Voir les analytics
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'edit')}>
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCampaignAction(campaign.id, 'duplicate')}>
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => handleCampaignAction(campaign.id, 'delete')}>
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {selectedCampaignId && (
      <>
        <CampaignPreviewModal
          campaignId={selectedCampaignId}
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedCampaignId(null);
          }}
          onSendTest={() => {
            setPreviewModalOpen(false);
            setTestEmailModalOpen(true);
          }}
        />
        <TestEmailModal
          campaignId={selectedCampaignId}
          isOpen={testEmailModalOpen}
          onClose={() => {
            setTestEmailModalOpen(false);
            setSelectedCampaignId(null);
          }}
        />
      </>
    )}
  </>
  );
};