const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { logger } = require('../utils/logger');
const { BadRequestError } = require('../utils/errors');
/**
 * Attachment Storage Service
 *
 * Handles file upload, storage, and retrieval for claim attachments
 */

/**
 * File validation configuration
 */
const FILE_VALIDATION = {
  // Allowed MIME types
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',

    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',

    // Medical imaging
    'application/dicom',

    // Compressed
    'application/zip',
    'application/x-rar-compressed',
  ],

  // Max file sizes by type (in bytes)
  maxFileSizes: {
    'application/pdf': 25 * 1024 * 1024, // 25MB
    'image/jpeg': 10 * 1024 * 1024, // 10MB
    'image/png': 10 * 1024 * 1024, // 10MB
    'image/tiff': 50 * 1024 * 1024, // 50MB (medical imaging)
    'application/dicom': 100 * 1024 * 1024, // 100MB (DICOM)
    default: 25 * 1024 * 1024, // 25MB default
  },

  // Blocked file extensions (security)
  blockedExtensions: [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.msi',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
    '.app',
    '.deb',
    '.rpm',
  ],
};

/**
 * Attachment Storage Service
 */
class AttachmentStorageService {
  constructor() {
    this.uploadDir =
      process.env.ATTACHMENT_UPLOAD_DIR || path.join(__dirname, '../../uploads/attachments');
    this.tempDir = process.env.ATTACHMENT_TEMP_DIR || path.join(__dirname, '../../uploads/temp');
    this.storageType = process.env.ATTACHMENT_STORAGE_TYPE || 'local';
  }

