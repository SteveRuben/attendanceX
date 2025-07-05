// backend/functions/src/services/file.service.ts

import {FieldValue} from "firebase-admin/firestore";
import {
  FileUpload,
  FileMetadata,
  FileCategory,
  ImageProcessingOptions,
  DocumentProcessingOptions,
  ERROR_CODES,
  FILE_SIZE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  FILE_CATEGORIES,
} from "@attendance-x/shared";
import {authService} from "./auth.service";
import * as crypto from "crypto";
import * as path from "path";
import * as sharp from "sharp";
import * as mammoth from "mammoth";
import {db, storage} from "../config";


// 🔧 INTERFACES ET TYPES
export interface UploadRequest {
  file: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
  category: FileCategory;
  metadata?: Record<string, any>;
  options?: {
    resize?: { width?: number; height?: number; quality?: number };
    generateThumbnails?: boolean;
    extractText?: boolean;
    compress?: boolean;
  };
}

export interface UploadResponse {
  fileId: string;
  fileName: string;
  url: string;
  thumbnails?: string[];
  extractedText?: string;
  metadata: FileMetadata;
}

export interface FileListOptions {
  page?: number;
  limit?: number;
  category?: FileCategory;
  userId?: string;
  uploadedBy?: string;
  dateRange?: { start: Date; end: Date };
  mimeType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  byCategory: Record<FileCategory, { count: number; size: number }>;
  byMimeType: Record<string, number>;
  storageUsed: number;
  storageLimit: number;
}

// 🏭 CLASSE PRINCIPALE DU SERVICE
export class FileService {
  private readonly bucket = storage.bucket();

