// src/pages/Auth/Register.tsx - Version corrigée avec formulaires harmonisés
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, User, Mail, Lock, Building, ArrowRight } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (!acceptTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        organization: formData.organization,
        password: formData.password
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-600 mt-2">Get started with AttendanceX in seconds</p>
        </div>

        {/* Register Form */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Sign up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="form-label">
                      First name
                    </Label>
                    <div className="form-input-container">
                      <User className="form-input-icon" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="form-input-with-icon"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="form-label">
                      Last name
                    </Label>
                    <div className="form-input-container">
                      <User className="form-input-icon" />
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="form-input-with-icon"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="form-label">
                    Email address
                  </Label>
                  <div className="form-input-container">
                    <Mail className="form-input-icon" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input-with-icon"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div>
                  <Label htmlFor="organization" className="form-label">
                    Organization
                  </Label>
                  <div className="form-input-container">
                    <Building className="form-input-icon" />
                    <Input
                      id="organization"
                      name="organization"
                      type="text"
                      required
                      value={formData.organization}
                      onChange={handleChange}
                      className="form-input-with-icon"
                      placeholder="Your Company"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="form-label">
                    Password
                  </Label>
                  <div className="form-input-container">
                    <Lock className="form-input-icon" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="form-input-with-icon"
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword" className="form-label">
                    Confirm password
                  </Label>
                  <div className="form-input-container">
                    <Lock className="form-input-icon" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-input-with-icon"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>

              {/* Terms acceptance */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="accept-terms"
                  checked={acceptTerms}
                  onCheckedChange={setAcceptTerms}
                  className="mt-1"
                />
                <Label 
                  htmlFor="accept-terms" 
                  className="text-sm text-gray-600 cursor-pointer leading-5"
                >
                  I agree to the{' '}
                  <Link to="/terms" className="text-gray-900 hover:underline font-medium">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-gray-900 hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;