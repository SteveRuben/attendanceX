// src/components/forms/UserForm.tsx - Composant réutilisable pour les formulaires utilisateur
import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Mail, 
  Phone, 
  Building, 
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import type { User, UserRole, UserStatus } from '@attendance-x/shared';

export interface UserFormData {
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
  sendInvitation?: boolean;
  password?: string;
  confirmPassword?: string;
  newPassword?: string;
}

interface UserFormProps {
  formData: UserFormData;
  errors: Record<string, string>;
  loading?: boolean;
  isEdit?: boolean;
  user?: User;
  onInputChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  showPasswordSection?: boolean;
  changePassword?: boolean;
  onChangePasswordToggle?: (value: boolean) => void;
}

export const UserForm = ({
  formData,
  errors,
  loading = false,
  isEdit = false,
  user,
  onInputChange,
  onSubmit,
  onCancel,
  showPasswordSection = true,
  changePassword = false,
  onChangePasswordToggle
}: UserFormProps) => {
  const { user: currentUser } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

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
    
    const password = isEdit ? (formData.newPassword || '') : (formData.password || '');
    setPasswordStrength(calculateStrength(password));
  }, [formData.password, formData.newPassword, isEdit]);

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

    //if (isAdmin) {"This will always be true!"
    if(isAdmin()){
      baseRoles.push({ value: 'admin', label: 'Admin' });
    }

    //if (isSuperAdmin) { same here
    if(isSuperAdmin()){
      baseRoles.push({ value: 'super_admin', label: 'Super Admin' });
    }

    return baseRoles;
  };

  const canModifyRole = () => {
    if (!isEdit || !user) return true;
    return !(user.id === currentUser?.id && (user.role === 'admin' || user.role === 'super_admin'));
  };

  const canModifyStatus = () => {
    if (!isEdit || !user) return true;
    return user.id !== currentUser?.id;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
                    onChange={(e) => onInputChange('firstName', e.target.value)}
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
                    onChange={(e) => onInputChange('lastName', e.target.value)}
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
                  onChange={(e) => onInputChange('displayName', e.target.value)}
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
                    onChange={(e) => onInputChange('email', e.target.value)}
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
                      onChange={(e) => onInputChange('phone', e.target.value)}
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
                      onChange={(e) => onInputChange('department', e.target.value)}
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
                      onValueChange={(value) => onInputChange('role', value)}
                      disabled={!canModifyRole()}
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
                  {!canModifyRole() && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vous ne pouvez pas modifier votre propre rôle
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">Statut *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => onInputChange('status', value as UserStatus)}
                    disabled={!canModifyStatus()}
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
                  {!canModifyStatus() && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vous ne pouvez pas modifier votre propre statut
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {!isEdit && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendInvitation"
                      checked={formData.sendInvitation || false}
                      onCheckedChange={(checked) => onInputChange('sendInvitation', checked)}
                    />
                    <Label htmlFor="sendInvitation">Envoyer une invitation par email</Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailVerified"
                    checked={formData.emailVerified}
                    onCheckedChange={(checked) => onInputChange('emailVerified', checked)}
                  />
                  <Label htmlFor="emailVerified">Email vérifié</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mustChangePassword"
                    checked={formData.mustChangePassword}
                    onCheckedChange={(checked) => onInputChange('mustChangePassword', checked)}
                    disabled={!isEdit && formData.sendInvitation}
                  />
                  <Label htmlFor="mustChangePassword">Doit changer le mot de passe à la connexion</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="twoFactorEnabled"
                    checked={formData.twoFactorEnabled}
                    onCheckedChange={(checked) => onInputChange('twoFactorEnabled', checked)}
                  />
                  <Label htmlFor="twoFactorEnabled">Authentification à deux facteurs</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          {showPasswordSection && (
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEdit && onChangePasswordToggle && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="changePassword"
                      checked={changePassword}
                      onCheckedChange={onChangePasswordToggle}
                    />
                    <Label htmlFor="changePassword">Changer le mot de passe</Label>
                  </div>
                )}

                {(!isEdit && !formData.sendInvitation) || (isEdit && changePassword) ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={isEdit ? "newPassword" : "password"}>
                        {isEdit ? "Nouveau mot de passe" : "Mot de passe"} *
                      </Label>
                      <div className="relative">
                        <Input
                          id={isEdit ? "newPassword" : "password"}
                          type={showPassword ? 'text' : 'password'}
                          value={isEdit ? (formData.newPassword || '') : (formData.password || '')}
                          onChange={(e) => onInputChange(isEdit ? 'newPassword' : 'password', e.target.value)}
                          placeholder={isEdit ? "Entrez un nouveau mot de passe" : "Entrez un mot de passe sécurisé"}
                          className={`pr-10 ${errors[isEdit ? 'newPassword' : 'password'] ? 'border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 pointer-events-auto"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors[isEdit ? 'newPassword' : 'password'] && (
                        <p className="text-sm text-red-600 mt-1">{errors[isEdit ? 'newPassword' : 'password']}</p>
                      )}

                      {((isEdit && formData.newPassword) || (!isEdit && formData.password)) && (
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
                          onChange={(e) => onInputChange('confirmPassword', e.target.value)}
                          placeholder="Confirmez le mot de passe"
                          className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 pointer-events-auto"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                ) : null}
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
                  {loading ? (isEdit ? 'Sauvegarde...' : 'Création...') : (isEdit ? 'Sauvegarder' : 'Créer l\'utilisateur')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={onCancel}
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
              {!isEdit && (
                <div>
                  <h4 className="font-medium mb-1">Invitation par email</h4>
                  <p className="text-sm text-muted-foreground">
                    Si activé, un email d'invitation sera envoyé à l'utilisateur avec un lien pour définir son mot de passe.
                  </p>
                </div>
              )}

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
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
};

export default UserForm;