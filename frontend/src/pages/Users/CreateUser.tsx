// src/pages/Users/CreateUser.tsx - Formulaire de création d'utilisateur
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield,
  Save,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import { userService } from '@/services';
import type { CreateUserRequest, UserRole, UserStatus } from '@attendance-x/shared';
import { toast } from 'react-toastify';

interface UserFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  password: string;
  confirmPassword: string;
  sendInvitation: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

const CreateUser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageUsers, isAdmin, isSuperAdmin } = usePermissions();
  
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    department: '',
    role: 'participant',
    status: 'active',
    password: '',
    confirmPassword: '',
    sendInvitation: true,
    emailVerified: false,
    mustChangePassword: true,
    twoFactorEnabled: false
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (!canManageUsers) {
      navigate('/users');
      return;
    }
    
    // Auto-generate display name
    if (formData.firstName && formData.lastName) {
      setFormData(prev => ({
        ...prev,
        displayName: `${formData.firstName} ${formData.lastName}`
      }));
    }
  }, [canManageUsers, formData.firstName, formData.lastName]);

  // Password strength calculation
  useEffect(() => {
    const calculateStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength += 1;
      if (password.length >= 12) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;
      return strength;
    };
    
    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.sendInvitation) {
      if (!formData.password) {
        newErrors.password = 'Le mot de passe est requis';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    // Role validation based on current user permissions
    if (formData.role === 'super_admin' && !isSuperAdmin) {
      newErrors.role = 'Vous ne pouvez pas créer un Super Admin';
    }

    if ((formData.role === 'admin' || formData.role === 'super_admin') && !isAdmin) {
      newErrors.role = 'Vous ne pouvez pas créer un Admin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);

    try {
      const userData: CreateUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.displayName || `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        role: formData.role,
        status: formData.status,
        emailVerified: formData.emailVerified,
        mustChangePassword: formData.mustChangePassword,
        twoFactorEnabled: formData.twoFactorEnabled
      };

      // Add password only if not sending invitation
      if (!formData.sendInvitation) {
        userData.password = formData.password;
      }

      const response = await userService.createUser(userData);
      
      if (response.success && response.data) {
        if (formData.sendInvitation) {
          toast.success('Utilisateur créé et invitation envoyée !');
        } else {
          toast.success('Utilisateur créé avec succès !');
        }
        navigate(`/users/${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message.includes('Email already exists')) {
        setErrors({ email: 'Un utilisateur avec cet email existe déjà' });
      } else {
        toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 3) return 'Moyen';
    if (passwordStrength <= 4) return 'Bon';
    return 'Excellent';
  };

  const getRoleOptions = () => {
    const baseRoles = [
      { value: 'participant', label: 'Participant' },
      { value: 'analyst', label: 'Analyste' },
      { value: 'moderator', label: 'Modérateur' },
      { value: 'organizer', label: 'Organisateur' }
    ];

    if (isAdmin) {
      baseRoles.push({ value: 'admin', label: 'Admin' });
    }

    if (isSuperAdmin) {
      baseRoles.push({ value: 'super_admin', label: 'Super Admin' });
    }

    return baseRoles;
  };

  if (!canManageUsers) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions pour créer des utilisateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/users')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <UserPlus className="w-6 h-6" />
              <span>Créer un utilisateur</span>
            </h1>
            <p className="text-muted-foreground">
              Ajoutez un nouvel utilisateur au système
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Jean"
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Dupont"
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="displayName">Nom d'affichage</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    placeholder="Jean Dupont"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Laissez vide pour utiliser prénom + nom
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="auth-input-container">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="jean.dupont@example.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <div className="auth-input-container">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="department">Département</Label>
                    <div className="auth-input-container">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="Marketing"
                        className="pl-10"
                        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Paramètres du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Rôle *</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Select 
                        value={formData.role} 
                        onValueChange={(value) => handleInputChange('role', value)}
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getRoleOptions().map(role => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.role && (
                      <p className="text-sm text-red-600 mt-1">{errors.role}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="status">Statut *</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange('status', value as UserStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendInvitation"
                      checked={formData.sendInvitation}
                      onCheckedChange={(checked) => handleInputChange('sendInvitation', checked)}
                    />
                    <Label htmlFor="sendInvitation">Envoyer une invitation par email</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="emailVerified"
                      checked={formData.emailVerified}
                      onCheckedChange={(checked) => handleInputChange('emailVerified', checked)}
                    />
                    <Label htmlFor="emailVerified">Email vérifié</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mustChangePassword"
                      checked={formData.mustChangePassword}
                      onCheckedChange={(checked) => handleInputChange('mustChangePassword', checked)}
                      disabled={formData.sendInvitation}
                    />
                    <Label htmlFor="mustChangePassword">Doit changer le mot de passe à la connexion</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="twoFactorEnabled"
                      checked={formData.twoFactorEnabled}
                      onCheckedChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
                    />
                    <Label htmlFor="twoFactorEnabled">Authentification à deux facteurs</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Password Section */}
            {!formData.sendInvitation && (
              <Card>
                <CardHeader>
                  <CardTitle>Mot de passe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="password">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Entrez un mot de passe sécurisé"
                        className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">{errors.password}</p>
                    )}

                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                              style={{ width: `${(passwordStrength / 6) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{getPasswordStrengthText()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirmez le mot de passe"
                        className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Création...' : 'Créer l\'utilisateur'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/users')}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Invitation par email</h4>
                  <p className="text-sm text-muted-foreground">
                    Si activé, un email d'invitation sera envoyé à l'utilisateur avec un lien pour définir son mot de passe.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Rôles</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><span className="font-medium">Participant</span> : Peut assister aux événements</li>
                    <li><span className="font-medium">Analyste</span> : Peut voir les rapports et statistiques</li>
                    <li><span className="font-medium">Modérateur</span> : Peut gérer les présences</li>
                    <li><span className="font-medium">Organisateur</span> : Peut créer et gérer des événements</li>
                    <li><span className="font-medium">Admin</span> : Accès complet au système</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Sécurité</h4>
                  <p className="text-sm text-muted-foreground">
                    Les mots de passe doivent contenir au moins 8 caractères avec une combinaison de lettres, chiffres et caractères spéciaux.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateUser;