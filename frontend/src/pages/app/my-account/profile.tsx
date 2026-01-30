import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Upload,
  Save,
  Shield,
  Building2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfilePage() {
  const { 
    profile, 
    accountInfo, 
    loading, 
    error, 
    updating, 
    updateProfile, 
    uploadAvatar, 
    deleteAvatar 
  } = useUserProfile();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    location: '',
    bio: ''
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      const newFormData = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        jobTitle: profile.jobTitle || '',
        department: profile.department || '',
        location: profile.location || '',
        bio: profile.bio || ''
      };
      setFormData(newFormData);
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    if (!hasChanges) return;

    try {
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        department: formData.department,
        location: formData.location,
        bio: formData.bio
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleCancelChanges = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        jobTitle: profile.jobTitle || '',
        department: profile.department || '',
        location: profile.location || '',
        bio: profile.bio || ''
      });
      setHasChanges(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
      manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
    };
    
    return (
      <Badge className={variants[role as keyof typeof variants] || variants.user}>
        <Shield className="h-3 w-3 mr-1" />
        {role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <AppShell title="Mon Profil">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon Profil">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <User className="h-6 w-6" />
                  Mon Profil
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez vos informations personnelles et professionnelles
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(accountInfo?.membership?.role || 'user')}
                <Badge variant="outline">
                  <Building2 className="h-3 w-3 mr-1" />
                  {accountInfo?.organization?.name || 'Organisation non définie'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Informations du Compte */}
          <Card>
            <CardHeader>
              <CardTitle>Informations du Compte</CardTitle>
              <CardDescription>
                Détails de votre compte et statut dans l'organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="relative">
                  {profile?.avatarUrl ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt="Avatar" 
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-lg font-semibold text-blue-600">
                      {profile?.firstName && profile?.lastName ? 
                        `${profile.firstName[0]}${profile.lastName[0]}` : 
                        'U'
                      }
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {profile?.firstName || profile?.lastName ? 
                      `${profile.firstName} ${profile.lastName}`.trim() : 
                      'Nom non défini'
                    }
                  </h3>
                  <p className="text-muted-foreground">{profile?.jobTitle || 'Poste non défini'}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {accountInfo?.membership?.joinedAt ? `Membre depuis ${new Date(accountInfo.membership.joinedAt).toLocaleDateString()}` : 'Date d\'inscription non disponible'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {accountInfo?.lastLogin ? `Dernière connexion ${new Date(accountInfo.lastLogin).toLocaleString()}` : 'Dernière connexion inconnue'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" disabled={updating}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-4 w-4 mr-2" />
                    Changer la photo
                  </Button>
                  {profile?.avatarUrl && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={deleteAvatar}
                      disabled={updating}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations Personnelles */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Personnelles</CardTitle>
              <CardDescription>
                Vos informations de contact et détails personnels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  L'email ne peut pas être modifié depuis cette interface
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localisation</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={updating}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations Professionnelles */}
          <Card>
            <CardHeader>
              <CardTitle>Informations Professionnelles</CardTitle>
              <CardDescription>
                Détails de votre poste et responsabilités
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Titre du poste</Label>
                  <Input 
                    id="jobTitle" 
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    disabled={updating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Département</Label>
                  <Input 
                    id="department" 
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    disabled={updating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biographie</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] p-3 border border-neutral-300 dark:border-neutral-700 rounded-md resize-none"
                  placeholder="Décrivez votre expérience et vos responsabilités..."
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={updating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelChanges}
              disabled={!hasChanges || updating}
            >
              Annuler les modifications
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={!hasChanges || updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder le profil
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}