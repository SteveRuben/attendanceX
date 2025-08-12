// src/components/certificates/CertificateDistribution.tsx - Distribution des certificats

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  FileText,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Certificate {
  id: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  eventId: string;
  eventTitle: string;
  generatedAt: Date;
  downloadUrl?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  downloadCount: number;
  lastDownloadAt?: Date;
  status: 'generated' | 'sent' | 'downloaded' | 'error';
  validationCode: string;
}

interface BulkGenerationStatus {
  total: number;
  generated: number;
  failed: number;
  inProgress: boolean;
  errors: string[];
}

interface CertificateDistributionProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}

const CertificateDistribution = ({
  eventId,
  eventTitle,
  onClose
}: CertificateDistributionProps) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<BulkGenerationStatus | null>(null);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: `Votre certificat de participation - ${eventTitle}`,
    body: `Bonjour {participantName},

Nous avons le plaisir de vous transmettre votre certificat de participation pour l'événement "${eventTitle}".

Vous pouvez télécharger votre certificat en cliquant sur le lien ci-dessous ou en utilisant le code de validation : {validationCode}

Lien de téléchargement : {downloadLink}

Cordialement,
L'équipe organisatrice`
  });

  useEffect(() => {
    loadCertificates();
  }, [eventId]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/certificates/events/${eventId}`);
      const data = await response.json();
      
      if (data.success) {
        setCertificates(data.data.certificates || []);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      toast.error('Erreur lors du chargement des certificats');
    } finally {
      setLoading(false);
    }
  };

  const generateBulkCertificates = async () => {
    try {
      setLoading(true);
      setBulkStatus({
        total: 0,
        generated: 0,
        failed: 0,
        inProgress: true,
        errors: []
      });

      const response = await fetch(`/api/certificates/events/${eventId}/bulk-generate`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBulkStatus({
          total: data.data.count,
          generated: data.data.count,
          failed: 0,
          inProgress: false,
          errors: []
        });
        
        await loadCertificates();
        toast.success(`${data.data.count} certificats générés avec succès`);
      } else {
        throw new Error(data.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      setBulkStatus(prev => prev ? {
        ...prev,
        inProgress: false,
        errors: [...prev.errors, error.message]
      } : null);
      toast.error(error.message || 'Erreur lors de la génération en masse');
    } finally {
      setLoading(false);
    }
  };

  const sendBulkEmails = async () => {
    const certificatesToSend = selectedCertificates.length > 0 
      ? certificates.filter(c => selectedCertificates.includes(c.id))
      : certificates.filter(c => !c.emailSent);

    if (certificatesToSend.length === 0) {
      toast.warning('Aucun certificat à envoyer');
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const certificate of certificatesToSend) {
        try {
          const response = await fetch(`/api/certificates/${certificate.id}/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subject: emailTemplate.subject.replace('{participantName}', certificate.participantName),
              body: emailTemplate.body
                .replace('{participantName}', certificate.participantName)
                .replace('{validationCode}', certificate.validationCode)
                .replace('{downloadLink}', `${window.location.origin}/certificates/download/${certificate.id}`)
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} emails envoyés avec succès`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} emails ont échoué`);
      }

      await loadCertificates();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi des emails');
    } finally {
      setLoading(false);
    }
  };

  const downloadBulkCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/certificates/events/${eventId}/bulk-download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificats-${eventTitle.replace(/[^a-zA-Z0-9]/g, '-')}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Archive téléchargée avec succès');
      } else {
        throw new Error('Erreur lors du téléchargement');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement de l\'archive');
    } finally {
      setLoading(false);
    }
  };

  const toggleCertificateSelection = (certificateId: string) => {
    setSelectedCertificates(prev => 
      prev.includes(certificateId)
        ? prev.filter(id => id !== certificateId)
        : [...prev, certificateId]
    );
  };

  const selectAllCertificates = () => {
    setSelectedCertificates(
      selectedCertificates.length === certificates.length 
        ? [] 
        : certificates.map(c => c.id)
    );
  };

  const getStatusBadge = (certificate: Certificate) => {
    const configs = {
      generated: { label: 'Généré', color: 'bg-blue-100 text-blue-800', icon: FileText },
      sent: { label: 'Envoyé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      downloaded: { label: 'Téléchargé', color: 'bg-purple-100 text-purple-800', icon: Download },
      error: { label: 'Erreur', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = configs[certificate.status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: certificates.length,
    generated: certificates.filter(c => c.status === 'generated').length,
    sent: certificates.filter(c => c.emailSent).length,
    downloaded: certificates.filter(c => c.downloadCount > 0).length,
    pending: certificates.filter(c => !c.emailSent).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Distribution des certificats</h2>
          <p className="text-muted-foreground">{eventTitle}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.generated}</div>
            <div className="text-sm text-muted-foreground">Générés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.sent}</div>
            <div className="text-sm text-muted-foreground">Envoyés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.downloaded}</div>
            <div className="text-sm text-muted-foreground">Téléchargés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
      </div>

      {/* Statut de génération en masse */}
      {bulkStatus && bulkStatus.inProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="font-medium">Génération en cours...</span>
            </div>
            <Progress 
              value={bulkStatus.total > 0 ? (bulkStatus.generated / bulkStatus.total) * 100 : 0} 
              className="mb-2" 
            />
            <div className="text-sm text-muted-foreground">
              {bulkStatus.generated} / {bulkStatus.total} certificats générés
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="certificates" className="w-full">
        <TabsList>
          <TabsTrigger value="certificates">Certificats</TabsTrigger>
          <TabsTrigger value="email">Configuration email</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="certificates" className="space-y-4">
          {/* Actions en masse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Actions en masse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={generateBulkCertificates}
                  disabled={loading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Générer tous les certificats
                </Button>
                
                <Button 
                  onClick={sendBulkEmails}
                  disabled={loading || stats.pending === 0}
                  variant="outline"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer par email ({stats.pending})
                </Button>
                
                <Button 
                  onClick={downloadBulkCertificates}
                  disabled={loading || stats.generated === 0}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger archive ZIP
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liste des certificats */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liste des certificats</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllCertificates}
                  >
                    {selectedCertificates.length === certificates.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadCertificates}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun certificat généré pour cet événement</p>
                  <Button 
                    onClick={generateBulkCertificates}
                    className="mt-4"
                    disabled={loading}
                  >
                    Générer les certificats
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {certificates.map((certificate) => (
                    <div
                      key={certificate.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        selectedCertificates.includes(certificate.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedCertificates.includes(certificate.id)}
                          onChange={() => toggleCertificateSelection(certificate.id)}
                        />
                        <div>
                          <div className="font-medium">{certificate.participantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {certificate.participantEmail}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Code: {certificate.validationCode}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(certificate)}
                        
                        {certificate.downloadCount > 0 && (
                          <Badge variant="outline">
                            {certificate.downloadCount} téléchargement{certificate.downloadCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                        
                        <div className="flex space-x-1">
                          {certificate.downloadUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(certificate.downloadUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {!certificate.emailSent && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCertificates([certificate.id]);
                                sendBulkEmails();
                              }}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template d'email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sujet</label>
                <input
                  type="text"
                  value={emailTemplate.subject}
                  onChange={(e) => setEmailTemplate(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Corps du message</label>
                <textarea
                  value={emailTemplate.body}
                  onChange={(e) => setEmailTemplate(prev => ({ ...prev, body: e.target.value }))}
                  rows={10}
                  className="w-full p-2 border rounded-md"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  Variables disponibles: {'{participantName}'}, {'{validationCode}'}, {'{downloadLink}'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation des certificats</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Chaque certificat contient un code de validation unique et un QR code permettant de vérifier son authenticité.
                  Les participants peuvent utiliser l'URL de validation : {window.location.origin}/certificates/validate
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CertificateDistribution;