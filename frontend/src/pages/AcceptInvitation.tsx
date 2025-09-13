/**
 * Page d'acceptation d'invitation
 * Permet aux utilisateurs invités de créer leur compte
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  UserCheck,
  Building2,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface InvitationDetails {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationName: string;
  inviterName: string;
  expiresAt: Date;
}

interface AcceptanceForm {
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
  marketingConsent: boolean;
}

export const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<AcceptanceForm>({
    password: '',
    passwordConfirm: '',
    acceptTerms: false,
    marketingConsent: false
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    } else {
      setLoading(false);
      setErrors({ token: 'Token d\'invitation manquant' });
    }
  }, [token]);

  const validateInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/invitations/validate/${invitationToken}`);
      const data = await response.json();
      
      if (data.success) {
        setInvitation(data.data);
      } else {
        setErrors({ token: data.error });
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      setErrors({ token: 'Erreur lors de la validation de l\'invitation' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (form.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
    }

    if (form.password !== form.passwordConfirm) {
      newErrors.passwordConfirm = 'Les mots de passe ne correspondent pas';
    }

    if (!form.acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAcceptInvitation = async () => {
    if (!validateForm() || !token) return;

    try {
      setSubmitting(true);
      setErrors({});

      const response = await fetch('/api/public/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: form.password,
          acceptTerms: form.acceptTerms,
          marketingConsent: form.marketingConsent
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Rediriger vers la page de connexion après 3 secondes
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
              email: invitation?.email 
            }
          });
        }, 3000);
      } else {
        setErrors({ submit: data.error });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setErrors({ submit: 'Erreur de connexion. Veuillez réessayer.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette invitation ?') || !token) return;

    try {
      const response = await fetch('/api/public/invitations/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          reason: 'Declined by user'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Invitation refusée avec succès');
        navigate('/');
      } else {
        alert('Erreur lors du refus de l\'invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Erreur de connexion');
    }
  };

  const updateForm = (field: keyof AcceptanceForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Supprimer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();

  if (loading) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
        <div className=\"flex items-center gap-2\">
          <Loader2 className=\"w-6 h-6 animate-spin\" />
          <span>Validation de l'invitation...</span>
        </div>
      </div>
    );
  }

  if (errors.token || !invitation) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
        <div className=\"max-w-md w-full\">
          <Card>
            <CardHeader className=\"text-center\">
              <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4\">
                <XCircle className=\"w-8 h-8 text-red-600\" />
              </div>
              <CardTitle className=\"text-red-600\">Invitation invalide</CardTitle>
              <CardDescription>
                Cette invitation n'est pas valide ou a expiré.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className=\"h-4 w-4\" />
                <AlertDescription>
                  {errors.token}
                </AlertDescription>
              </Alert>
              
              <div className=\"mt-4 text-center\">
                <Button onClick={() => navigate('/')}>
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
        <div className=\"max-w-md w-full\">
          <Card>
            <CardHeader className=\"text-center\">
              <div className=\"w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4\">
                <AlertTriangle className=\"w-8 h-8 text-yellow-600\" />
              </div>
              <CardTitle className=\"text-yellow-600\">Invitation expirée</CardTitle>
              <CardDescription>
                Cette invitation a expiré le {new Date(invitation.expiresAt).toLocaleDateString('fr-FR')}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"text-center space-y-4\">
                <p className=\"text-gray-600\">
                  Contactez {invitation.inviterName} pour recevoir une nouvelle invitation.
                </p>
                
                <Button onClick={() => navigate('/')}>
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
        <div className=\"max-w-md w-full\">
          <Card>
            <CardHeader className=\"text-center\">
              <div className=\"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\">
                <CheckCircle className=\"w-8 h-8 text-green-600\" />
              </div>
              <CardTitle className=\"text-green-600\">Bienvenue !</CardTitle>
              <CardDescription>
                Votre compte a été créé avec succès.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"text-center space-y-4\">
                <div className=\"bg-green-50 p-4 rounded-lg\">
                  <p className=\"text-sm\">
                    Vous allez être redirigé vers la page de connexion dans quelques secondes...
                  </p>
                </div>
                
                <Button onClick={() => navigate('/login')}>
                  Se connecter maintenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-50 flex items-center justify-center p-4\">
      <div className=\"max-w-md w-full\">
        <Card>
          <CardHeader className=\"text-center\">
            <div className=\"w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4\">
              <UserCheck className=\"w-8 h-8 text-blue-600\" />
            </div>
            <CardTitle>Rejoindre l'organisation</CardTitle>
            <CardDescription>
              Vous avez été invité à rejoindre une organisation
            </CardDescription>
          </CardHeader>

          <CardContent className=\"space-y-6\">
            {/* Détails de l'invitation */}
            <div className=\"bg-gray-50 p-4 rounded-lg space-y-3\">
              <div className=\"flex items-center gap-2\">
                <Building2 className=\"w-4 h-4 text-gray-600\" />
                <span className=\"font-medium\">{invitation.organizationName}</span>
              </div>
              
              <div className=\"flex items-center gap-2\">
                <User className=\"w-4 h-4 text-gray-600\" />
                <span>Invité par {invitation.inviterName}</span>
              </div>
              
              <div className=\"flex items-center gap-2\">
                <Mail className=\"w-4 h-4 text-gray-600\" />
                <span>{invitation.email}</span>
              </div>
              
              <div className=\"text-sm text-gray-600\">
                Rôle: <span className=\"font-medium\">{invitation.role}</span>
              </div>
              
              <div className=\"text-sm text-gray-600\">
                Expire le: <span className=\"font-medium\">
                  {new Date(invitation.expiresAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Formulaire de création de compte */}
            <div className=\"space-y-4\">
              <div>
                <h3 className=\"font-medium mb-3\">Créer votre compte</h3>
                
                <div className=\"space-y-4\">
                  <div>
                    <Label htmlFor=\"password\">Mot de passe *</Label>
                    <div className=\"relative\">
                      <Input
                        id=\"password\"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => updateForm('password', e.target.value)}
                        placeholder=\"Minimum 8 caractères\"
                        className={errors.password ? 'border-red-500' : ''}
                      />
                      <button
                        type=\"button\"
                        onClick={() => setShowPassword(!showPassword)}
                        className=\"absolute right-3 top-3 text-gray-400 hover:text-gray-600\"
                      >
                        {showPassword ? <EyeOff className=\"h-4 w-4\" /> : <Eye className=\"h-4 w-4\" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.password}</p>
                    )}
                    <p className=\"text-gray-500 text-sm mt-1\">
                      Le mot de passe doit contenir au moins 8 caractères avec une majuscule, une minuscule et un chiffre.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor=\"passwordConfirm\">Confirmer le mot de passe *</Label>
                    <Input
                      id=\"passwordConfirm\"
                      type=\"password\"
                      value={form.passwordConfirm}
                      onChange={(e) => updateForm('passwordConfirm', e.target.value)}
                      placeholder=\"Confirmez votre mot de passe\"
                      className={errors.passwordConfirm ? 'border-red-500' : ''}
                    />
                    {errors.passwordConfirm && (
                      <p className=\"text-red-500 text-sm mt-1\">{errors.passwordConfirm}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Consentements */}
              <div className=\"space-y-3\">
                <div className=\"flex items-start space-x-2\">
                  <Checkbox
                    id=\"acceptTerms\"
                    checked={form.acceptTerms}
                    onCheckedChange={(checked) => updateForm('acceptTerms', checked)}
                  />
                  <Label htmlFor=\"acceptTerms\" className=\"text-sm\">
                    J'accepte les <a href=\"/terms\" className=\"text-blue-600 hover:underline\" target=\"_blank\">conditions d'utilisation</a> et la <a href=\"/privacy\" className=\"text-blue-600 hover:underline\" target=\"_blank\">politique de confidentialité</a> *
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className=\"text-red-500 text-sm\">{errors.acceptTerms}</p>
                )}
                
                <div className=\"flex items-start space-x-2\">
                  <Checkbox
                    id=\"marketingConsent\"
                    checked={form.marketingConsent}
                    onCheckedChange={(checked) => updateForm('marketingConsent', checked)}
                  />
                  <Label htmlFor=\"marketingConsent\" className=\"text-sm\">
                    Je souhaite recevoir des informations sur les nouveautés et offres spéciales
                  </Label>
                </div>
              </div>

              {/* Erreurs */}
              {errors.submit && (
                <Alert>
                  <AlertTriangle className=\"h-4 w-4\" />
                  <AlertDescription>{errors.submit}</AlertDescription>
                </Alert>
              )}

              {/* Boutons d'action */}
              <div className=\"space-y-3\">
                <Button 
                  onClick={handleAcceptInvitation}
                  disabled={submitting || !form.acceptTerms}
                  className=\"w-full\"
                >
                  {submitting ? (
                    <>
                      <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                      Création du compte...
                    </>
                  ) : (
                    <>
                      <UserCheck className=\"w-4 h-4 mr-2\" />
                      Accepter l'invitation
                    </>
                  )}
                </Button>
                
                <Button 
                  variant=\"outline\"
                  onClick={handleDeclineInvitation}
                  disabled={submitting}
                  className=\"w-full\"
                >
                  Refuser l'invitation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations de contact */}
        <div className=\"mt-6 text-center\">
          <p className=\"text-sm text-gray-600\">
            Besoin d'aide ? {' '}
            <a 
              href=\"mailto:support@attendance-x.com\" 
              className=\"text-blue-600 hover:underline\"
            >
              Contactez notre support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;