/**
 * Composant de gestion des domaines personnalisés
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Globe, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react';

interface CustomDomain {
  id: string;
  tenantId: string;
  domain: string;
  subdomain?: string;
  type: 'custom' | 'subdomain';
  status: 'pending' | 'dns_verification' | 'ssl_provisioning' | 'active' | 'failed' | 'suspended';
  dnsRecords: DNSRecord[];
  dnsVerified: boolean;
  dnsVerifiedAt?: Date;
  sslEnabled: boolean;
  sslStatus: 'none' | 'pending' | 'active' | 'expired' | 'failed';
  certificateIssuer?: string;
  certificateExpiresAt?: Date;
  redirectToHttps: boolean;
  wwwRedirect: 'none' | 'www_to_non_www' | 'non_www_to_www';
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
  verified: boolean;
  verifiedAt?: Date;
}

export const CustomDomainManager: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // État du formulaire d'ajout
  const [formData, setFormData] = useState({
    domain: '',
    type: 'custom' as 'custom' | 'subdomain',
    subdomain: '',
    redirectToHttps: true,
    wwwRedirect: 'none' as 'none' | 'www_to_non_www' | 'non_www_to_www'
  });

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const response = await fetch('/api/custom-domains');
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des domaines' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!formData.domain) {
      setMessage({ type: 'error', text: 'Le domaine est requis' });
      return;
    }

    setAdding(true);
    setMessage(null);

    try {
      const response = await fetch('/api/custom-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newDomain = await response.json();
        setDomains(prev => [newDomain, ...prev]);
        setShowAddForm(false);
        setFormData({
          domain: '',
          type: 'custom',
          subdomain: '',
          redirectToHttps: true,
          wwwRedirect: 'none'
        });
        setMessage({ type: 'success', text: 'Domaine ajouté avec succès' });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'ajout du domaine' });
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const response = await fetch(`/api/custom-domains/${domainId}/verify`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        await loadDomains(); // Recharger les domaines
        
        if (result.verified) {
          setMessage({ type: 'success', text: 'Domaine vérifié avec succès' });
        } else {
          setMessage({ type: 'error', text: 'Vérification échouée: ' + result.errors.join(', ') });
        }
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la vérification' });
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-domains/${domainId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
        setMessage({ type: 'success', text: 'Domaine supprimé avec succès' });
      }
    } catch (error) {
      console.error('Error removing domain:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copié dans le presse-papiers' });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-gray-500', text: 'En attente', icon: Clock },
      dns_verification: { color: 'bg-yellow-500', text: 'Vérification DNS', icon: RefreshCw },
      ssl_provisioning: { color: 'bg-blue-500', text: 'Provisioning SSL', icon: RefreshCw },
      active: { color: 'bg-green-500', text: 'Actif', icon: CheckCircle },
      failed: { color: 'bg-red-500', text: 'Échec', icon: XCircle },
      suspended: { color: 'bg-orange-500', text: 'Suspendu', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getSSLBadge = (sslStatus: string, sslEnabled: boolean) => {
    if (!sslEnabled || sslStatus === 'none') {
      return <Badge variant="outline">SSL Désactivé</Badge>;
    }

    const sslConfig = {
      pending: { color: 'bg-yellow-500', text: 'SSL En cours' },
      active: { color: 'bg-green-500', text: 'SSL Actif' },
      expired: { color: 'bg-red-500', text: 'SSL Expiré' },
      failed: { color: 'bg-red-500', text: 'SSL Échec' }
    };

    const config = sslConfig[sslStatus as keyof typeof sslConfig] || sslConfig.pending;

    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Chargement des domaines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Domaines Personnalisés</h1>
          <p className="text-gray-600">Gérez vos domaines et sous-domaines personnalisés</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un domaine
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un domaine personnalisé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domain">Domaine</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'custom' | 'subdomain') => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Domaine personnalisé</SelectItem>
                    <SelectItem value="subdomain">Sous-domaine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'subdomain' && (
              <div>
                <Label htmlFor="subdomain">Sous-domaine</Label>
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                  placeholder="app"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Résultat: {formData.subdomain}.{formData.domain}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="redirectToHttps">Redirection HTTPS</Label>
                <Select
                  value={formData.redirectToHttps.toString()}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, redirectToHttps: value === 'true' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activée</SelectItem>
                    <SelectItem value="false">Désactivée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wwwRedirect">Redirection WWW</Label>
                <Select
                  value={formData.wwwRedirect}
                  onValueChange={(value: 'none' | 'www_to_non_www' | 'non_www_to_www') => 
                    setFormData(prev => ({ ...prev, wwwRedirect: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="www_to_non_www">www → non-www</SelectItem>
                    <SelectItem value="non_www_to_www">non-www → www</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddDomain} disabled={adding}>
                {adding ? 'Ajout...' : 'Ajouter'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {domains.map((domain) => (
          <Card key={domain.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-lg">
                      {domain.type === 'subdomain' && domain.subdomain 
                        ? `${domain.subdomain}.${domain.domain}`
                        : domain.domain
                      }
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      {domain.type === 'custom' ? 'Domaine personnalisé' : 'Sous-domaine'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(domain.status)}
                  {getSSLBadge(domain.sslStatus, domain.sslEnabled)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDomain(domain.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dns" className="w-full">
                <TabsList>
                  <TabsTrigger value="dns">Configuration DNS</TabsTrigger>
                  <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
                  <TabsTrigger value="settings">Paramètres</TabsTrigger>
                </TabsList>

                <TabsContent value="dns" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Enregistrements DNS requis</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyDomain(domain.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Vérifier
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {domain.dnsRecords.map((record, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{record.type}</Badge>
                            <span className="font-mono text-sm">{record.name}</span>
                            {record.verified ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(record.value)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="font-mono text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {record.value}
                        </div>
                        {record.ttl && (
                          <p className="text-xs text-gray-500 mt-1">TTL: {record.ttl}s</p>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="ssl" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Statut SSL</Label>
                      <div className="mt-1">
                        {getSSLBadge(domain.sslStatus, domain.sslEnabled)}
                      </div>
                    </div>
                    {domain.certificateIssuer && (
                      <div>
                        <Label>Émetteur du certificat</Label>
                        <p className="text-sm text-gray-600 mt-1">{domain.certificateIssuer}</p>
                      </div>
                    )}
                  </div>
                  
                  {domain.certificateExpiresAt && (
                    <div>
                      <Label>Expiration du certificat</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(domain.certificateExpiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Redirection HTTPS</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {domain.redirectToHttps ? 'Activée' : 'Désactivée'}
                      </p>
                    </div>
                    <div>
                      <Label>Redirection WWW</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {domain.wwwRedirect === 'none' ? 'Aucune' :
                         domain.wwwRedirect === 'www_to_non_www' ? 'www → non-www' :
                         'non-www → www'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Créé le</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(domain.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {domain.activatedAt && (
                      <div>
                        <Label>Activé le</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(domain.activatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {domain.status === 'active' && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Domaine actif</p>
                        <p className="text-xs text-green-600">
                          Votre domaine est configuré et accessible
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {domains.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun domaine personnalisé</h3>
            <p className="text-gray-600 mb-4">
              Ajoutez votre premier domaine personnalisé pour commencer
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un domaine
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};