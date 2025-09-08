// src/hooks/use-user-form.ts - Hook pour la gestion des formulaires utilisateur
import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from './use-auth';
import { userService } from '@/services';
import { type User, type CreateUserRequest, type UpdateUserRequest, UserRole, UserStatus } from '../shared';
import { toast } from 'react-toastify';

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

interface UseUserFormOptions {
  isEdit?: boolean;
  userId?: string;
  onSuccess?: (user: User) => void;
  onError?: (error: any) => void;
}

export const useUserForm = (options: UseUserFormOptions = {}) => {
  const { isEdit = false, userId, onSuccess, onError } = options;
  const { user: currentUser } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();

  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    department: '',
    role: UserRole.PARTICIPANT,
    status: UserStatus.ACTIVE,
    emailVerified: false,
    mustChangePassword: true,
    twoFactorEnabled: false,
    sendInvitation: !isEdit,
    password: '',
    confirmPassword: '',
    newPassword: ''
  });

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Load user data for edit mode
  useEffect(() => {
    if (isEdit && userId) {
      loadUser();
    }
  }, [isEdit, userId]);

  // Auto-generate display name
  useEffect(() => {
    if (formData.firstName && formData.lastName && !formData.displayName) {
      setFormData(prev => ({
        ...prev,
        displayName: `${formData.firstName} ${formData.lastName}`
      }));
    }
  }, [formData.firstName, formData.lastName]);

  // Calculate password strength
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

  const loadUser = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await userService.getUserById(userId);
      
      if (response.success && response.data) {
        const userData = response.data;
        setUser(userData);
        
        setFormData({
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName,
          email: userData.email,
          phone: userData.phoneNumber || '',
          department: userData.departmentId || '',
          role: userData.role,
          status: userData.status,
          emailVerified: userData.emailVerified,
          mustChangePassword: userData.mustChangePassword || false,
          twoFactorEnabled: userData.twoFactorEnabled,
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      toast.error('Erreur lors du chargement de l\'utilisateur');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (changePassword = false): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
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

    // Phone validation
    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    // Password validation
    if (!isEdit && !formData.sendInvitation) {
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

    if (isEdit && changePassword) {
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

    // Role validation
    if (formData.role === 'super_admin' && !isSuperAdmin) {
      newErrors.role = 'Vous ne pouvez pas assigner le rôle Super Admin';
    }

    if ((formData.role === 'admin' || formData.role === 'super_admin') && !isAdmin) {
      newErrors.role = 'Vous ne pouvez pas assigner le rôle Admin';
    }

    // Prevent self-demotion
    if (isEdit && user?.id === currentUser?.id && user && formData.role !== user.role) {
      if (user.role === 'super_admin' || user.role === 'admin') {
        newErrors.role = 'Vous ne pouvez pas modifier votre propre rôle';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async (changePassword = false) => {
    if (!validateForm(changePassword)) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return false;
    }

    setSaving(true);

    try {
      if (isEdit && user) {
        // Update user
        const updateData: UpdateUserRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.displayName,
          email: formData.email,
          phoneNumber: formData.phone || undefined,
          departmentId: formData.department || undefined,
          role: formData.role,
          status: (formData.status as unknown as "pending" | "accepted" | "expired" | "cancelled") || "pending",
          emailVerified: formData.emailVerified,
          mustChangePassword: formData.mustChangePassword,
          twoFactorEnabled: formData.twoFactorEnabled,
        };

        if (changePassword && formData.newPassword) {
          updateData.hashedPassword = formData.newPassword;
        }

        const response = await userService.updateUser(user.id || '', updateData);
        
        if (response.success && response.data) {
          toast.success('Utilisateur mis à jour avec succès !');
          onSuccess?.(response.data);
          return true;
        }
      } else {
        // Create user
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

        if (!formData.sendInvitation && formData.password) {
          userData.password = formData.password;
        }

        const response = await userService.createUser(userData);
        
        if (response.success && response.data) {
          if (formData.sendInvitation) {
            toast.success('Utilisateur créé et invitation envoyée !');
          } else {
            toast.success('Utilisateur créé avec succès !');
          }
          onSuccess?.(response.data);
          return true;
        }
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      if (error.message.includes('Email already exists')) {
        setErrors({ email: 'Un utilisateur avec cet email existe déjà' });
      } else {
        toast.error(error.message || `Erreur lors de ${isEdit ? 'la mise à jour' : 'la création'} de l'utilisateur`);
      }
      onError?.(error);
    } finally {
      setSaving(false);
    }

    return false;
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      phone: '',
      department: '',
      role: UserRole.PARTICIPANT,
      status: UserStatus.INACTIVE,
      emailVerified: false,
      mustChangePassword: true,
      twoFactorEnabled: false,
      sendInvitation: !isEdit,
      password: '',
      confirmPassword: '',
      newPassword: ''
    });
    setErrors({});
  };

  const getRoleOptions = () => {
    const baseRoles = [
      { value: 'participant', label: 'Participant' },
      { value: 'analyst', label: 'Analyste' },
      { value: 'moderator', label: 'Modérateur' },
      { value: 'organizer', label: 'Organisateur' }
    ];

    //if (isAdmin) {
    if (isAdmin()) {
      baseRoles.push({ value: 'admin', label: 'Admin' });
    }

    if (isSuperAdmin()) {
      baseRoles.push({ value: 'super_admin', label: 'Super Admin' });
    }

    return baseRoles;
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

  return {
    // Data
    formData,
    user,
    errors,
    passwordStrength,
    
    // States
    loading,
    saving,
    
    // Actions
    updateField,
    submitForm,
    resetForm,
    validateForm,
    
    // Helpers
    getRoleOptions,
    getPasswordStrengthColor,
    getPasswordStrengthText
  };
};