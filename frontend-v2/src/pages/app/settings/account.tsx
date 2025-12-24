import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Shield, 
  Key, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  Loader2,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface AccountFormData {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  phone: string;
  twoFactorEnabled: boolean;
}

export default function AccountSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<AccountFormData>({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    phone: '',
    twoFactorEnabled: false
  });

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (!formData.email || !formData.currentPassword) {
      setError('Email and current password are required');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Implement email update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess('Email updated successfully');
      setFormData(prev => ({ ...prev, currentPassword: '' }));
    } catch (error: any) {
      setError(error?.message || 'Error updating email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Implement password update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess('Password updated successfully');
      setFormData(prev => ({ 
        ...prev, 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      }));
    } catch (error: any) {
      setError(error?.message || 'Error updating password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    setLoading(true);
    
    try {
      // TODO: Implement phone update API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess('Phone number updated successfully');
    } catch (error: any) {
      setError(error?.message || 'Error updating phone number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Account Settings">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-3xl mx-auto pb-20">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <User className="h-6 w-6" /> Account Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account security and contact information
              </p>
            </div>

            {/* Success/Error Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={clearMessages}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
                <AlertDescription className="flex items-center justify-between">
                  <span>{success}</span>
                  <Button variant="ghost" size="sm" onClick={clearMessages}>
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Address
                </CardTitle>
                <CardDescription>
                  Update your email address. You'll need to verify the new email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">New Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter new email address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="current-password-email">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password-email"
                        type={showCurrentPassword ? "text" : "password"}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Email
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Password
                </CardTitle>
                <CardDescription>
                  Change your password to keep your account secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Phone Number */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Phone Number
                </CardTitle>
                <CardDescription>
                  Update your phone number for account recovery and notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePhoneUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Phone
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Additional security options for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {formData.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Active Sessions</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage devices that are signed in to your account
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Sessions
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Account Activity</h3>
                    <p className="text-sm text-muted-foreground">
                      Review recent activity on your account
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </AppShell>
  );
}