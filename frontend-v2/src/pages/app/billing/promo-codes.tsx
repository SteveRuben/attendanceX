import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Plus, 
  Copy, 
  Edit, 
  Trash2,
  Calendar,
  Percent,
  Users
} from 'lucide-react';

export default function PromoCodesPage() {
  const [promoCodes] = useState([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    type: 'percentage',
    value: '',
    description: '',
    usageLimit: '',
    expiresAt: ''
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      disabled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {status}
      </Badge>
    );
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    // Vous pouvez ajouter une notification ici
  };

  const handleCreatePromoCode = () => {
    // Logique de création du code promo
    console.log('Creating promo code:', newPromoCode);
    setShowCreateForm(false);
    setNewPromoCode({
      code: '',
      type: 'percentage',
      value: '',
      description: '',
      usageLimit: '',
      expiresAt: ''
    });
  };

  return (
    <AppShell title="Codes Promo">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Gift className="h-6 w-6" />
                  Codes Promo
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Créez et gérez vos codes de réduction
                </p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Code
              </Button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Codes</p>
                    <p className="text-2xl font-bold">{promoCodes.length}</p>
                  </div>
                  <Gift className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Codes Actifs</p>
                    <p className="text-2xl font-bold">{promoCodes.filter(c => c.status === 'active').length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utilisations</p>
                    <p className="text-2xl font-bold">{promoCodes.reduce((sum, code) => sum + (code.usageCount || 0), 0)}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taux d'Usage</p>
                    <p className="text-2xl font-bold">0%</p>
                  </div>
                  <Percent className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de Création */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Créer un Nouveau Code Promo</CardTitle>
                <CardDescription>
                  Configurez les paramètres de votre code de réduction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code Promo</Label>
                    <Input 
                      id="code" 
                      placeholder="MONCODE20"
                      value={newPromoCode.code}
                      onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type de Réduction</Label>
                    <select 
                      id="type" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newPromoCode.type}
                      onChange={(e) => setNewPromoCode({...newPromoCode, type: e.target.value})}
                    >
                      <option value="percentage">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe (€)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Valeur</Label>
                    <Input 
                      id="value" 
                      type="number"
                      placeholder={newPromoCode.type === 'percentage' ? '20' : '15'}
                      value={newPromoCode.value}
                      onChange={(e) => setNewPromoCode({...newPromoCode, value: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usageLimit">Limite d'utilisation</Label>
                    <Input 
                      id="usageLimit" 
                      type="number"
                      placeholder="100"
                      value={newPromoCode.usageLimit}
                      onChange={(e) => setNewPromoCode({...newPromoCode, usageLimit: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Description du code promo"
                    value={newPromoCode.description}
                    onChange={(e) => setNewPromoCode({...newPromoCode, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Date d'expiration</Label>
                  <Input 
                    id="expiresAt" 
                    type="date"
                    value={newPromoCode.expiresAt}
                    onChange={(e) => setNewPromoCode({...newPromoCode, expiresAt: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreatePromoCode}>
                    Créer le Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des Codes Promo */}
          <Card>
            <CardHeader>
              <CardTitle>Codes Promo Existants</CardTitle>
              <CardDescription>
                Gérez vos codes de réduction actifs et expirés
              </CardDescription>
            </CardHeader>
            <CardContent>
              {promoCodes.length > 0 ? (
                <div className="space-y-3">
                  {promoCodes.map((promoCode) => (
                    <div key={promoCode.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Gift className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-semibold">{promoCode.code}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(promoCode.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">{promoCode.description}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm">
                              {promoCode.type === 'percentage' ? `${promoCode.value}%` : `${promoCode.value}€`}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {promoCode.usageCount}/{promoCode.usageLimit} utilisations
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Expire le {promoCode.expiresAt}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(promoCode.status)}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun code promo</h3>
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore créé de codes promo. Cliquez sur "Nouveau Code" pour commencer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}