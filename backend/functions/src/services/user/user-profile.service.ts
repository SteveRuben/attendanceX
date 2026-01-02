import { collections } from "../../config/database";
import { 
  UpdateUserRequest,
  User,
  UserStatus,
  UserAccountInfo
} from "../../common/types/user.types";
import { ValidationError, NotFoundError, UnauthorizedError } from "../../utils/common/errors";
import { logger } from "firebase-functions";
import * as bcrypt from "bcrypt";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

const storage = new Storage();
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'attendance-management-syst.appspot.com';

export class UserProfileService {
  
  /**
   * Get current user's profile
   */
  async getMyProfile(userId: string): Promise<User | null> {
    try {
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }
      
      const userData = userDoc.data()!;
      
      // Return safe API version (without sensitive data)
      const { hashedPassword, ...safeUserData } = userData;
      return {
        id: userDoc.id,
        ...safeUserData
      } as User;
      
    } catch (error: any) {
      logger.error("Error getting user profile:", error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * Update current user's profile
   */
  async updateMyProfile(userId: string, updates: UpdateUserRequest): Promise<User> {
    try {
      // Get existing user
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;

      // Validate updates
      await this.validateUpdateRequest(updates);
      
      // Merge updates with existing data
      const updatedData = {
        ...userData,
        ...updates,
        updatedAt: new Date()
      };
      
      // Save to database
      await collections.users.doc(userId).update(updatedData);
      
      logger.info(`✅ User profile updated: ${userId}`, {
        userId,
        updatedFields: Object.keys(updates)
      });
      
      // Return safe API version (without sensitive data)
      const safeUserData = { ...updatedData };
      delete (safeUserData as any).hashedPassword;
      
      return {
        id: userId,
        ...safeUserData
      } as User;
      
    } catch (error: any) {
      logger.error("Error updating user profile:", error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  /**
   * Get current user's account information
   */
  async getMyAccountInfo(userId: string, tenantId?: string): Promise<UserAccountInfo> {
    try {
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Get tenant information and membership if available
      let organizationInfo = { id: '', name: 'No Organization' };
      let membership: any = null;
      
      if (tenantId) {
        try {
          // Get tenant information
          const tenantDoc = await collections.tenants.doc(tenantId).get();
          if (tenantDoc.exists) {
            const tenantData = tenantDoc.data()!;
            organizationInfo = {
              id: tenantId,
              name: tenantData.name || 'Unknown Organization'
            };
          }
          
          // Get user's membership in this tenant
          const membershipSnapshot = await collections.tenant_memberships
            .where('userId', '==', userId)
            .where('tenantId', '==', tenantId)
            .where('isActive', '==', true)
            .limit(1)
            .get();
          
          if (!membershipSnapshot.empty) {
            const membershipDoc = membershipSnapshot.docs[0];
            membership = {
              id: membershipDoc.id,
              ...membershipDoc.data()
            };
          } else {
            // Fallback: create a basic membership from user's tenantMemberships array
            const userMembership = userData.tenantMemberships?.find((m: any) => m.tenantId === tenantId);
            if (userMembership) {
              membership = {
                id: `${userId}_${tenantId}`,
                tenantId,
                userId,
                role: userMembership.role || 'member',
                featurePermissions: userMembership.permissions || [],
                isActive: true,
                joinedAt: userData.createdAt || new Date(),
                createdAt: userData.createdAt || new Date(),
                updatedAt: userData.updatedAt || new Date()
              };
            }
          }
        } catch (error) {
          logger.warn("Could not fetch tenant/membership information:", error);
        }
      }
      
      // If no membership found, create a default one
      if (!membership) {
        membership = {
          id: `${userId}_default`,
          tenantId: tenantId || '',
          userId,
          role: 'member',
          featurePermissions: [],
          isActive: false,
          joinedAt: userData.createdAt || new Date(),
          createdAt: userData.createdAt || new Date(),
          updatedAt: userData.updatedAt || new Date()
        };
      }
      
      return {
        membership,
        organization: organizationInfo,
        lastLogin: userData.lastLoginAt?.toISOString() || new Date().toISOString()
      };
      
    } catch (error: any) {
      logger.error("Error getting account info:", error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    try {
      // Validate file
      this.validateAvatarFile(file);
      
      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `avatars/${userId}/${uuidv4()}.${fileExtension}`;
      
      // Upload to Google Cloud Storage
      const bucket = storage.bucket(bucketName);
      const fileUpload = bucket.file(fileName);
      
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
          metadata: {
            userId,
            uploadedAt: new Date().toISOString()
          }
        }
      });
      
      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          logger.error("Error uploading avatar:", error);
          reject(new Error("Failed to upload avatar"));
        });
        
        stream.on('finish', async () => {
          try {
            // Make file publicly readable
            await fileUpload.makePublic();
            
            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            
            // Update user's avatar URL in database
            await collections.users.doc(userId).update({
              avatar: publicUrl,
              updatedAt: new Date()
            });
            
            logger.info(`✅ Avatar uploaded successfully: ${userId}`, {
              userId,
              avatarUrl: publicUrl
            });
            
            resolve(publicUrl);
          } catch (error) {
            logger.error("Error finalizing avatar upload:", error);
            reject(new Error("Failed to finalize avatar upload"));
          }
        });
        
        stream.end(file.buffer);
      });
      
    } catch (error: any) {
      logger.error("Error uploading avatar:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<void> {
    try {
      // Get current user to find avatar URL
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      const currentAvatarUrl = userData.avatar;
      
      // Remove avatar URL from database
      await collections.users.doc(userId).update({
        avatar: null,
        updatedAt: new Date()
      });
      
      // Delete file from storage if it exists
      if (currentAvatarUrl && currentAvatarUrl.includes(bucketName)) {
        try {
          const fileName = currentAvatarUrl.split(`${bucketName}/`)[1];
          if (fileName) {
            const bucket = storage.bucket(bucketName);
            await bucket.file(fileName).delete();
            
            logger.info(`🗑️ Avatar file deleted from storage: ${fileName}`);
          }
        } catch (storageError) {
          // Log but don't fail - avatar URL is already removed from database
          logger.warn("Could not delete avatar file from storage:", storageError);
        }
      }
      
      logger.info(`✅ Avatar deleted successfully: ${userId}`);
      
    } catch (error: any) {
      logger.error("Error deleting avatar:", error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to delete avatar: ${error.message}`);
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user document
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Verify current password
      if (!userData.hashedPassword) {
        throw new UnauthorizedError("No password set for this user");
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.hashedPassword);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedError("Current password is incorrect");
      }
      
      // Validate new password
      this.validatePassword(newPassword);
      
      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password in database
      await collections.users.doc(userId).update({
        hashedPassword: hashedNewPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
        mustChangePassword: false // Clear any forced password change flag
      });
      
      logger.info(`✅ Password changed successfully: ${userId}`);
      
    } catch (error: any) {
      logger.error("Error changing password:", error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(userId: string, reason?: string): Promise<void> {
    try {
      // Get user document
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Create deletion request record
      const deletionRequest = {
        userId,
        reason: reason || 'No reason provided',
        requestedAt: new Date(),
        status: 'pending',
        processedAt: null,
        processedBy: null
      };
      
      // Store deletion request
      await collections.account_deletion_requests.add(deletionRequest);
      
      // Update user status to indicate deletion requested
      await collections.users.doc(userId).update({
        status: UserStatus.PENDING_VERIFICATION, // Use existing status or create new one
        metadata: {
          ...userData.metadata,
          deletionRequested: true,
          deletionRequestedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      });
      
      logger.info(`✅ Account deletion requested: ${userId}`, {
        userId,
        reason
      });
      
      // TODO: Send notification to admins about deletion request
      // TODO: Send confirmation email to user
      
    } catch (error: any) {
      logger.error("Error requesting account deletion:", error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to request account deletion: ${error.message}`);
    }
  }

  /**
   * Validate update request
   */
  private async validateUpdateRequest(updates: UpdateUserRequest): Promise<void> {
    // Validate email if provided
    if (updates.email) {
      if (!this.isValidEmail(updates.email)) {
        throw new ValidationError("Invalid email format");
      }
      
      // Check if email is already taken by another user
      // TODO: Implement email uniqueness check across tenants
    }
    
    // Validate phone if provided
    if (updates.phone && !this.isValidPhone(updates.phone)) {
      throw new ValidationError("Invalid phone number format");
    }
    
    // Validate name fields
    if (updates.name && updates.name.trim().length < 2) {
      throw new ValidationError("Name must be at least 2 characters long");
    }
    
    if (updates.firstName && updates.firstName.trim().length < 1) {
      throw new ValidationError("First name cannot be empty");
    }
    
    if (updates.lastName && updates.lastName.trim().length < 1) {
      throw new ValidationError("Last name cannot be empty");
    }
  }

  /**
   * Validate avatar file
   */
  private validateAvatarFile(file: Express.Multer.File): void {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new ValidationError("File size must be less than 5MB");
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError("File must be an image (JPEG, PNG, GIF, or WebP)");
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password format
   */
  private validatePassword(password: string): void {
    if (password.length < 12) {
      throw new ValidationError("Password must be at least 12 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      throw new ValidationError("Password must contain at least one lowercase letter");
    }
    
    if (!/\d/.test(password)) {
      throw new ValidationError("Password must contain at least one number");
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new ValidationError("Password must contain at least one special character");
    }
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

export const userProfileService = new UserProfileService();