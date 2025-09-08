// src/pages/Users/EditUserSimple.tsx - Version simplifiée avec UserForm
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle, RefreshCw, UserX } from 'lucide-react';
import { UserForm, type UserFormData } from '@/components/forms/UserForm';
import { userService } from '@/services';
import type { User, UpdateUserRequest, UserStatus } from '../../shared';
import { toast } from 'react-toastify';

const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { canManageUsers, canEditUser } = usePermissions();
  
  const [user, setUser] = useState<User | null>(null);
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
  }

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <UserForm
            formData={formData}
            errors={errors}
            loading={saving}
            isEdit={true}
            user={user}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/users/${user.id}`)}
            showPasswordSection={true}
            changePassword={changePassword}
            onChangePasswordToggle={setChangePassword}
          />
        </div>

        {/* Additional Sidebar */}
        <div className="space-y-6">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditUser;