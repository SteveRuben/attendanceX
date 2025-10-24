// Authentication components exports
export { default as Login } from './Login';
export { default as ForgotPassword } from './ForgotPassword';
export { default as ResetPassword } from './ResetPassword';
export { default as VerifyEmail } from './VerifyEmail';
export { default as VerifyEmailRequired } from './VerifyEmailRequired';

// Registration flows
export { default as SimpleRegister } from './SimpleRegister';
export { OnboardingFlow } from './OnboardingFlow';
export { InvitationAcceptance } from './InvitationAcceptance';

// Organization management
export { default as ChooseOrganization } from './ChooseOrganization';

// Route protection and redirects
export { ProtectedRoute, usePermissions, ConditionalRender } from './ProtectedRoute';
export { AuthRedirect } from './AuthRedirect';

// Utility components
export { default as RegistrationSuccess } from './RegistrationSuccess';
export { default as VerificationErrorBoundary } from './VerificationErrorBoundary';

// Step components
export { OrganizationSetup } from './steps/OrganizationSetup';
export { PlanSelection } from './steps/PlanSelection';
export { AdminAccountSetup } from './steps/AdminAccountSetup';
export { OnboardingComplete } from './steps/OnboardingComplete';

// Types
export type { OnboardingData } from './OnboardingFlow';