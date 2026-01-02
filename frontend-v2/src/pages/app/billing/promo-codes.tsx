import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  Plus,
  Check,
  X,
  ArrowLeft,
  Percent,
  Calendar,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  currency?: string;
  expiresAt?: string;
  usedCount: number;
  maxUses?: number;
  isActive: boolean;
}

export default function PromoCodesPage() {
  const [newPromoCode, setNewPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCodes] = useState<PromoCode[]>([]);

  const [availableCodes] = useState<PromoCode[]>([]);

  const handleApplyCode = async () => {
    if (!newPromoCode.trim()) return;
    
    setIsApplying(true);
    // Simuler l'application du code
    setTimeout(() => {
      setIsApplying(false);
      setNewPromoCode('');
      // Ici on ajouterait la logique pour appliquer le code
    }, 1000);
  };

  const formatDiscount = (code: PromoCode) => {
    if (code.discountType === 'percentage') {
      return `${code.discount}%`;
    } else {
      return `${code.discount}${code.currency || '€'}`;
    }
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return 'Pas d\'expiration';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AppShell title="Codes Promo">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Link href="/app/billing">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                  </Link>
                </div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Gift className="h-6 w-6" />
                  Codes Promo
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez vos codes de réduction et offres spéciales
                </p>
              </div>
            </div>
          </div>

          {/* Apply New Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Appliquer un code promo
              </CardTitle>
              <CardDescription>
                Entrez votre code de réduction pour bénéficier d'une remise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="promo-code">Code promo</Label>
                  <Input
                    id="promo-code"
                    placeholder="Entrez votre code promo"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleApplyCode}
                    disabled={!newPromoCode.trim() || isApplying}
                  >
                    {isApplying ? 'Application...' : 'Appliquer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applied Codes */}
          {appliedCodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Codes appliqués
                </CardTitle>
                <CardDescription>
                  Codes promo actuellement actifs sur votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {appliedCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-4 border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Gift className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{code.code}</h3>
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                              -{formatDiscount(code)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{code.description}</p>
                          {code.expiresAt && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              Expire le {formatExpiryDate(code.expiresAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Codes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Codes disponibles
              </CardTitle>
              <CardDescription>
                Codes promo que vous pouvez utiliser
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableCodes.length > 0 ? (
                <div className="space-y-3">
                  {availableCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Gift className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{code.code}</h3>
                            <Badge variant="outline">
                              -{formatDiscount(code)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{code.description}</p>
                          <div className="flex items-center gap-4 mt-1">
                            {code.expiresAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expire le {formatExpiryDate(code.expiresAt)}
                              </p>
                            )}
                            {code.maxUses && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {code.usedCount}/{code.maxUses} utilisations
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setNewPromoCode(code.code)}
                      >
                        Utiliser
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun code disponible</h3>
                  <p className="text-muted-foreground">
                    Aucun code promo n'est actuellement disponible pour votre compte.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <Gift className="h-4 w-4" />
            <AlertDescription>
              <strong>Astuce :</strong> Suivez-nous sur les réseaux sociaux pour être informé des nouveaux codes promo et offres spéciales !
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </AppShell>
  );
}