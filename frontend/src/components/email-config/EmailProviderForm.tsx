import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/advanced-select';
import { Switch } from '@/components/ui/switch';
import { X, Save, Loader2 } from 'lucide-react';
import { EmailProvider, ProviderTypeInfo, EmailProviderType } from '@/services/emailConfigService';

interface EmailProviderFormProps {
  providerTypes: ProviderTypeInfo[];
  initialData?: EmailProvider | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface FormData {
  type: EmailProviderType | '';
  name: string;
  isActive: boolean;
  priority: number;
  config: Record<string, any>;
}

export const EmailProviderForm: React.FC<EmailProviderFormProps> = ({
  providerTypes,
  initialData,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    type: initialData?.type || '',
    name: initialData?.name || '',
    isActive: initialData?.isActive ?? true,
    priority: initialData?.priority || 1,
    config: initialData?.config || {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedProviderType = providerTypes.find(pt => pt.type === formData.type);

  // Initialize config when provider type changes
  useEffect(() => {
    if (selectedProviderType && !initialData) {
      const defaultConfig: Record<string, any> = {};
      
      Object.entries(selectedProviderType.configSchema).forEach(([key, schema]: [string, any]) => {
        if (schema.default !== undefined) {
          defaultConfig[key] = schema.default;
        } else if (schema.type === 'boolean') {
          defaultConfig[key] = false;
        } else if (schema.type === 'number') {
          defaultConfig[key] = 0;
        } else if (schema.type === 'object') {
          defaultConfig[key] = {};
        } else {
          defaultConfig[key] = '';
        }
      });

      setFormData(prev => ({ ...prev, config: defaultConfig }));
    }
  }, [selectedProviderType, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Le type de provider est requis';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!Number.isInteger(formData.priority) || formData.priority < 1) {
      newErrors.priority = 'La priorité doit être un entier positif';
    }

    // Validate config based on schema
    if (selectedProviderType) {
      Object.entries(selectedProviderType.configSchema).forEach(([key, schema]: [string, any]) => {
        const value = formData.config[key];
        
        if (schema.required && (!value || (typeof value === 'string' && !value.trim()))) {
          newErrors[`config.${key}`] = `${schema.label} est requis`;
        }

        if (value && schema.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[`config.${key}`] = 'Format d\'email invalide';
          }
        }

        if (value && schema.type === 'number' && isNaN(Number(value))) {
          newErrors[`config.${key}`] = 'Doit être un nombre';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
    
    // Clear error for this field
    if (errors[`config.${key}`]) {
      setErrors(prev => ({ ...prev, [`config.${key}`]: '' }));
    }
  };

  const updateNestedConfig = (parentKey: string, childKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [parentKey]: {
          ...prev.config[parentKey],
          [childKey]: value
        }
      }
    }));
  };

  const renderConfigField = (key: string, schema: any) => {
    const value = formData.config[key];
    const error = errors[`config.${key}`];

    if (schema.type === 'object' && schema.properties) {
      return (
        <div key={key} className="space-y-3">
          <Label className="text-sm font-medium">{schema.label}</Label>
          <div className="ml-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {Object.entries(schema.properties).map(([childKey, childSchema]: [string, any]) => (
              <div key={childKey}>
                <Label htmlFor={`${key}.${childKey}`} className="text-sm">
                  {childSchema.label}
                  {childSchema.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  id={`${key}.${childKey}`}
                  type={childSchema.type === 'password' ? 'password' : 'text'}
                  value={value?.[childKey] || ''}
                  onChange={(e) => updateNestedConfig(key, childKey, e.target.value)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (schema.type === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={key} className="text-sm font-medium">
            {schema.label}
          </Label>
          <Switch
            id={key}
            checked={value || false}
            onCheckedChange={(checked) => updateConfig(key, checked)}
          />
        </div>
      );
    }

    return (
      <div key={key}>
        <Label htmlFor={key} className="text-sm font-medium">
          {schema.label}
          {schema.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={key}
          type={schema.type === 'password' ? 'password' : schema.type === 'number' ? 'number' : 'text'}
          value={value || ''}
          onChange={(e) => updateConfig(key, schema.type === 'number' ? Number(e.target.value) : e.target.value)}
          className="mt-1"
        />
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {initialData ? 'Modifier la configuration' : 'Nouvelle configuration email'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Type */}
          <div>
            <Label htmlFor="type" className="text-sm font-medium">
              Type de provider *
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as EmailProviderType }))}
              disabled={!!initialData} // Can't change type when editing
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionnez un type de provider" />
              </SelectTrigger>
              <SelectContent>
                {providerTypes.map(type => (
                  <SelectItem key={type.type} value={type.type}>
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Nom de la configuration *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: SendGrid Production"
              className="mt-1"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority" className="text-sm font-medium">
              Priorité *
            </Label>
            <Input
              id="priority"
              type="number"
              min="1"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Plus le nombre est bas, plus la priorité est élevée (1 = priorité maximale)
            </p>
            {errors.priority && <p className="text-sm text-red-500 mt-1">{errors.priority}</p>}
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Configuration active</Label>
              <p className="text-xs text-muted-foreground">
                Désactivez temporairement cette configuration sans la supprimer
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          {/* Configuration Fields */}
          {selectedProviderType && (
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Configuration {selectedProviderType.name}</h3>
                <div className="space-y-4">
                  {Object.entries(selectedProviderType.configSchema).map(([key, schema]) =>
                    renderConfigField(key, schema)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {initialData ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {initialData ? 'Mettre à jour' : 'Créer'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};