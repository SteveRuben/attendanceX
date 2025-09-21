import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Building, ArrowRight, AlertCircle, Shield, Loader2, RefreshCw } from 'lucide-react';
import { useOrganizationSectors, useOrganizationSizes } from '../../../hooks/useOrganizationMetadata';
import type { OnboardingData } from '../OnboardingFlow';

interface OrganizationSetupProps {
  data: OnboardingData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  isLoading: boolean;
}



export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({
  data,
  errors,
  onUpdate,
  onNext,
  isLoading
}) => {
  const {
    sectors,
    templates,
    loading: sectorsLoading,
    error: sectorsError,
    refetch: refetchSectors
  } = useOrganizationSectors();

  const {
    data: organizationSizes,
    loading: sizesLoading,
    error: sizesError,
    refetch: refetchSizes
  } = useOrganizationSizes();

  const metadataLoading = sectorsLoading || sizesLoading;
  const metadataError = sectorsError || sizesError;
  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    const updates: Partial<OnboardingData> = { [field]: value };

    // Auto-generate slug from organization name
    if (field === 'organizationName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      updates.organizationSlug = slug;
    }

    onUpdate(updates);
  };

  const validateAndNext = () => {
    if (!data.organizationName.trim() || !data.industry || !data.size) {
      return;
    }
    onNext();
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create your organization</h1>
          <p className="text-gray-600 mt-2">Let's start by setting up your organization</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <div className="w-16 h-1 bg-gray-200"></div>
            <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <div className="w-16 h-1 bg-gray-200"></div>
            <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">Step 1 of 3</div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-center text-gray-900">Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {metadataError && (
              <Alert className="mb-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Failed to load form options: {metadataError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchSectors();
                      refetchSizes();
                    }}
                    className="ml-4"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700 mb-2 block">
                  Organization Name *
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
                  <Input
                    id="organizationName"
                    type="text"
                    value={data.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    placeholder="Your Company Name"
                    className={`pl-10 w-full ${errors.organizationName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="organizationSlug" className="text-sm font-medium text-gray-700 mb-2 block">
                  Organization URL
                </Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    attendancex.com/
                  </span>
                  <Input
                    id="organizationSlug"
                    type="text"
                    value={data.organizationSlug}
                    onChange={(e) => handleInputChange('organizationSlug', e.target.value)}
                    placeholder="your-company"
                    className={`rounded-l-none ${errors.organizationSlug ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.organizationSlug && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationSlug}</p>
                )}
              </div>

              <div>
                <Label htmlFor="industry" className="text-sm font-medium text-gray-700 mb-2 block">
                  Industry *
                </Label>
                <Select value={data.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                  <SelectTrigger className={errors.industry ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadataLoading ? (
                      <SelectItem value="" disabled>
                        <div className="flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          Loading industries...
                        </div>
                      </SelectItem>
                    ) : sectorsError ? (
                      <SelectItem value="" disabled>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-red-600">Failed to load</span>
                          <button
                            onClick={refetchSectors}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Retry
                          </button>
                        </div>
                      </SelectItem>
                    ) : (
                      sectors.map(sector => (
                        <SelectItem key={sector.value} value={sector.value}>
                          <div className="flex flex-col">
                            <span>{sector.label}</span>
                            {sector.description && (
                              <span className="text-xs text-gray-500">{sector.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.industry && (
                  <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                )}
              </div>

              <div>
                <Label htmlFor="size" className="text-sm font-medium text-gray-700 mb-2 block">
                  Organization Size *
                </Label>
                <Select value={data.size} onValueChange={(value) => handleInputChange('size', value)}>
                  <SelectTrigger className={errors.size ? 'border-red-300' : ''}>
                    <SelectValue placeholder="Select organization size" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadataLoading ? (
                      <SelectItem value="" disabled>
                        <div className="flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          Loading sizes...
                        </div>
                      </SelectItem>
                    ) : sizesError ? (
                      <SelectItem value="" disabled>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-red-600">Failed to load</span>
                          <button
                            onClick={refetchSizes}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Retry
                          </button>
                        </div>
                      </SelectItem>
                    ) : (
                      organizationSizes.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          <div className="flex flex-col">
                            <span>{size.label}</span>
                            <span className="text-xs text-gray-500">
                              {size.min_employees} - {size.max_employees === -1 ? '∞' : size.max_employees} employees
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.size && (
                  <p className="mt-1 text-sm text-red-600">{errors.size}</p>
                )}
              </div>
            </div>

            <Button
              onClick={validateAndNext}
              disabled={!data.organizationName.trim() || !data.industry || !data.size || isLoading}
              className="w-full mt-6 bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
            >
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 mr-2" />
                <span>Continue</span>
              </div>
            </Button>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};