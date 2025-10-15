/**
 * Gestionnaire d'invitations utilisateurs
 * Interface complète pour inviter et gérer les utilisateurs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  UserPlus,
  Users,
  Mail,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
  remindersSent: number;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  acceptanceRate: number;
  averageAcceptanceTime: number;
}

interface InvitationForm {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  message: string;
}

const ROLES = [
  { value: 'admin', label: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités' },
  { value: 'manager', label: 'Manager', description: 'Gestion des équipes et événements' },
  { value: 'user', label: 'Utilisateur', description: 'Accès standard aux fonctionnalités' },
  { value: 'viewer', label: 'Observateur', description: 'Accès en lecture seule' }
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  declined: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirée', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

export const InvitationManager: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Formulaire d'invitation unique
  const [inviteForm, setInviteForm] = useState<InvitationForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    department: '',
    message: ''
  });

  // Formulaire d'invitations multiples
  const [bulkInvitations, setBulkInvitations] = useState<InvitationForm[]>([
    { email: '', firstName: '', lastName: '', role: 'user', department: '', message: '' }
  ]);

  useEffect(() => {
    loadInvitations();
    loadStats();
  }, [selectedStatus]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      params.append('limit', '50');
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/user-invitations?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setInvitations(data.data.invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/user-invitations/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSingleInvite = async () => {
    try {
      setInviting(true);
      setErrors({});

      const response = await fetch('/api/user-invitations/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm)
      });

      const data = await response.json();
      
      if (data.success) {
        setShowInviteForm(false);
        setInviteForm({
          email: '',
          firstName: '',
          lastName: '',
          role: 'user',
          department: '',
          message: ''
        });
        await loadInvitations();
        await loadStats();
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setErrors({ submit: 'Erreur de connexion' });
    } finally {
      setInviting(false);
    }
  };

  const handleBulkInvite = async () => {
    try {
      setInviting(true);
      setErrors({});

      const validInvitations = bulkInvitations.filter(inv => 
        inv.email && inv.firstName && inv.lastName
      );

      if (validInvitations.length === 0) {
        setErrors({ submit: 'Aucune invitation valide trouvée' });
        return;
      }

      const response = await fetch('/api/user-invitations/bulk-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitations: validInvitations,
          sendWelcomeEmail: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowBulkInvite(false);
        setBulkInvitations([
          { email: '', firstName: '', lastName: '', role: 'user', department: '', message: '' }
        ]);
        await loadInvitations();
        await loadStats();
        
        // Afficher un résumé
        alert(`${data.data.summary.successful} invitations envoyées avec succès, ${data.data.summary.failed} ont échoué`);
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error('Error sending bulk invitations:', error);
      setErrors({ submit: 'Erreur de connexion' });
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/user-invitations/${invitationId}/resend`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadInvitations();
      } else {
        alert('Erreur lors du renvoi de l\'invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Erreur de connexion');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette invitation ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/user-invitations/${invitationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await loadInvitations();
        await loadStats();
      } else {
        alert('Erreur lors de l\'annulation de l\'invitation');
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Erreur de connexion');
    }
  };

  const addBulkInvitation = () => {
    setBulkInvitations([
      ...bulkInvitations,
      { email: '', firstName: '', lastName: '', role: 'user', department: '', message: '' }
    ]);
  };

  const removeBulkInvitation = (index: number) => {
    setBulkInvitations(bulkInvitations.filter((_, i) => i !== index));
  };

  const updateBulkInvitation = (index: number, field: keyof InvitationForm, value: string) => {
    const updated = [...bulkInvitations];
    updated[index] = { ...updated[index], [field]: value };
    setBulkInvitations(updated);
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setInviting(true);
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('defaultRole', 'user');

      const response = await fetch('/api/user-invitations/csv-import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        await loadInvitations();
        await loadStats();
        alert(`${data.data.summary.successful} invitations traitées avec succès depuis le CSV`);
      } else {
        alert(`Erreur lors du traitement du CSV: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Erreur lors du téléchargement du CSV');
    } finally {
      setInviting(false);
      event.target.value = ''; // Reset file input
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = 'email,firstName,lastName,role,department\\n' +
                      'john.doe@example.com,John,Doe,user,IT\\n' +
                      'jane.smith@example.com,Jane,Smith,manager,HR';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invitation-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className=\"space-y-6\">
      {/* Statistiques */}
      {stats && (
        <div className=\"grid grid-cols-1 md:grid-cols-5 gap-4\">
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center gap-2\">
                <Users className=\"w-4 h-4 text-blue-600\" />
                <span className=\"text-sm font-medium\">Total</span>
              </div>
              <div className=\"text-2xl font-bold\">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center gap-2\">
                <Clock className=\"w-4 h-4 text-yellow-600\" />
                <span className=\"text-sm font-medium\">En attente</span>
              </div>
              <div className=\"text-2xl font-bold\">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center gap-2\">
                <CheckCircle className=\"w-4 h-4 text-green-600\" />
                <span className=\"text-sm font-medium\">Acceptées</span>
              </div>
              <div className=\"text-2xl font-bold\">{stats.accepted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"flex items-center gap-2\">
                <XCircle className=\"w-4 h-4 text-red-600\" />
                <span className=\"text-sm font-medium\">Refusées</span>
              </div>
              <div className=\"text-2xl font-bold\">{stats.declined}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className=\"p-4\">
              <div className=\"text-sm font-medium\">Taux d'acceptation</div>
              <div className=\"text-2xl font-bold\">{Math.round(stats.acceptanceRate)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions principales */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <UserPlus className=\"w-5 h-5\" />
            Inviter des utilisateurs
          </CardTitle>
          <CardDescription>
            Invitez de nouveaux collaborateurs à rejoindre votre organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className=\"flex flex-wrap gap-3\">
            <Button onClick={() => setShowInviteForm(true)}>
              <UserPlus className=\"w-4 h-4 mr-2\" />
              Inviter un utilisateur
            </Button>
            
            <Button variant=\"outline\" onClick={() => setShowBulkInvite(true)}>
              <Users className=\"w-4 h-4 mr-2\" />
              Invitations multiples
            </Button>
            
            <div className=\"relative\">
              <input
                type=\"file\"
                accept=\".csv\"
                onChange={handleCSVUpload}
                className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer\"
                disabled={inviting}
              />
              <Button variant=\"outline\" disabled={inviting}>
                {inviting ? (
                  <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                ) : (
                  <Upload className=\"w-4 h-4 mr-2\" />
                )}
                Importer CSV
              </Button>
            </div>
            
            <Button variant=\"outline\" onClick={downloadCSVTemplate}>
              <Download className=\"w-4 h-4 mr-2\" />
              Modèle CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'invitation unique */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Inviter un utilisateur</CardTitle>
            <CardDescription>
              Remplissez les informations pour envoyer une invitation
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
              <div>
                <Label htmlFor=\"email\">Email *</Label>
                <Input
                  id=\"email\"
                  type=\"email\"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder=\"john.doe@example.com\"
                />
              </div>
              
              <div>
                <Label htmlFor=\"role\">Rôle *</Label>
                <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className=\"font-medium\">{role.label}</div>
                          <div className=\"text-sm text-gray-600\">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
              <div>
                <Label htmlFor=\"firstName\">Prénom *</Label>
                <Input
                  id=\"firstName\"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder=\"John\"
                />
              </div>
              
              <div>
                <Label htmlFor=\"lastName\">Nom *</Label>
                <Input
                  id=\"lastName\"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder=\"Doe\"
                />
              </div>
            </div>

            <div>
              <Label htmlFor=\"department\">Département</Label>
              <Input
                id=\"department\"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                placeholder=\"IT, RH, Marketing...\"
              />
            </div>

            <div>
              <Label htmlFor=\"message\">Message personnalisé</Label>
              <Textarea
                id=\"message\"
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                placeholder=\"Message d'accueil personnalisé (optionnel)\"
                rows={3}
              />
            </div>

            {errors.submit && (
              <Alert>
                <AlertTriangle className=\"h-4 w-4\" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <div className=\"flex gap-3\">
              <Button 
                onClick={handleSingleInvite} 
                disabled={inviting || !inviteForm.email || !inviteForm.firstName || !inviteForm.lastName}
              >
                {inviting ? (
                  <>
                    <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className=\"w-4 h-4 mr-2\" />
                    Envoyer l'invitation
                  </>
                )}
              </Button>
              
              <Button variant=\"outline\" onClick={() => setShowInviteForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire d'invitations multiples */}
      {showBulkInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invitations multiples</CardTitle>
            <CardDescription>
              Invitez plusieurs utilisateurs en une seule fois
            </CardDescription>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            {bulkInvitations.map((invitation, index) => (
              <div key={index} className=\"border rounded-lg p-4\">
                <div className=\"flex justify-between items-center mb-3\">
                  <h4 className=\"font-medium\">Invitation {index + 1}</h4>
                  {bulkInvitations.length > 1 && (
                    <Button
                      variant=\"outline\"
                      size=\"sm\"
                      onClick={() => removeBulkInvitation(index)}
                    >
                      <Trash2 className=\"w-4 h-4\" />
                    </Button>
                  )}
                </div>
                
                <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3\">
                  <Input
                    placeholder=\"Email\"
                    value={invitation.email}
                    onChange={(e) => updateBulkInvitation(index, 'email', e.target.value)}
                  />
                  <Input
                    placeholder=\"Prénom\"
                    value={invitation.firstName}
                    onChange={(e) => updateBulkInvitation(index, 'firstName', e.target.value)}
                  />
                  <Input
                    placeholder=\"Nom\"
                    value={invitation.lastName}
                    onChange={(e) => updateBulkInvitation(index, 'lastName', e.target.value)}
                  />
                  <Select 
                    value={invitation.role} 
                    onValueChange={(value) => updateBulkInvitation(index, 'role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder=\"Rôle\" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder=\"Département\"
                    value={invitation.department}
                    onChange={(e) => updateBulkInvitation(index, 'department', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button variant=\"outline\" onClick={addBulkInvitation} className=\"w-full\">
              <UserPlus className=\"w-4 h-4 mr-2\" />
              Ajouter une invitation
            </Button>

            {errors.submit && (
              <Alert>
                <AlertTriangle className=\"h-4 w-4\" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}

            <div className=\"flex gap-3\">
              <Button onClick={handleBulkInvite} disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className=\"w-4 h-4 mr-2\" />
                    Envoyer les invitations
                  </>
                )}
              </Button>
              
              <Button variant=\"outline\" onClick={() => setShowBulkInvite(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des invitations */}
      <Card>
        <CardHeader>
          <div className=\"flex justify-between items-center\">
            <div>
              <CardTitle>Invitations envoyées</CardTitle>
              <CardDescription>
                Gérez les invitations en cours et leur statut
              </CardDescription>
            </div>
            
            <div className=\"flex gap-3\">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className=\"w-40\">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=\"all\">Tous les statuts</SelectItem>
                  <SelectItem value=\"pending\">En attente</SelectItem>
                  <SelectItem value=\"accepted\">Acceptées</SelectItem>
                  <SelectItem value=\"declined\">Refusées</SelectItem>
                  <SelectItem value=\"expired\">Expirées</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant=\"outline\" onClick={loadInvitations}>
                <RefreshCw className=\"w-4 h-4\" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className=\"flex items-center justify-center py-8\">
              <Loader2 className=\"w-8 h-8 animate-spin\" />
            </div>
          ) : invitations.length === 0 ? (
            <div className=\"text-center py-8\">
              <Users className=\"w-12 h-12 text-gray-400 mx-auto mb-4\" />
              <h3 className=\"text-lg font-medium mb-2\">Aucune invitation</h3>
              <p className=\"text-gray-600\">
                {selectedStatus === 'all' 
                  ? 'Aucune invitation n\'a encore été envoyée.'
                  : `Aucune invitation avec le statut \"${selectedStatus}\".`
                }
              </p>
            </div>
          ) : (
            <div className=\"space-y-3\">
              {invitations.map((invitation) => {
                const statusConfig = STATUS_CONFIG[invitation.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div key={invitation.id} className=\"border rounded-lg p-4\">
                    <div className=\"flex items-center justify-between\">
                      <div className=\"flex items-center gap-4\">
                        <div>
                          <div className=\"font-medium\">
                            {invitation.firstName} {invitation.lastName}
                          </div>
                          <div className=\"text-sm text-gray-600\">{invitation.email}</div>
                        </div>
                        
                        <Badge className={statusConfig.color}>
                          <StatusIcon className=\"w-3 h-3 mr-1\" />
                          {statusConfig.label}
                        </Badge>
                        
                        <div className=\"text-sm text-gray-600\">
                          <div>Rôle: {ROLES.find(r => r.value === invitation.role)?.label}</div>
                          {invitation.department && <div>Département: {invitation.department}</div>}
                        </div>
                      </div>
                      
                      <div className=\"flex items-center gap-2\">
                        <div className=\"text-right text-sm text-gray-600\">
                          <div>Invité le {formatDate(invitation.createdAt)}</div>
                          <div>Par {invitation.inviterName}</div>
                          {invitation.status === 'pending' && (
                            <div>Expire le {formatDate(invitation.expiresAt)}</div>
                          )}
                        </div>
                        
                        {invitation.status === 'pending' && (
                          <div className=\"flex gap-1\">
                            <Button
                              variant=\"outline\"
                              size=\"sm\"
                              onClick={() => handleResendInvitation(invitation.id)}
                              title=\"Renvoyer l'invitation\"
                            >
                              <RefreshCw className=\"w-4 h-4\" />
                            </Button>
                            
                            <Button
                              variant=\"outline\"
                              size=\"sm\"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              title=\"Annuler l'invitation\"
                            >
                              <Trash2 className=\"w-4 h-4\" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationManager;