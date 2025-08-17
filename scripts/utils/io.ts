import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * Enhanced utility functions for file I/O operations with security and type safety
 * Follows PayRox enterprise standards for deployment and manifest management
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  checksum: string;
  isDirectory: boolean;
  permissions: string;
}

export interface FileOperationOptions {
  encoding?: 'utf8' | 'ascii' | 'utf16le' | 'binary';
  mode?: string | number;
  flag?: string;
  maxSize?: number;
  validatePath?: boolean;
  backup?: boolean;
}

export interface DirectoryOptions {
  recursive?: boolean;
  filter?: (file: string) => boolean;
  maxDepth?: number;
  followSymlinks?: boolean;
}

export interface ArchiveOptions {
  compression?: 'gzip' | 'brotli' | 'none';
  level?: number;
  exclude?: string[];
  preservePermissions?: boolean;
}

// Custom error types
export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly filePath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export class SecurityError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_JSON_SIZE: 50 * 1024 * 1024, // 50MB for JSON files
  MAX_TEXT_SIZE: 10 * 1024 * 1024, // 10MB for text files
  MAX_DIRECTORY_DEPTH: 20,
} as const;

// Async file system operations
const fsPromises = {
  readFile: promisify(fs.readFile),
  writeFile: promisify(fs.writeFile),
  readdir: promisify(fs.readdir),
  stat: promisify(fs.stat),
  mkdir: promisify(fs.mkdir),
  access: promisify(fs.access),
  copyFile: promisify(fs.copyFile),
  unlink: promisify(fs.unlink),
  rename: promisify(fs.rename),
};

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY & VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate file path for security (prevent path traversal attacks)
 * @param filePath Path to validate
 * @param baseDir Optional base directory to restrict to
 * @throws SecurityError if path is unsafe
 */
export function validatePath(filePath: string, baseDir?: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new SecurityError('Invalid file path', filePath);
  }

  // Normalize path to prevent traversal
  const normalizedPath = path.normalize(filePath);

  // Check for path traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new SecurityError('Path traversal attempt detected', filePath);
  }

  // Check against base directory if provided
  if (baseDir) {
    const resolvedPath = path.resolve(normalizedPath);
    const resolvedBase = path.resolve(baseDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new SecurityError(
        `Path outside base directory: ${baseDir}`,
        filePath
      );
    }
  }

  // Check path length (Windows limitation)
  if (normalizedPath.length > 260) {
    throw new SecurityError('Path too long (>260 characters)', filePath);
  }
}

/**
 * Validate file size against limits
 * @param size File size in bytes
 * @param maxSize Maximum allowed size
 * @param fileType Type of file for specific limits
 */
export function validateFileSize(
  size: number,
  maxSize?: number,
  fileType?: 'json' | 'text' | 'binary'
): void {
  let limit = maxSize;

  if (!limit) {
    switch (fileType) {
      case 'json':
        limit = FILE_LIMITS.MAX_JSON_SIZE;
        break;
      case 'text':
        limit = FILE_LIMITS.MAX_TEXT_SIZE;
        break;
      default:
        limit = FILE_LIMITS.MAX_FILE_SIZE;
    }
  }

  if (size > limit) {
    throw new FileOperationError(
      `File too large: ${size} bytes (max: ${limit})`,
      'size_validation',
      'unknown'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED JSON OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read JSON file with enhanced error handling and type safety
 * @param filePath Path to the JSON file
 * @param options File operation options
 * @returns Parsed JSON object with proper typing
 */
export function readJsonFile<T = any>(
  filePath: string,
  options: FileOperationOptions = {}
): T {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    if (!fs.existsSync(filePath)) {
      throw new FileOperationError(
        `File not found: ${filePath}`,
        'read_json',
        filePath
      );
    }

    // Check file size before reading
    const stats = fs.statSync(filePath);
    validateFileSize(stats.size, options.maxSize, 'json');

    const content = fs.readFileSync(filePath, options.encoding || 'utf8');

    // Validate JSON content
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new FileOperationError(
        'File is empty or invalid',
        'read_json',
        filePath
      );
    }

    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to read JSON file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'read_json',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Read JSON file asynchronously with enhanced error handling
 * @param filePath Path to the JSON file
 * @param options File operation options
 * @returns Promise with parsed JSON object
 */
export async function readJsonFileAsync<T = any>(
  filePath: string,
  options: FileOperationOptions = {}
): Promise<T> {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    // Check if file exists
    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
    } catch {
      throw new FileOperationError(
        `File not found: ${filePath}`,
        'read_json_async',
        filePath
      );
    }

    // Check file size
    const stats = await fsPromises.stat(filePath);
    validateFileSize(stats.size, options.maxSize, 'json');

    const content = await fsPromises.readFile(
      filePath,
      options.encoding || 'utf8'
    );

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new FileOperationError(
        'File is empty or invalid',
        'read_json_async',
        filePath
      );
    }

    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to read JSON file asynchronously: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'read_json_async',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Write JSON file with formatting and enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options with formatting
 */
export function writeJsonFile<T = any>(
  filePath: string,
  data: T,
  options: FileOperationOptions & { indent?: number } = {}
): void {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    // Create backup if requested
    if (options.backup && fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(data, null, options.indent || 2);

    // Validate content size
    validateFileSize(
      Buffer.byteLength(content, 'utf8'),
      options.maxSize,
      'json'
    );

    fs.writeFileSync(filePath, content, {
      encoding: options.encoding || 'utf8',
      mode: options.mode,
      flag: options.flag,
    });
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to write JSON file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'write_json',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Write JSON file asynchronously with enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options
 */
export async function writeJsonFileAsync<T = any>(
  filePath: string,
  data: T,
  options: FileOperationOptions & { indent?: number } = {}
): Promise<void> {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    // Create backup if requested and file exists
    if (options.backup) {
      try {
        await fsPromises.access(filePath, fs.constants.F_OK);
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fsPromises.copyFile(filePath, backupPath);
      } catch {
        // File doesn't exist, no backup needed
      }
    }

    await ensureDirectoryExistsAsync(path.dirname(filePath));

    const content = JSON.stringify(data, null, options.indent || 2);

    // Validate content size
    validateFileSize(
      Buffer.byteLength(content, 'utf8'),
      options.maxSize,
      'json'
    );

    await fsPromises.writeFile(filePath, content, {
      encoding: options.encoding || 'utf8',
      mode: options.mode,
      flag: options.flag,
    });
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to write JSON file asynchronously: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'write_json_async',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Enhanced text file operations with security and validation
 */

/**
 * Read text file with encoding handling and size validation
 * @param filePath Path to the text file
 * @param options File operation options
 * @returns File content as string
 */
export function readTextFile(
  filePath: string,
  options: FileOperationOptions = {}
): string {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    if (!fs.existsSync(filePath)) {
      throw new FileOperationError(
        `File not found: ${filePath}`,
        'read_text',
        filePath
      );
    }

    // Check file size
    const stats = fs.statSync(filePath);
    validateFileSize(stats.size, options.maxSize, 'text');

    return fs.readFileSync(filePath, options.encoding || 'utf8');
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to read text file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'read_text',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Write text file with encoding and safety features
 * @param filePath Path to write the file
 * @param content Content to write
 * @param options File operation options
 */
export function writeTextFile(
  filePath: string,
  content: string,
  options: FileOperationOptions = {}
): void {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    // Create backup if requested
    if (options.backup && fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Validate content size
    validateFileSize(
      Buffer.byteLength(content, options.encoding || 'utf8'),
      options.maxSize,
      'text'
    );

    fs.writeFileSync(filePath, content, {
      encoding: options.encoding || 'utf8',
      mode: options.mode,
      flag: options.flag,
    });
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to write text file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'write_text',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYROX-SPECIFIC UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read PayRox manifest file with validation
 * @param manifestPath Path to manifest file
 * @returns Typed manifest object
 */
export function readManifestFile(manifestPath: string): {
  version: string;
  network: { name: string; chainId: number };
  routes: Array<{ selector: string; facet: string; codehash?: string }>;
  metadata?: Record<string, any>;
} {
  const manifest = readJsonFile(manifestPath, { validatePath: true });

  // Basic validation
  if (!manifest.version || !manifest.network || !manifest.routes) {
    throw new FileOperationError(
      'Invalid manifest format: missing required fields',
      'read_manifest',
      manifestPath
    );
  }

  return manifest;
}

/**
 * Read deployment artifact with type safety
 * @param deploymentPath Path to deployment JSON
 * @returns Typed deployment info
 */
export function readDeploymentArtifact(deploymentPath: string): {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed?: string;
  deployer?: string;
  timestamp?: number;
} {
  const artifact = readJsonFile(deploymentPath, { validatePath: true });

  if (!artifact.address || !artifact.transactionHash) {
    throw new FileOperationError(
      'Invalid deployment artifact: missing address or transaction hash',
      'read_deployment',
      deploymentPath
    );
  }

  return artifact;
}

/**
 * Save deployment artifact with standardized format
 * @param deploymentPath Path to save artifact
 * @param artifact Deployment information
 */
export function saveDeploymentArtifact(
  deploymentPath: string,
  artifact: {
    address: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed?: string;
    deployer?: string;
    timestamp?: number;
  }
): void {
  const enhancedArtifact = {
    ...artifact,
    timestamp: artifact.timestamp || Date.now(),
    savedAt: new Date().toISOString(),
    version: '1.0.0',
  };

  writeJsonFile(deploymentPath, enhancedArtifact, {
    validatePath: true,
    backup: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTORY & BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * List files in directory with enhanced filtering and security
 * @param dirPath Directory path
 * @param options Directory listing options
 * @returns Array of file paths
 */
export function listFiles(
  dirPath: string,
  options: DirectoryOptions & {
    extension?: string;
    pattern?: RegExp;
    includeMetadata?: boolean;
  } = {}
): string[] | FileMetadata[] {
  try {
    validatePath(dirPath);

    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files: string[] = [];
    const processDirectory = (currentPath: string, depth: number = 0) => {
      if (options.maxDepth && depth > options.maxDepth) {
        return;
      }

      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stats = fs.statSync(fullPath);

        // Skip symlinks unless explicitly allowed
        if (stats.isSymbolicLink() && !options.followSymlinks) {
          continue;
        }

        if (stats.isDirectory() && options.recursive) {
          processDirectory(fullPath, depth + 1);
        } else if (stats.isFile()) {
          // Apply filters
          if (options.extension && !item.endsWith(options.extension)) {
            continue;
          }

          if (options.pattern && !options.pattern.test(item)) {
            continue;
          }

          if (options.filter && !options.filter(fullPath)) {
            continue;
          }

          files.push(fullPath);
        }
      }
    };

    processDirectory(dirPath);

    // Return metadata if requested
    if (options.includeMetadata) {
      return files.map(file => getFileMetadata(file, { validatePath: false }));
    }

    return files;
  } catch (error) {
    throw new FileOperationError(
      `Failed to list files: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'list_files',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Ensure directory exists, create if not (synchronous)
 * @param dirPath Directory path
 * @param options Directory creation options
 */
export function ensureDirectoryExists(
  dirPath: string,
  options: { mode?: string | number; validatePath?: boolean } = {}
): void {
  try {
    if (options.validatePath !== false) {
      validatePath(dirPath);
    }

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {
        recursive: true,
        mode: options.mode,
      });
    }
  } catch (error) {
    throw new FileOperationError(
      `Failed to create directory: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'ensure_directory',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Ensure directory exists asynchronously
 * @param dirPath Directory path
 * @param options Directory creation options
 */
export async function ensureDirectoryExistsAsync(
  dirPath: string,
  options: { mode?: string | number; validatePath?: boolean } = {}
): Promise<void> {
  try {
    if (options.validatePath !== false) {
      validatePath(dirPath);
    }

    try {
      await fsPromises.access(dirPath, fs.constants.F_OK);
    } catch {
      await fsPromises.mkdir(dirPath, {
        recursive: true,
        mode: options.mode,
      });
    }
  } catch (error) {
    throw new FileOperationError(
      `Failed to create directory asynchronously: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'ensure_directory_async',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get enhanced file metadata with security information
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Enhanced file metadata object
 */
export function getFileMetadata(
  filePath: string,
  options: { validatePath?: boolean; includeChecksum?: boolean } = {}
): FileMetadata {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    const stats = fs.statSync(filePath);

    let checksum = '';
    if (options.includeChecksum !== false && !stats.isDirectory()) {
      const content = fs.readFileSync(filePath);
      const crypto = require('crypto');
      checksum = crypto.createHash('sha256').update(content).digest('hex');
    }

    // Get permissions in octal format
    const permissions = (stats.mode & parseInt('777', 8)).toString(8);

    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      checksum: checksum,
      isDirectory: stats.isDirectory(),
      permissions: permissions,
    };
  } catch (error) {
    throw new FileOperationError(
      `Failed to get file metadata: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'get_metadata',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get file metadata asynchronously
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Promise with enhanced file metadata
 */
export async function getFileMetadataAsync(
  filePath: string,
  options: { validatePath?: boolean; includeChecksum?: boolean } = {}
): Promise<FileMetadata> {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    const stats = await fsPromises.stat(filePath);

    let checksum = '';
    if (options.includeChecksum !== false && !stats.isDirectory()) {
      const content = await fsPromises.readFile(filePath);
      const crypto = require('crypto');
      checksum = crypto.createHash('sha256').update(content).digest('hex');
    }

    // Get permissions in octal format
    const permissions = (stats.mode & parseInt('777', 8)).toString(8);

    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      checksum: checksum,
      isDirectory: stats.isDirectory(),
      permissions: permissions,
    };
  } catch (error) {
    throw new FileOperationError(
      `Failed to get file metadata asynchronously: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'get_metadata_async',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Enhanced file operations with security and validation
 */

/**
 * Copy file with enhanced security and metadata preservation
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param options Copy operation options
 */
export function copyFile(
  sourcePath: string,
  destinationPath: string,
  options: {
    preserveTimestamps?: boolean;
    validatePaths?: boolean;
    backup?: boolean;
  } = {}
): void {
  try {
    if (options.validatePaths !== false) {
      validatePath(sourcePath);
      validatePath(destinationPath);
    }

    if (!fs.existsSync(sourcePath)) {
      throw new FileOperationError(
        `Source file not found: ${sourcePath}`,
        'copy_file',
        sourcePath
      );
    }

    // Create backup if requested and destination exists
    if (options.backup && fs.existsSync(destinationPath)) {
      const backupPath = `${destinationPath}.backup.${Date.now()}`;
      fs.copyFileSync(destinationPath, backupPath);
    }

    const destDir = path.dirname(destinationPath);
    ensureDirectoryExists(destDir, { validatePath: false });

    fs.copyFileSync(sourcePath, destinationPath);

    if (options.preserveTimestamps !== false) {
      const stats = fs.statSync(sourcePath);
      fs.utimesSync(destinationPath, stats.atime, stats.mtime);
    }
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to copy file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'copy_file',
      sourcePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Move file with enhanced security
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param options Move operation options
 */
export function moveFile(
  sourcePath: string,
  destinationPath: string,
  options: { validatePaths?: boolean } = {}
): void {
  try {
    if (options.validatePaths !== false) {
      validatePath(sourcePath);
      validatePath(destinationPath);
    }

    if (!fs.existsSync(sourcePath)) {
      throw new FileOperationError(
        `Source file not found: ${sourcePath}`,
        'move_file',
        sourcePath
      );
    }

    const destDir = path.dirname(destinationPath);
    ensureDirectoryExists(destDir, { validatePath: false });

    fs.renameSync(sourcePath, destinationPath);
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to move file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'move_file',
      sourcePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete file safely with enhanced security
 * @param filePath File path to delete
 * @param options Delete operation options
 */
export function deleteFile(
  filePath: string,
  options: {
    force?: boolean;
    validatePath?: boolean;
    backup?: boolean;
  } = {}
): void {
  try {
    if (options.validatePath !== false) {
      validatePath(filePath);
    }

    if (fs.existsSync(filePath)) {
      // Create backup if requested
      if (options.backup) {
        const backupPath = `${filePath}.deleted.${Date.now()}`;
        fs.copyFileSync(filePath, backupPath);
      }

      fs.unlinkSync(filePath);
    } else if (!options.force) {
      throw new FileOperationError(
        `File does not exist: ${filePath}`,
        'delete_file',
        filePath
      );
    }
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }

    throw new FileOperationError(
      `Failed to delete file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'delete_file',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format file size for human reading with proper units
 * @param bytes Size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return size.toFixed(dm) + ' ' + sizes[i];
}

/**
 * Check if path is safe (no traversal attempts)
 * @param filePath Path to check
 * @returns True if path is safe
 */
export function isPathSafe(filePath: string): boolean {
  try {
    validatePath(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension with proper validation
 * @param filePath File path
 * @returns File extension (including dot) or empty string
 */
export function getFileExtension(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file exists and is readable
 * @param filePath Path to check
 * @returns True if file exists and is readable
 */
export function isFileReadable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get directory size recursively with proper error handling
 * @param dirPath Directory path
 * @param options Size calculation options
 * @returns Size in bytes
 */
export function getDirectorySize(
  dirPath: string,
  options: { validatePath?: boolean; maxDepth?: number } = {}
): number {
  try {
    if (options.validatePath !== false) {
      validatePath(dirPath);
    }

    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    let totalSize = 0;

    const calculateSize = (currentPath: string, depth: number = 0): void => {
      if (options.maxDepth && depth > options.maxDepth) {
        return;
      }

      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          calculateSize(fullPath, depth + 1);
        } else {
          totalSize += stats.size;
        }
      }
    };

    calculateSize(dirPath);
    return totalSize;
  } catch (error) {
    throw new FileOperationError(
      `Failed to calculate directory size: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'directory_size',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Clean directory with enhanced safety
 * @param dirPath Directory path
 * @param options Clean operation options
 */
export function cleanDirectory(
  dirPath: string,
  options: {
    preserveDir?: boolean;
    validatePath?: boolean;
    backup?: boolean;
    pattern?: RegExp;
  } = {}
): void {
  try {
    if (options.validatePath !== false) {
      validatePath(dirPath);
    }

    if (!fs.existsSync(dirPath)) {
      return;
    }

    // Create backup if requested
    if (options.backup) {
      const backupPath = `${dirPath}.backup.${Date.now()}`;
      ensureDirectoryExists(backupPath, { validatePath: false });
      // Copy directory contents to backup
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const sourcePath = path.join(dirPath, item);
        const destPath = path.join(backupPath, item);
        copyFile(sourcePath, destPath, { validatePaths: false });
      }
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);

      // Apply pattern filter if provided
      if (options.pattern && !options.pattern.test(item)) {
        continue;
      }

      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    if (!options.preserveDir) {
      fs.rmdirSync(dirPath);
    }
  } catch (error) {
    throw new FileOperationError(
      `Failed to clean directory: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'clean_directory',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}