  // 📤 UPLOAD DE FICHIERS
  async uploadFile(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Validation des données
      await this.validateUploadRequest(request);

      // Vérifier les permissions
      if (!await this.canUploadFile(request.userId, request.category)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Vérifier les limites de stockage
      if (!await this.checkStorageLimit(request.userId, request.file.length)) {
        throw new Error(ERROR_CODES.FILE_TOO_LARGE);
      }

      // Générer l'ID unique et le chemin
      const fileId = crypto.randomUUID();
      const filePath = this.generateFilePath(fileId, request.fileName, request.category);

      // Traiter le fichier selon son type
      const processedFile = await this.processFile(request);

      // Upload vers Firebase Storage
      const uploadResult = await this.uploadToStorage(filePath, processedFile.buffer, request.mimeType);

      // Créer les métadonnées
      const metadata: FileMetadata = {
        id: fileId,
        fileName: request.fileName,
        originalName: request.fileName,
        mimeType: request.mimeType,
        size: processedFile.buffer.length,
        category: request.category,
        uploadedBy: request.userId,
        uploadedAt: new Date(),
        url: uploadResult.publicUrl,
        path: filePath,
        checksum: this.calculateChecksum(processedFile.buffer),
        metadata: {
          ...request.metadata,
          ...processedFile.metadata,
        },
      };

      // Générer des thumbnails pour les images
      let thumbnails: string[] = [];
      if (this.isImage(request.mimeType) && request.options?.generateThumbnails) {
        thumbnails = await this.generateThumbnails(fileId, processedFile.buffer, request.mimeType);
        metadata.thumbnails = thumbnails;
      }

      // Extraire le texte pour les documents
      let extractedText: string | undefined;
      if (this.isDocument(request.mimeType) && request.options?.extractText) {
        extractedText = await this.extractTextFromDocument(processedFile.buffer, request.mimeType);
        metadata.extractedText = extractedText;
      }

      // Sauvegarder les métadonnées
      await this.saveFileMetadata(metadata);

      // Mettre à jour les statistiques utilisateur
      await this.updateUserStorageStats(request.userId, processedFile.buffer.length);

      // Log de l'audit
      await this.logFileAction("file_uploaded", fileId, request.userId, {
        fileName: request.fileName,
        category: request.category,
        size: processedFile.buffer.length,
      });

      return {
        fileId,
        fileName: request.fileName,
        url: uploadResult.publicUrl,
        thumbnails,
        extractedText,
        metadata,
      };
    } catch (error) {
      console.error("Error uploading file:", error);

      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.FILE_UPLOAD_FAILED);
    }
  }

  // 🖼️ TRAITEMENT D'IMAGES
  async uploadImage(request: Omit<UploadRequest, "category"> & {
    resize?: { width?: number; height?: number; quality?: number };
    generateThumbnails?: boolean;
  }): Promise<UploadResponse> {
    if (!this.isImage(request.mimeType)) {
      throw new Error(ERROR_CODES.INVALID_FILE_TYPE);
    }

    return await this.uploadFile({
      ...request,
      category: FILE_CATEGORIES.IMAGE,
      options: {
        resize: request.resize,
        generateThumbnails: request.generateThumbnails ?? true,
        compress: true,
      },
    });
  }

  async uploadAvatar(userId: string, file: Buffer, mimeType: string): Promise<string> {
    const response = await this.uploadImage({
      file,
      fileName: `avatar_${userId}_${Date.now()}.jpg`,
      mimeType,
      userId,
      resize: {width: 200, height: 200, quality: 85},
      generateThumbnails: true,
    });

    return response.url;
  }

  // 📄 TRAITEMENT DE DOCUMENTS
  async uploadDocument(request: Omit<UploadRequest, "category"> & {
    extractText?: boolean;
  }): Promise<UploadResponse> {
    if (!this.isDocument(request.mimeType)) {
      throw new Error(ERROR_CODES.INVALID_FILE_TYPE);
    }

    return await this.uploadFile({
      ...request,
      category: FILE_CATEGORIES.DOCUMENT,
      options: {
        extractText: request.extractText ?? true,
      },
    });
  }

  // 📥 TÉLÉCHARGEMENT ET RÉCUPÉRATION
  async getFile(fileId: string, userId: string): Promise<{
    url: string;
    metadata: FileMetadata;
  }> {
    const metadata = await this.getFileMetadata(fileId);

    // Vérifier les permissions de lecture
    if (!await this.canAccessFile(userId, metadata)) {
      throw new Error(ERROR_CODES.FORBIDDEN);
    }

    // Générer une URL signée pour l'accès sécurisé
    const [signedUrl] = await this.bucket
      .file(metadata.path)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 heure
      });

    // Incrémenter le compteur de téléchargements
    await this.incrementDownloadCount(fileId);

    // Log de l'audit
    await this.logFileAction("file_downloaded", fileId, userId, {
      fileName: metadata.fileName,
    });

    return {
      url: signedUrl,
      metadata,
    };
  }

  async getFiles(options: FileListOptions = {}): Promise<{
    files: FileMetadata[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      page = 1,
      limit = 20,
      category,
      userId,
      uploadedBy,
      dateRange,
      mimeType,
      sortBy = "uploadedAt",
      sortOrder = "desc",
    } = options;

    // Validation de la pagination
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query = db.collection("file_metadata");

    // Filtres
    if (category) {
      query = query.where("category", "==", category);
    }

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    if (uploadedBy) {
      query = query.where("uploadedBy", "==", uploadedBy);
    }

    if (mimeType) {
      query = query.where("mimeType", "==", mimeType);
    }

    if (dateRange) {
      query = query.where("uploadedAt", ">=", dateRange.start)
        .where("uploadedAt", "<=", dateRange.end);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const files = snapshot.docs.map((doc) => doc.data() as FileMetadata);

    // Compter le total
    const total = await this.countFiles(options);

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // 🗑️ SUPPRESSION DE FICHIERS
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const metadata = await this.getFileMetadata(fileId);

      // Vérifier les permissions
      if (!await this.canDeleteFile(userId, metadata)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Supprimer de Firebase Storage
      await this.bucket.file(metadata.path).delete();

      // Supprimer les thumbnails si ils existent
      if (metadata.thumbnails) {
        await Promise.all(
          metadata.thumbnails.map((thumbnail) =>
            this.bucket.file(this.getThumbnailPath(thumbnail)).delete().catch(() => {})
          )
        );
      }

      // Supprimer les métadonnées
      await db.collection("file_metadata").doc(fileId).delete();

      // Mettre à jour les statistiques utilisateur
      await this.updateUserStorageStats(metadata.uploadedBy, -metadata.size);

      // Log de l'audit
      await this.logFileAction("file_deleted", fileId, userId, {
        fileName: metadata.fileName,
        size: metadata.size,
      });

      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  // 📊 STATISTIQUES ET ANALYTICS
  async getFileStats(userId?: string): Promise<FileStats> {
    let query = db.collection("file_metadata");

    if (userId) {
      query = query.where("uploadedBy", "==", userId);
    }

    const snapshot = await query.get();
    const files = snapshot.docs.map((doc) => doc.data() as FileMetadata);

    const stats: FileStats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      byCategory: {} as Record<FileCategory, { count: number; size: number }>,
      byMimeType: {},
      storageUsed: 0,
      storageLimit: this.getStorageLimit(userId),
    };

    // Statistiques par catégorie
    Object.values(FILE_CATEGORIES).forEach((category) => {
      const categoryFiles = files.filter((f) => f.category === category);
      stats.byCategory[category] = {
        count: categoryFiles.length,
        size: categoryFiles.reduce((sum, file) => sum + file.size, 0),
      };
    });

    // Statistiques par type MIME
    files.forEach((file) => {
      stats.byMimeType[file.mimeType] = (stats.byMimeType[file.mimeType] || 0) + 1;
    });

    stats.storageUsed = stats.totalSize;

    return stats;
  }

  // 🔧 MÉTHODES PRIVÉES
  private async validateUploadRequest(request: UploadRequest): Promise<void> {
    if (!request.file || request.file.length === 0) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!request.fileName || request.fileName.trim().length === 0) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!request.mimeType) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Vérifier la taille du fichier
    const sizeLimit = this.getSizeLimit(request.category);
    if (request.file.length > sizeLimit) {
      throw new Error(ERROR_CODES.FILE_TOO_LARGE);
    }

    // Vérifier le type de fichier
    if (!this.isAllowedFileType(request.mimeType, request.category)) {
      throw new Error(ERROR_CODES.INVALID_FILE_TYPE);
    }
  }

  private async processFile(request: UploadRequest): Promise<{
    buffer: Buffer;
    metadata: Record<string, any>;
  }> {
    let buffer = request.file;
    const metadata: Record<string, any> = {};

    if (this.isImage(request.mimeType)) {
      const result = await this.processImage(buffer, request.options);
      buffer = result.buffer;
      metadata.dimensions = result.metadata;
    }

    return {buffer, metadata};
  }

  private async processImage(buffer: Buffer, options?: UploadRequest["options"]): Promise<{
    buffer: Buffer;
    metadata: { width: number; height: number; format: string };
  }> {
    let image = sharp(buffer);

    // Redimensionnement si demandé
    if (options?.resize) {
      image = image.resize(options.resize.width, options.resize.height, {
        fit: "cover",
        withoutEnlargement: true,
      });
    }

    // Compression si demandée
    if (options?.compress) {
      image = image.jpeg({quality: options.resize?.quality || 85});
    }

    const processedBuffer = await image.toBuffer();
    const {width, height, format} = await image.metadata();

    return {
      buffer: processedBuffer,
      metadata: {width: width!, height: height!, format: format!},
    };
  }

  private async generateThumbnails(fileId: string, buffer: Buffer, mimeType: string): Promise<string[]> {
    const thumbnailSizes = [50, 150, 300];
    const thumbnails: string[] = [];

    for (const size of thumbnailSizes) {
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(size, size, {fit: "cover"})
          .jpeg({quality: 80})
          .toBuffer();

        const thumbnailPath = `thumbnails/${fileId}_${size}.jpg`;
        const uploadResult = await this.uploadToStorage(thumbnailPath, thumbnailBuffer, "image/jpeg");

        thumbnails.push(uploadResult.publicUrl);
      } catch (error) {
        console.warn(`Failed to generate ${size}px thumbnail:`, error);
      }
    }

    return thumbnails;
  }

  private async extractTextFromDocument(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        const result = await mammoth.extractRawText({buffer});
        return result.value;

      case "text/plain":
        return buffer.toString("utf8");

      default:
        return "";
      }
    } catch (error) {
      console.warn("Failed to extract text:", error);
      return "";
    }
  }

  private async uploadToStorage(filePath: string, buffer: Buffer, mimeType: string): Promise<{
    publicUrl: string;
  }> {
    const file = this.bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000", // 1 an
      },
    });

    await file.makePublic();

    return {
      publicUrl: `https://storage.googleapis.com/${this.bucket.name}/${filePath}`,
    };
  }

  private generateFilePath(fileId: string, fileName: string, category: FileCategory): string {
    const ext = path.extname(fileName);
    const timestamp = Date.now();
    return `${category}/${timestamp}/${fileId}${ext}`;
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  private isImage(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType as any);
  }

  private isDocument(mimeType: string): boolean {
    return ALLOWED_DOCUMENT_TYPES.includes(mimeType as any);
  }

  private isAllowedFileType(mimeType: string, category: FileCategory): boolean {
    switch (category) {
    case FILE_CATEGORIES.IMAGE:
      return this.isImage(mimeType);
    case FILE_CATEGORIES.DOCUMENT:
      return this.isDocument(mimeType);
    default:
      return true;
    }
  }

  private getSizeLimit(category: FileCategory): number {
    switch (category) {
    case FILE_CATEGORIES.AVATAR:
      return FILE_SIZE_LIMITS.AVATAR;
    case FILE_CATEGORIES.IMAGE:
      return FILE_SIZE_LIMITS.IMAGE;
    case FILE_CATEGORIES.DOCUMENT:
      return FILE_SIZE_LIMITS.DOCUMENT;
    default:
      return FILE_SIZE_LIMITS.DOCUMENT;
    }
  }

  private getStorageLimit(userId?: string): number {
    // TODO: Implémenter les limites selon le plan utilisateur
    return 1024 * 1024 * 1024; // 1GB par défaut
  }

  private async canUploadFile(userId: string, category: FileCategory): Promise<boolean> {
    // Permissions de base pour tous les utilisateurs
    const basicPermissions = [FILE_CATEGORIES.AVATAR, FILE_CATEGORIES.IMAGE];

    if (basicPermissions.includes(category)) {
      return true;
    }

    // Permissions avancées
    return await authService.hasPermission(userId, "upload_files");
  }

  private async canAccessFile(userId: string, metadata: FileMetadata): Promise<boolean> {
    // L'utilisateur peut accéder à ses propres fichiers
    if (metadata.uploadedBy === userId) {
      return true;
    }

    // Fichiers publics accessibles à tous
    if (metadata.metadata?.isPublic) {
      return true;
    }

    // Permissions administratives
    return await authService.hasPermission(userId, "access_all_files");
  }

  private async canDeleteFile(userId: string, metadata: FileMetadata): Promise<boolean> {
    // L'utilisateur peut supprimer ses propres fichiers
    if (metadata.uploadedBy === userId) {
      return true;
    }

    // Permissions administratives
    return await authService.hasPermission(userId, "delete_any_file");
  }

  private async checkStorageLimit(userId: string, fileSize: number): Promise<boolean> {
    const userStats = await this.getFileStats(userId);
    const limit = this.getStorageLimit(userId);

    return (userStats.storageUsed + fileSize) <= limit;
  }

  private async getFileMetadata(fileId: string): Promise<FileMetadata> {
    const doc = await db.collection("file_metadata").doc(fileId).get();

    if (!doc.exists) {
      throw new Error(ERROR_CODES.FILE_NOT_FOUND);
    }

    return doc.data() as FileMetadata;
  }

  private async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    await db
      .collection("file_metadata")
      .doc(metadata.id)
      .set(metadata);
  }

  private async incrementDownloadCount(fileId: string): Promise<void> {
    await db
      .collection("file_metadata")
      .doc(fileId)
      .update({
        downloadCount: FieldValue.increment(1),
        lastDownloadedAt: FieldValue.serverTimestamp(),
      });
  }

  private async updateUserStorageStats(userId: string, sizeDelta: number): Promise<void> {
    const userRef = db.collection("user_storage_stats").doc(userId);

    await userRef.set({
      totalSize: FieldValue.increment(sizeDelta),
      lastUpdated: FieldValue.serverTimestamp(),
    }, {merge: true});
  }

  private async countFiles(options: FileListOptions): Promise<number> {
    let query = db.collection("file_metadata");

    // Appliquer les mêmes filtres que getFiles
    if (options.category) query = query.where("category", "==", options.category);
    if (options.userId) query = query.where("userId", "==", options.userId);
    if (options.uploadedBy) query = query.where("uploadedBy", "==", options.uploadedBy);
    if (options.mimeType) query = query.where("mimeType", "==", options.mimeType);
    if (options.dateRange) {
      query = query.where("uploadedAt", ">=", options.dateRange.start)
        .where("uploadedAt", "<=", options.dateRange.end);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private getThumbnailPath(thumbnailUrl: string): string {
    // Extraire le chemin depuis l'URL
    const url = new URL(thumbnailUrl);
    return url.pathname.substring(1); // Enlever le '/' initial
  }

  private async logFileAction(
    action: string,
    fileId: string,
    performedBy: string,
    details?: any
  ): Promise<void> {
    await db.collection("audit_logs").add({
      action,
      targetType: "file",
      targetId: fileId,
      performedBy,
      performedAt: new Date(),
      details,
    });
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const fileService = new FileService();
