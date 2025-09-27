import React from 'react';
import { Input } from '../../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/Button';
import { X, Plus } from 'lucide-react';
import { CampaignWizardData } from '../CampaignWizard';

interface CampaignBasicInfoProps {
  data: CampaignWizardData;
  onChange: (updates: Partial<CampaignWizardData>) => void;
}

export const CampaignBasicInfo: React.FC<CampaignBasicInfoProps> = ({
  data,
  onChange
}) => {
  const [newTag, setNewTag] = React.useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ name: e.target.value });
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ subject: e.target.value });
  };

  const handleTypeChange = (value: string) => {
    onChange({ type: value as CampaignWizardData['type'] });
  };

  const addTag = () => {
    if (newTag.trim() && !data.tags.includes(newTag.trim())) {
      onChange({ tags: [...data.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange({ tags: data.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const getTypeDescription = (type: string) => {
    const descriptions = {
      newsletter: 'Communication régulière avec vos membres',
      announcement: 'Annonce importante ou nouvelle',
      event_reminder: 'Rappel pour un événement à venir',
      hr_communication: 'Communication des ressources humaines',
      custom: 'Campagne personnalisée'
    };
    return descriptions[type as keyof typeof descriptions] || '';
  };

  return (
    <div className="space-y-6">
      {/* Nom de la campagne */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de la campagne *
        </label>
        <Input
          value={data.name}
          onChange={handleNameChange}
          placeholder="Ex: Newsletter mensuelle janvier 2024"
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ce nom est uniquement visible par votre équipe
        </p>
      </div>

      {/* Sujet de l'email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sujet de l'email *
        </label>
        <Input
          value={data.subject}
          onChange={handleSubjectChange}
          placeholder="Ex: Découvrez les nouveautés de janvier"
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ce sujet apparaîtra dans la boîte de réception de vos destinataires
        </p>
      </div>

      {/* Type de campagne */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de campagne *
        </label>
        <Select value={data.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez un type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newsletter">
              <div>
                <div className="font-medium">Newsletter</div>
                <div className="text-xs text-gray-500">Communication régulière avec vos membres</div>
              </div>
            </SelectItem>
            <SelectItem value="announcement">
              <div>
                <div className="font-medium">Annonce</div>
                <div className="text-xs text-gray-500">Annonce importante ou nouvelle</div>
              </div>
            </SelectItem>
            <SelectItem value="event_reminder">
              <div>
                <div className="font-medium">Rappel d'événement</div>
                <div className="text-xs text-gray-500">Rappel pour un événement à venir</div>
              </div>
            </SelectItem>
            <SelectItem value="hr_communication">
              <div>
                <div className="font-medium">Communication RH</div>
                <div className="text-xs text-gray-500">Communication des ressources humaines</div>
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div>
                <div className="font-medium">Personnalisé</div>
                <div className="text-xs text-gray-500">Campagne personnalisée</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {data.type && (
          <p className="text-xs text-gray-500 mt-1">
            {getTypeDescription(data.type)}
          </p>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optionnel)
        </label>
        
        {/* Tags existants */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        {/* Ajouter un tag */}
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ajouter un tag..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            disabled={!newTag.trim() || data.tags.includes(newTag.trim())}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Les tags vous aident à organiser et retrouver vos campagnes
        </p>
      </div>

      {/* Aperçu */}
      {(data.name || data.subject) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Aperçu</h4>
          <div className="bg-white rounded border p-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {data.name || 'Nom de la campagne'}
              </div>
              <div className="text-gray-600 mt-1">
                Sujet: {data.subject || 'Sujet de l\'email'}
              </div>
              {data.type && (
                <div className="mt-2">
                  <Badge variant="outline">{data.type}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};