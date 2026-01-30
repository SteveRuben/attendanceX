import React, { useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Scan, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Calendar,
  Ticket,
  Camera,
  Loader2
} from 'lucide-react';
import { useTicketValidation } from '@/hooks/useTicketValidation';
import { TicketStatus } from '@/types/ticket.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function TicketValidationPage() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'qr'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    validationResult,
    validating,
    error,
    validateTicket,
    checkInTicket,
    clearResult,
    clearError
  } = useTicketValidation();

  const handleManualValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber.trim() && !securityCode.trim()) {
      toast.error('Veuillez saisir au moins le numéro de billet ou le code de sécurité');
      return;
    }

    await validateTicket({
      ticketNumber: ticketNumber.trim() || undefined,
      securityCode: securityCode.trim() || undefined
    });
  };

  const handleQrValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrCode.trim()) {
      toast.error('Veuillez saisir le code QR');
      return;
    }

    await validateTicket({
      qrCode: qrCode.trim()
    });
  };

  const handleCheckIn = async () => {
    if (!validationResult?.ticket?.id) return;

    const ticket = await checkInTicket(validationResult.ticket.id);
    if (ticket) {
      toast.success('Check-in effectué avec succès !');
    }
  };

  const handleClearAll = () => {
    setTicketNumber('');
    setSecurityCode('');
    setQrCode('');
    clearResult();
    clearError();
  };

  const handleQrScan = () => {
    // Simuler un scan QR (dans une vraie app, utiliser une librairie de scan QR)
    fileInputRef.current?.click();
  };

  const getStatusBadge = (status: TicketStatus) => {
    const variants = {
      [TicketStatus.PENDING]: {
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
        icon: AlertTriangle,
        label: 'En attente'
      },
      [TicketStatus.CONFIRMED]: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
        icon: CheckCircle,
        label: 'Confirmé'
      },
      [TicketStatus.CANCELLED]: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
        icon: XCircle,
        label: 'Annulé'
      },
      [TicketStatus.USED]: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        icon: CheckCircle,
        label: 'Utilisé'
      },
      [TicketStatus.EXPIRED]: {
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
        icon: AlertTriangle,
        label: 'Expiré'
      }
    };

    const variant = variants[status];
    const Icon = variant.icon;

    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  return (
    <AppShell title="Validation des billets">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              Validation des billets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Validez et effectuez le check-in des participants à votre événement
            </p>
          </div>

          {/* Erreur globale */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Fermer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Méthodes de validation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Validation manuelle */}
            <Card className={activeTab === 'manual' ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Validation manuelle
                </CardTitle>
                <CardDescription>
                  Saisissez le numéro de billet ou le code de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualValidation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketNumber">Numéro de billet</Label>
                    <Input
                      id="ticketNumber"
                      value={ticketNumber}
                      onChange={(e) => {
                        setTicketNumber(e.target.value);
                        setActiveTab('manual');
                      }}
                      placeholder="TKT-XXXXXXXX-XXXXXX"
                      className="font-mono"
                    />
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    ou
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="securityCode">Code de sécurité</Label>
                    <Input
                      id="securityCode"
                      value={securityCode}
                      onChange={(e) => {
                        setSecurityCode(e.target.value);
                        setActiveTab('manual');
                      }}
                      placeholder="123456"
                      className="font-mono"
                      maxLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={validating || (!ticketNumber.trim() && !securityCode.trim())}
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider le billet
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Validation QR Code */}
            <Card className={activeTab === 'qr' ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>
                  Scannez ou saisissez le code QR du billet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQrValidation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qrCode">Code QR</Label>
                    <Input
                      id="qrCode"
                      value={qrCode}
                      onChange={(e) => {
                        setQrCode(e.target.value);
                        setActiveTab('qr');
                      }}
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                      className="font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1" 
                      disabled={validating || !qrCode.trim()}
                    >
                      {validating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validation...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Valider
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleQrScan}
                      disabled={validating}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      // Dans une vraie app, traiter l'image pour extraire le QR code
                      toast.info('Fonctionnalité de scan à implémenter');
                    }}
                  />
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Résultat de la validation */}
          {validationResult && (
            <Card className={validationResult.isValid ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validationResult.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Résultat de la validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Message de validation */}
                <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                  <AlertDescription>
                    {validationResult.message}
                  </AlertDescription>
                </Alert>

                {/* Informations du billet si valide */}
                {validationResult.isValid && validationResult.ticket && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{validationResult.ticket.participantName}</p>
                            <p className="text-sm text-muted-foreground">
                              {validationResult.ticket.participantEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-mono text-sm">{validationResult.ticket.ticketNumber}</p>
                            <p className="text-xs text-muted-foreground">Numéro de billet</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">
                              {format(new Date(validationResult.ticket.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground">Date de création</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(validationResult.ticket.status)}
                        </div>
                      </div>
                    </div>

                    {/* Check-in information */}
                    {validationResult.ticket.checkedInAt ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Check-in déjà effectué le {format(new Date(validationResult.ticket.checkedInAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </AlertDescription>
                      </Alert>
                    ) : validationResult.canCheckIn ? (
                      <div className="flex gap-2">
                        <Button onClick={handleCheckIn} disabled={validating}>
                          {validating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Check-in...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Effectuer le check-in
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Ce billet ne peut pas être utilisé pour le check-in
                          {validationResult.alreadyUsed && ' (déjà utilisé)'}
                          {validationResult.expired && ' (expiré)'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={handleClearAll}>
                    Nouvelle validation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Ticket className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Validation manuelle</p>
                  <p className="text-muted-foreground">
                    Saisissez le numéro de billet (format TKT-XXXXXXXX-XXXXXX) ou le code de sécurité à 6 chiffres
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <QrCode className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Scan QR Code</p>
                  <p className="text-muted-foreground">
                    Scannez le code QR du billet ou saisissez-le manuellement
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Check-in</p>
                  <p className="text-muted-foreground">
                    Une fois le billet validé, effectuez le check-in pour marquer la présence du participant
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}