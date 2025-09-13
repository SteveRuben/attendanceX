/**
 * Composant de gestion de la personnalisation des fonctionnalités
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import {
    Settings,
    Plus,
    Trash2,
    Save,
    Eye,
    EyeOff,
    ToggleLeft,
    ToggleRight,
    Layout,
    Database,
    Workflow
} from 'lucide-react';

interface FeatureToggle {
    id: string;
    name: string;
    key: string;
    description: string;
    enabled: boolean;
    category: 'core' | 'advanced' | 'experimental';
    dependencies?: string[];
}

interface CustomField {
    id: string;
    name: string;
    key: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
    required: boolean;
    options?: string[];
    defaultValue?: any;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}

interface DashboardLayout {
    id: string;
    name: string;
    widgets: DashboardWidget[];
    columns: number;
    isDefault: boolean;
}

interface DashboardWidget {
    id: string;
    type: 'chart' | 'metric' | 'table' | 'custom';
    title: string;
    position: { x: number; y: number; w: number; h: number };
    config: Record<string, any>;
}

interface WorkflowConfig {
    id: string;
    name: string;
    trigger: 'manual' | 'automatic' | 'scheduled';
    steps: WorkflowStep[];
    enabled: boolean;
}

interface WorkflowStep {
    id: string;
    type: 'action' | 'condition' | 'notification';
    config: Record<string, any>;
    nextSteps: string[];
}

export const FeatureCustomizationManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState('features');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // États pour chaque section
    const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [dashboardLayouts, setDashboardLayouts] = useState<DashboardLayout[]>([]);
    const [workflowConfigs, setWorkflowConfigs] = useState<WorkflowConfig[]>([]);

    // États des formulaires
    const [showAddField, setShowAddField] = useState(false);
    const [showAddLayout, setShowAddLayout] = useState(false);
    const [showAddWorkflow, setShowAddWorkflow] = useState(false);

    const [newField, setNewField] = useState<Partial<CustomField>>({
        name: '',
        key: '',
        type: 'text',
        required: false,
        options: []
    });

    useEffect(() => {
        loadCustomizations();
    }, []);

    const loadCustomizations = async () => {
        try {
            setLoading(true);

            // Charger les feature toggles
            const featuresResponse = await fetch('/api/feature-customization/features');
            if (featuresResponse.ok) {
                const features = await featuresResponse.json();
                setFeatureToggles(features);
            }

            // Charger les champs personnalisés
            const fieldsResponse = await fetch('/api/feature-customization/custom-fields');
            if (fieldsResponse.ok) {
                const fields = await fieldsResponse.json();
                setCustomFields(fields);
            }

            // Charger les layouts de dashboard
            const layoutsResponse = await fetch('/api/feature-customization/dashboard-layouts');
            if (layoutsResponse.ok) {
                const layouts = await layoutsResponse.json();
                setDashboardLayouts(layouts);
            }

            // Charger les workflows
            const workflowsResponse = await fetch('/api/feature-customization/workflows');
            if (workflowsResponse.ok) {
                const workflows = await workflowsResponse.json();
                setWorkflowConfigs(workflows);
            }
        } catch (error) {
            console.error('Error loading customizations:', error);
            setMessage({ type: 'error', text: 'Erreur lors du chargement des personnalisations' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFeature = async (featureId: string, enabled: boolean) => {
        try {
            const response = await fetch(`/api/feature-customization/features/${featureId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                setFeatureToggles(prev =>
                    prev.map(f => f.id === featureId ? { ...f, enabled } : f)
                );
                setMessage({ type: 'success', text: 'Fonctionnalité mise à jour' });
            }
        } catch (error) {
            console.error('Error toggling feature:', error);
            setMessage({ type: 'error', text: 'Erreur lors de la mise à jour' });
        }
    };

    const handleAddCustomField = async () => {
        if (!newField.name || !newField.key) {
            setMessage({ type: 'error', text: 'Nom et clé sont requis' });
            return;
        }

        try {
            setSaving(true);
            const response = await fetch('/api/feature-customization/custom-fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newField)
            });

            if (response.ok) {
                const field = await response.json();
                setCustomFields(prev => [...prev, field]);
                setNewField({ name: '', key: '', type: 'text', required: false, options: [] });
                setShowAddField(false);
                setMessage({ type: 'success', text: 'Champ personnalisé ajouté' });
            }
        } catch (error) {
            console.error('Error adding custom field:', error);
            setMessage({ type: 'error', text: 'Erreur lors de l\'ajout du champ' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveCustomField = async (fieldId: string) => {
        if (!confirm('Supprimer ce champ personnalisé ?')) return;

        try {
            const response = await fetch(`/api/feature-customization/custom-fields/${fieldId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setCustomFields(prev => prev.filter(f => f.id !== fieldId));
                setMessage({ type: 'success', text: 'Champ supprimé' });
            }
        } catch (error) {
            console.error('Error removing custom field:', error);
            setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
        }
    };

    const getCategoryBadge = (category: string) => {
        const colors = {
            core: 'bg-blue-500',
            advanced: 'bg-purple-500',
            experimental: 'bg-orange-500'
        };
        return (
            <Badge className={`${colors[category as keyof typeof colors]} text-white`}>
                {category}
            </Badge>
        );
    };

    const getFieldTypeBadge = (type: string) => {
        const colors = {
            text: 'bg-gray-500',
            number: 'bg-green-500',
            date: 'bg-blue-500',
            select: 'bg-purple-500',
            boolean: 'bg-yellow-500',
            textarea: 'bg-indigo-500'
        };
        return (
            <Badge className={`${colors[type as keyof typeof colors]} text-white`}>
                {type}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Chargement des personnalisations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Personnalisation des Fonctionnalités</h1>
                    <p className="text-gray-600">Configurez les fonctionnalités et l'interface de votre tenant</p>
                </div>
            </div>

            {message && (
                <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="features" className="flex items-center gap-2">
                        <ToggleLeft className="w-4 h-4" />
                        Fonctionnalités
                    </TabsTrigger>
                    <TabsTrigger value="fields" className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Champs
                    </TabsTrigger>
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="flex items-center gap-2">
                        <Workflow className="w-4 h-4" />
                        Workflows
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="features" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Toggles</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {featureToggles.map((feature) => (
                                    <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium">{feature.name}</h3>
                                                {getCategoryBadge(feature.category)}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
                                            {feature.dependencies && feature.dependencies.length > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    Dépendances: {feature.dependencies.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {feature.enabled ? (
                                                <Eye className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            <Switch
                                                checked={feature.enabled}
                                                onCheckedChange={(enabled) => handleToggleFeature(feature.id, enabled)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="fields" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Champs Personnalisés</h2>
                        <Button onClick={() => setShowAddField(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un champ
                        </Button>
                    </div>

                    {showAddField && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Nouveau Champ Personnalisé</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fieldName">Nom du champ</Label>
                                        <Input
                                            id="fieldName"
                                            value={newField.name || ''}
                                            onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Nom d'affichage"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fieldKey">Clé du champ</Label>
                                        <Input
                                            id="fieldKey"
                                            value={newField.key || ''}
                                            onChange={(e) => setNewField(prev => ({ ...prev, key: e.target.value }))}
                                            placeholder="field_key"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fieldType">Type de champ</Label>
                                        <Select
                                            value={newField.type}
                                            onValueChange={(value: any) => setNewField(prev => ({ ...prev, type: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Texte</SelectItem>
                                                <SelectItem value="number">Nombre</SelectItem>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="select">Liste déroulante</SelectItem>
                                                <SelectItem value="boolean">Booléen</SelectItem>
                                                <SelectItem value="textarea">Zone de texte</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="fieldRequired"
                                            checked={newField.required || false}
                                            onCheckedChange={(required) => setNewField(prev => ({ ...prev, required }))}
                                        />
                                        <Label htmlFor="fieldRequired">Champ requis</Label>
                                    </div>
                                </div>

                                {newField.type === 'select' && (
                                    <div>
                                        <Label htmlFor="fieldOptions">Options (une par ligne)</Label>
                                        <Textarea
                                            id="fieldOptions"
                                            value={newField.options?.join('\n') || ''}
                                            onChange={(e) => setNewField(prev => ({
                                                ...prev,
                                                options: e.target.value.split('\n').filter(o => o.trim())
                                            }))}
                                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                                            rows={4}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button onClick={handleAddCustomField} disabled={saving}>
                                        {saving ? 'Ajout...' : 'Ajouter'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowAddField(false)}>
                                        Annuler
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-4">
                        {customFields.map((field) => (
                            <Card key={field.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium">{field.name}</h3>
                                                {getFieldTypeBadge(field.type)}
                                                {field.required && (
                                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                                        Requis
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-1">Clé: {field.key}</p>
                                            {field.options && field.options.length > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    Options: {field.options.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveCustomField(field.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {customFields.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-8">
                                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">Aucun champ personnalisé</h3>
                                <p className="text-gray-600 mb-4">
                                    Ajoutez des champs personnalisés pour étendre vos formulaires
                                </p>
                                <Button onClick={() => setShowAddField(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter le premier champ
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="dashboard" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Layouts de Dashboard</h2>
                        <Button onClick={() => setShowAddLayout(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouveau layout
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {dashboardLayouts.map((layout) => (
                            <Card key={layout.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium">{layout.name}</h3>
                                                {layout.isDefault && (
                                                    <Badge className="bg-green-500 text-white">Par défaut</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {layout.widgets.length} widgets • {layout.columns} colonnes
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {dashboardLayouts.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-8">
                                <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">Aucun layout personnalisé</h3>
                                <p className="text-gray-600 mb-4">
                                    Créez des layouts de dashboard personnalisés
                                </p>
                                <Button onClick={() => setShowAddLayout(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Créer un layout
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="workflows" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Workflows Personnalisés</h2>
                        <Button onClick={() => setShowAddWorkflow(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nouveau workflow
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {workflowConfigs.map((workflow) => (
                            <Card key={workflow.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium">{workflow.name}</h3>
                                                <Badge variant="outline">{workflow.trigger}</Badge>
                                                {workflow.enabled ? (
                                                    <Badge className="bg-green-500 text-white">Actif</Badge>
                                                ) : (
                                                    <Badge variant="outline">Inactif</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {workflow.steps.length} étapes
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Switch
                                                checked={workflow.enabled}
                                                onCheckedChange={(enabled) => {
                                                    // TODO: Implémenter la mise à jour du workflow
                                                }}
                                            />
                                            <Button variant="outline" size="sm">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {workflowConfigs.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-8">
                                <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">Aucun workflow personnalisé</h3>
                                <p className="text-gray-600 mb-4">
                                    Automatisez vos processus avec des workflows personnalisés
                                </p>
                                <Button onClick={() => setShowAddWorkflow(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Créer un workflow
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};