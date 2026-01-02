/**
 * Services Index - Export centralisé de tous les services
 * Organisé par domaines fonctionnels
 */

// 🔐 Authentication & Security Services
export * from './auth';
export * from './permissions';

// 👥 User Management Services
export * from './user';

// 🏢 Organization & Tenant Services
export * from './tenant';

// 📅 Event Management Services
export * from './event';

// 📋 Appointment Services
export * from './appointment';

// ✅ Attendance & Presence Services
export * from './attendance';
export * from './presence';

// 🔔 Notification & Communication Services
export { notificationService } from './notification';
export * from './campaigns';

// 🔗 Integration Services
export * from './integrations';

// 📊 Analytics & Reporting Services
// export * from './analytics'; // Temporarily disabled
// export * from './reports'; // Temporarily disabled

// 🎨 Branding & Customization Services
export * from './branding';
export * from './customization';

// 💰 Billing & Subscription Services
export * from './billing';
export * from './subscription';

// 🛠️ System & Infrastructure Services
export * from './system';
export * from './onboarding';
export * from './domain';

// 🏭 HR & Employee Services
export * from './hr';

// ⏰ Timesheet & Time Tracking Services
export * from './timesheet';

// 🌐 External & Third-party Services
export * from './external';

// 🔧 Utility & Base Services
export * from './base';
export * from './utility';
