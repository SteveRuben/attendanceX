// src/pages/Users/EditUser.tsx - Formulaire d'édition d'utilisateur
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield,
  Save,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  UserX,
  RefreshCw
} from 'lucide-react';
import { userService } from '@/services';
import type { User as UserType, UpdateUserRequest, UserRole, UserStatus } from '../../shared';
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
  emailVerified: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  newPassword?: string;
  confirmPassword?: string;
}

const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { canManageUsers, isAdmin, isSuperAdmin, canEditUser } = usePermissions();
  
  const [user, setUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    department: '',
    role: 'participant',
    status: 'active',
    emailVerified: false,
    mustChangePassword: false,
    twoFactorEnabled: false,
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    if (!canManageUsers || !id) {
      navigate('/users');
      return;
    }
    
    loadUser();
  }, [canManageUsers, id]);

  useEffect(() => {
    // Auto-generate display name
    if (formData.firstName && formData.lastName && !user?.displayName) {
      setFormData(prev => ({
        ...prev,
        displayName: `${formData.firstName} ${formData.lastName}`
      }));
    }
  }, [formData.firstName, formData.lastName, user?.displayName]);

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
    
    setPasswordStrength(calculateStrength(formData.newPassword || ''));
  }, [formData.newPassword]);

  const loadUser = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await userService.getUserById(id);
      
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        
        // Check if current user can edit this user
        if (!canEditUser(userData)) {
          navigate('/users');
          return;
        }
        
        setFormData({
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          email: userData.email,
          phone: userData.phone || '',
          department: userData.department || '',
          role: userData.role,
          status: userData.status,
          emailVerified: userData.emailVerified,
          mustChangePassword: userData.mustChangePassword,
          twoFactorEnabled: userData.twoFactorEnabled,
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      toast.error('Erreur lors du chargement de l\'utilisateur');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

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

    if (changePassword) {
      if (!formData.newPassword) {
        newErrors.newPassword = 'Le nouveau mot de passe est requis';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    // Role validation based on current user permissions
    if (formData.role === 'super_admin' && !isSuperAdmin) {
      newErrors.role = 'Vous ne pouvez pas assigner le rôle Super Admin';
    }

    if ((formData.role === 'admin' || formData.role === 'super_admin') && !isAdmin) {
      newErrors.role = 'Vous ne pouvez pas assigner le rôle Admin';
    }

    // Prevent self-demotion
    if (user?.id === currentUser?.id && formData.role !== user.role) {
      if (user.role === 'super_admin' || user.role === 'admin') {
        newErrors.role = 'Vous ne pouvez pas modifier votre propre rôle';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setSaving(true);

    try {
      const updateData: UpdateUserRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        role: formData.role,
        status: formData.status,
        emailVerified: formData.emailVerified,
        mustChangePassword: formData.mustChangePassword,
        twoFactorEnabled: formData.twoFactorEnabled
      };

      // Add password only if changing
      if (changePassword && formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const response = await userService.updateUser(user.id, updateData);
      
      if (response.success) {
        toast.success('Utilisateur mis à jour avec succès !');
        navigate(`/users/${user.id}`);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.message.includes('Email already exists')) {
        setErrors({ email: 'Un utilisateur avec cet email existe déjà' });
      } else {
        toast.error(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
      }
    } finally {
      setSaving(false);
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

  const handleResetPassword = async () => {
    if (!user) return;
    
    try {
      await userService.resetPassword(user.id);
      toast.success('Email de réinitialisation envoyé !');
    } catch (error: any) {
      toast.error('Erreur lors de l\'envoi de l\'email de réinitialisation');
    }
  };

  const handleDeactivateUser = async () => {
    if (!user) return;
    
    if (user.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    
    if (window.confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) {
      try {
        await userService.updateUser(user.id, { status: 'inactive' });
        setFormData(prev => ({ ...prev, status: 'inactive' }));
        toast.success('Utilisateur désactivé');
      } catch (error: any) {
        toast.error('Erreur lors de la désactivation');
      }
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
            Vous n'avez pas les permissions pour modifier des utilisateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-32" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-10 w-full mb-3" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Utilisateur non trouvé.
          </AlertDescription>
        </Alert>
      </div>
    );
  }  return (

    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux utilisateurs
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Modifier {user.displayName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Mettre à jour les informations de l'utilisateur
            </p>
          </div>
        </div>
      </div>

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
                    <div className="auth-input-container">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <Select 
                        value={formData.role} 
                        onValueChange={(value) => handleInputChange('role', value)}
                        disabled={user.id === currentUser?.id && (user.role === 'admin' || user.role === 'super_admin')}
                      >
                        <SelectTrigger className="pl-10" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
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
                    {user.id === currentUser?.id && (user.role === 'admin' || user.role === 'super_admin') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vous ne pouvez pas modifier votre propre rôle
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="status">Statut *</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange('status', value as UserStatus)}
                      disabled={user.id === currentUser?.id}
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
                    {user.id === currentUser?.id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vous ne pouvez pas modifier votre propre statut
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
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
                    />
                    <Label htmlFor="mustChangePassword">Doit changer le mot de passe à la connexion</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="twoFactorEnabled"
                      checked={formData.twoFactorEnabled}
                      onCheckedChange={(checked) => handleInputChange('twoFactorEnabled', checked)}
                    />
                    <Label htmlFor="twoFactorEnabled">Authentification à deux facteurs activée</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="changePassword"
                    checked={changePassword}
                    onCheckedChange={setChangePassword}
                  />
                  <Label htmlFor="changePassword">Changer le mot de passe</Label>
                </div>

                {changePassword && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.newPassword || ''}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          placeholder="Entrez un nouveau mot de passe"
                          className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                      )}

                      {formData.newPassword && (
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
                          value={formData.confirmPassword || ''}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirmez le nouveau mot de passe"
                          className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/users/${user.id}`)}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleResetPassword}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser le mot de passe
                </Button>
                
                {user.id !== currentUser?.id && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 hover:text-red-700"
                    onClick={handleDeactivateUser}
                    disabled={formData.status === 'inactive'}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {formData.status === 'inactive' ? 'Utilisateur désactivé' : 'Désactiver l\'utilisateur'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Créé le</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Dernière connexion</h4>
                  <p className="text-sm text-muted-foreground">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Jamais connecté'
                    }
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Rôles</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><span className="font-medium">Participant</span> : Peut assister aux événements</li>
                    <li><span className="font-medium">Analyste</span> : Peut voir les rapports</li>
                    <li><span className="font-medium">Modérateur</span> : Peut gérer les présences</li>
                    <li><span className="font-medium">Organisateur</span> : Peut créer des événements</li>
                    <li><span className="font-medium">Admin</span> : Accès complet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditUser;