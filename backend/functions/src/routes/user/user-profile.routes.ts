/**
 * User Profile Routes
 * 
 * Handles all user-related endpoints including:
 * - Profile management (get, update, avatar)
 * - User preferences (get, update, reset)
 * - Notification settings and management
 * - Account operations (password change, deletion)
 * 
 * All routes require authentication and tenant context.
 */

import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { injectTenantContext } from "../../middleware/tenant-context.middleware";
import { validateBody } from "../../middleware/validation";
import { smartRateLimit } from "../../middleware/smartRateLimit";
import { UserProfileController } from "../../controllers/user/user-profile.controller";
import { UserPreferencesController } from "../../controllers/user/user-preferences.controller";
import { UserNotificationsController } from "../../controllers/user/user-notifications.controller";
import { z } from "zod";
import multer from "multer";
import cors from "cors";

const router = Router();

// Simple CORS middleware for user preferences endpoints
const simpleCorsMiddleware = cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://attendance-app.web.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control"
  ]
});


// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb): void => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// Middleware chain
router.use(simpleCorsMiddleware); // Add explicit CORS first
router.use(smartRateLimit);
router.use(authenticate);
router.use(injectTenantContext);

// ===== VALIDATION SCHEMAS =====

/**
 * Schema for updating user profile information
 * All fields are optional to support partial updates
 */
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  profile: z.object({
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().max(500).optional(),
  }).optional(),
  preferences: z.object({
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
  }).optional()
});

/**
 * Schema for password change requests
 * Enforces strong password requirements (min 12 characters)
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(12, "New password must be at least 12 characters long")
});

// ===== USER PROFILE ROUTES =====
router.get("/me/profile", UserProfileController.getMyProfile);
router.put("/me/profile", validateBody(updateProfileSchema), UserProfileController.updateMyProfile);
router.get("/me/account-info", UserProfileController.getMyAccountInfo);
router.post("/me/avatar", upload.single('avatar'), UserProfileController.uploadAvatar);
router.delete("/me/avatar", UserProfileController.deleteAvatar);
router.post("/me/change-password", validateBody(changePasswordSchema), UserProfileController.changePassword);
router.post("/me/request-deletion", UserProfileController.requestAccountDeletion);

// ===== USER PREFERENCES ROUTES =====
// Add explicit OPTIONS handling for preferences endpoints
router.options("/me/preferences", simpleCorsMiddleware);
router.options("/preferences/options", simpleCorsMiddleware);

router.get("/me/preferences", UserPreferencesController.getMyPreferences);
router.put("/me/preferences", UserPreferencesController.updateMyPreferences);
router.post("/me/preferences/reset", UserPreferencesController.resetPreferences);
router.get("/preferences/options", UserPreferencesController.getPreferencesOptions);

// ===== USER NOTIFICATIONS ROUTES =====
router.get("/me/notification-settings", UserNotificationsController.getMyNotificationSettings);
router.put("/me/notification-settings", UserNotificationsController.updateMyNotificationSettings);
router.post("/me/notification-settings/reset", UserNotificationsController.resetNotificationSettings);
router.get("/me/notifications", UserNotificationsController.getMyNotifications);
router.get("/me/notifications/stats", UserNotificationsController.getNotificationStats);
router.post("/me/notifications/mark-read", UserNotificationsController.markNotificationsRead);
router.post("/me/notifications/mark-all-read", UserNotificationsController.markAllNotificationsRead);
router.post("/me/notifications/delete", UserNotificationsController.deleteNotifications);
router.delete("/me/notifications/clear-all", UserNotificationsController.clearAllNotifications);
router.post("/me/notifications/test/:type", UserNotificationsController.testNotificationSettings);

export { router as userProfileRoutes };