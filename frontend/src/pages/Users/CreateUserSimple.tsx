// src/pages/Users/CreateUserSimple.tsx - Version simplifiée avec UserForm
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { UserForm, type UserFormData } from '@/components/forms/UserForm';
import { userService } from '@/services';
import type { CreateUserRequest } from '@attendance-x/shared';
import { toast } from 'react-toastify';

const CreateUser = () => {
  const navigate = useNavigate();
  const { canManageUsers } = usePermissions();
  
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
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux utilisateurs
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Créer un utilisateur</h1>
            <p className="text-muted-foreground mt-1">
              Ajouter un nouvel utilisateur au système
            </p>
          </div>
        </div>
      </div>

      <UserForm
        formData={formData}
        errors={errors}
        loading={loading}
        isEdit={false}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/users')}
        showPasswordSection={true}
      />
    </div>
  );
};

export default CreateUser;