  /**
   * Initialize storage
   */
  async initialize() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });

      logger.info('Attachment storage initialized', {
        uploadDir: this.uploadDir,
        tempDir: this.tempDir,
        storageType: this.storageType,
      });
    } catch (error) {
      logger.error('Failed to initialize attachment storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate file
   */
  validateFile(file) {
    const errors = [];

    // Check mime type
    if (!FILE_VALIDATION.allowedMimeTypes.includes(file.mimetype)) {
      errors.push({
        code: 'INVALID_MIME_TYPE',
        message: `File type ${file.mimetype} is not allowed`,
        severity: 'error',
      });
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (FILE_VALIDATION.blockedExtensions.includes(extension)) {
      errors.push({
        code: 'BLOCKED_EXTENSION',
        message: `File extension ${extension} is not allowed for security reasons`,
        severity: 'error',
      });
    }

    // Check file size
    const maxSize =
      FILE_VALIDATION.maxFileSizes[file.mimetype] || FILE_VALIDATION.maxFileSizes.default;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed (${maxSizeMB}MB)`,
        severity: 'error',
      });
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      errors.push({
        code: 'INVALID_FILENAME',
        message: 'Filename is invalid or too long (max 255 characters)',
        severity: 'error',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate secure filename
   */
  generateSecureFilename(originalFilename) {
    const extension = path.extname(originalFilename);
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${random}${extension}`;
  }

  /**
   * Upload file (local storage)
   */
  async uploadLocal(file, metadata = {}) {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new BadRequestError('File validation failed', validation.errors);
      }

      // Generate secure filename
      const secureFilename = this.generateSecureFilename(file.originalname);

      // Create directory structure: /uploads/attachments/YYYY/MM/
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const dirPath = path.join(this.uploadDir, year, month);

      await fs.mkdir(dirPath, { recursive: true });

      // Full file path
      const filePath = path.join(dirPath, secureFilename);
      const relativePath = path.join(year, month, secureFilename);

      // Write file
      await fs.writeFile(filePath, file.buffer);

      // Calculate file hash
      const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      logger.info('File uploaded', {
        originalFilename: file.originalname,
        secureFilename,
        size: file.size,
        mimeType: file.mimetype,
        path: relativePath,
      });

      return {
        filename: secureFilename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileExtension: path.extname(file.originalname),
        storageType: 'local',
        storagePath: relativePath,
        storageUrl: null, // Would be set if using a file server
        fileHash,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('File upload failed', {
        error: error.message,
        filename: file.originalname,
      });
      throw error;
    }
  }

  /**
   * Upload file to S3 (placeholder for production)
   */
  async uploadToS3(file, metadata = {}) {
    // In production, implement AWS S3 upload
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3();

    throw new Error('S3 upload not implemented. Use local storage or implement S3 integration.');
  }

  /**
   * Upload file (main method)
   */
  async upload(file, metadata = {}) {
    switch (this.storageType) {
      case 'local':
        return await this.uploadLocal(file, metadata);
      case 's3':
        return await this.uploadToS3(file, metadata);
      default:
        return await this.uploadLocal(file, metadata);
    }
  }

  /**
   * Retrieve file (local storage)
   */
  async retrieveLocal(storagePath) {
    try {
      const filePath = path.join(this.uploadDir, storagePath);
      const fileBuffer = await fs.readFile(filePath);

      return fileBuffer;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  /**
   * Retrieve file from S3 (placeholder)
   */
  async retrieveFromS3(storagePath) {
    throw new Error('S3 retrieval not implemented');
  }

  /**
   * Retrieve file (main method)
   */
  async retrieve(storageType, storagePath) {
    switch (storageType) {
      case 'local':
        return await this.retrieveLocal(storagePath);
      case 's3':
        return await this.retrieveFromS3(storagePath);
      default:
        return await this.retrieveLocal(storagePath);
    }
  }

  /**
   * Delete file (local storage)
   */
  async deleteLocal(storagePath) {
    try {
      const filePath = path.join(this.uploadDir, storagePath);
      await fs.unlink(filePath);

      logger.info('File deleted', { path: storagePath });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('File deletion failed', {
          error: error.message,
          path: storagePath,
        });
        throw error;
      }
    }
  }

  /**
   * Delete file (main method)
   */
  async delete(storageType, storagePath) {
    switch (storageType) {
      case 'local':
        return await this.deleteLocal(storagePath);
      case 's3':
        // Implement S3 deletion
        throw new Error('S3 deletion not implemented');
      default:
        return await this.deleteLocal(storagePath);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(storageType, storagePath) {
    const filePath = path.join(this.uploadDir, storagePath);

    try {
      const stats = await fs.stat(filePath);

      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        exists: true,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Scan file for viruses (placeholder)
   */
  async scanForViruses(file) {
    // In production, integrate with antivirus service
    // For now, return clean
    return {
      scanned: true,
      clean: true,
      scanDate: new Date(),
      scanEngine: 'none',
    };
  }

  /**
   * Convert image format
   */
  async convertImage(inputBuffer, targetFormat, options = {}) {
    // Requires 'sharp' package
    // const sharp = require('sharp');
    // return await sharp(inputBuffer)
    //   .toFormat(targetFormat, options)
    //   .toBuffer();

    throw new Error('Image conversion not implemented. Install sharp package.');
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(inputBuffer, width = 200, height = 200) {
    // Requires 'sharp' package
    // const sharp = require('sharp');
    // return await sharp(inputBuffer)
    //   .resize(width, height, { fit: 'inside' })
    //   .toBuffer();

    throw new Error('Thumbnail generation not implemented. Install sharp package.');
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics() {
    try {
      let totalSize = 0;
      let fileCount = 0;

      const calculateDirSize = async (dirPath) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await calculateDirSize(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
            fileCount += 1;
          }
        }
      };

      await calculateDirSize(this.uploadDir);

      return {
        totalFiles: fileCount,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        uploadDir: this.uploadDir,
      };
    } catch (error) {
      logger.error('Failed to get storage statistics', { error: error.message });
      return {
        totalFiles: 0,
        totalSize: 0,
        error: error.message,
      };
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / k ** i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;

    const cleanupDir = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await cleanupDir(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);

            if (stats.mtime < cutoffDate) {
              await fs.unlink(fullPath);
              deletedCount += 1;
            }
          }
        }
      } catch (error) {
        logger.error('Cleanup failed for directory', {
          error: error.message,
          dirPath,
        });
      }
    };

    await cleanupDir(this.tempDir);

    logger.info('Cleanup completed', {
      deletedFiles: deletedCount,
      daysOld,
    });

    return { deletedCount };
  }
}

// Singleton instance
const attachmentStorageService = new AttachmentStorageService();

module.exports = {
  AttachmentStorageService,
  attachmentStorageService,
  FILE_VALIDATION,
};
