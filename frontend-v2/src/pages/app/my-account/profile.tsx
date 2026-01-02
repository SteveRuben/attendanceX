import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Upload,
  Save,
  Shield,
  Building2
} from 'lucide-react';

export default function ProfilePage() {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    location: '',
    bio: '',
    avatar: ''
  });

  const [userInfo] = useState({
    role: '',
    organization: '',
    joinDate: '',
    lastLogin: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    // Logique de sauvegarde du profil
    console.log('Saving profile:', profileData);
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
                {getRoleBadge(userInfo.role || 'user')}
                <Badge variant="outline">
                  <Building2 className="h-3 w-3 mr-1" />
                  {userInfo.organization || 'Organisation non définie'}
                </Badge>
              </div>
            </div>
          </div>

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
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-lg font-semibold text-blue-600">
                  {profileData.firstName && profileData.lastName ? 
                    `${profileData.firstName[0]}${profileData.lastName[0]}` : 
                    'U'
                  }
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {profileData.firstName || profileData.lastName ? 
                      `${profileData.firstName} ${profileData.lastName}`.trim() : 
                      'Nom non défini'
                    }
                  </h3>
                  <p className="text-muted-foreground">{profileData.jobTitle || 'Poste non défini'}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {userInfo.joinDate ? `Membre depuis ${userInfo.joinDate}` : 'Date d\'inscription non disponible'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {userInfo.lastLogin ? `Dernière connexion ${userInfo.lastLogin}` : 'Dernière connexion inconnue'}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Changer la photo
                </Button>
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
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input 
                    id="lastName" 
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
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
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localisation</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    value={profileData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
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
                    value={profileData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Département</Label>
                  <Input 
                    id="department" 
                    value={profileData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biographie</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] p-3 border border-neutral-300 dark:border-neutral-700 rounded-md resize-none"
                  placeholder="Décrivez votre expérience et vos responsabilités..."
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Annuler les modifications
            </Button>
            <Button onClick={handleSaveProfile}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder le profil
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}