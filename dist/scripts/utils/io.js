"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_LIMITS = exports.SecurityError = exports.FileOperationError = void 0;
exports.validatePath = validatePath;
exports.validateFileSize = validateFileSize;
exports.readJsonFile = readJsonFile;
exports.readJsonFileAsync = readJsonFileAsync;
exports.writeJsonFile = writeJsonFile;
exports.writeJsonFileAsync = writeJsonFileAsync;
exports.readTextFile = readTextFile;
exports.writeTextFile = writeTextFile;
exports.readManifestFile = readManifestFile;
exports.readDeploymentArtifact = readDeploymentArtifact;
exports.saveDeploymentArtifact = saveDeploymentArtifact;
exports.listFiles = listFiles;
exports.ensureDirectoryExists = ensureDirectoryExists;
exports.ensureDirectoryExistsAsync = ensureDirectoryExistsAsync;
exports.getFileMetadata = getFileMetadata;
exports.getFileMetadataAsync = getFileMetadataAsync;
exports.copyFile = copyFile;
exports.moveFile = moveFile;
exports.deleteFile = deleteFile;
exports.formatFileSize = formatFileSize;
exports.isPathSafe = isPathSafe;
exports.getFileExtension = getFileExtension;
exports.isFileReadable = isFileReadable;
exports.getDirectorySize = getDirectorySize;
exports.cleanDirectory = cleanDirectory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
// Custom error types
class FileOperationError extends Error {
    _operation;
    _filePath;
    _cause;
    constructor(message, _operation, _filePath, _cause) {
        super(message);
        this._operation = _operation;
        this._filePath = _filePath;
        this._cause = _cause;
        this.name = 'FileOperationError';
    }
}
exports.FileOperationError = FileOperationError;
class SecurityError extends Error {
    _filePath;
    constructor(message, _filePath) {
        super(message);
        this._filePath = _filePath;
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
exports.FILE_LIMITS = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_JSON_SIZE: 50 * 1024 * 1024, // 50MB for JSON files
    MAX_TEXT_SIZE: 10 * 1024 * 1024, // 10MB for text files
    MAX_DIRECTORY_DEPTH: 20,
};
// Async file system operations
const fsPromises = {
    readFile: (0, util_1.promisify)(fs.readFile),
    writeFile: (0, util_1.promisify)(fs.writeFile),
    readdir: (0, util_1.promisify)(fs.readdir),
    stat: (0, util_1.promisify)(fs.stat),
    mkdir: (0, util_1.promisify)(fs.mkdir),
    access: (0, util_1.promisify)(fs.access),
    copyFile: (0, util_1.promisify)(fs.copyFile),
    unlink: (0, util_1.promisify)(fs.unlink),
    rename: (0, util_1.promisify)(fs.rename),
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
function validatePath(filePath, baseDir) {
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
            throw new SecurityError(`Path outside base directory: ${baseDir}`, filePath);
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
function validateFileSize(size, maxSize, fileType) {
    let limit = maxSize;
    if (!limit) {
        switch (fileType) {
            case 'json':
                limit = exports.FILE_LIMITS.MAX_JSON_SIZE;
                break;
            case 'text':
                limit = exports.FILE_LIMITS.MAX_TEXT_SIZE;
                break;
            default:
                limit = exports.FILE_LIMITS.MAX_FILE_SIZE;
        }
    }
    if (size > limit) {
        throw new FileOperationError(`File too large: ${size} bytes (max: ${limit})`, 'size_validation', 'unknown');
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
function readJsonFile(filePath, options = {}) {
    try {
        if (options.validatePath !== false) {
            validatePath(filePath);
        }
        if (!fs.existsSync(filePath)) {
            throw new FileOperationError(`File not found: ${filePath}`, 'read_json', filePath);
        }
        // Check file size before reading
        const stats = fs.statSync(filePath);
        validateFileSize(stats.size, options.maxSize, 'json');
        const content = fs.readFileSync(filePath, options.encoding || 'utf8');
        // Validate JSON content
        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new FileOperationError('File is empty or invalid', 'read_json', filePath);
        }
        return JSON.parse(content);
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to read JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'read_json', filePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Read JSON file asynchronously with enhanced error handling
 * @param filePath Path to the JSON file
 * @param options File operation options
 * @returns Promise with parsed JSON object
 */
async function readJsonFileAsync(filePath, options = {}) {
    try {
        if (options.validatePath !== false) {
            validatePath(filePath);
        }
        // Check if file exists
        try {
            await fsPromises.access(filePath, fs.constants.F_OK);
        }
        catch {
            throw new FileOperationError(`File not found: ${filePath}`, 'read_json_async', filePath);
        }
        // Check file size
        const stats = await fsPromises.stat(filePath);
        validateFileSize(stats.size, options.maxSize, 'json');
        const content = await fsPromises.readFile(filePath, options.encoding || 'utf8');
        if (typeof content !== 'string' || content.trim().length === 0) {
            throw new FileOperationError('File is empty or invalid', 'read_json_async', filePath);
        }
        return JSON.parse(content);
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to read JSON file asynchronously: ${error instanceof Error ? error.message : 'Unknown error'}`, 'read_json_async', filePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Write JSON file with formatting and enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options with formatting
 */
function writeJsonFile(filePath, data, options = {}) {
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
        validateFileSize(Buffer.byteLength(content, 'utf8'), options.maxSize, 'json');
        fs.writeFileSync(filePath, content, {
            encoding: options.encoding || 'utf8',
            mode: options.mode,
            flag: options.flag,
        });
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to write JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'write_json', filePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Write JSON file asynchronously with enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options
 */
async function writeJsonFileAsync(filePath, data, options = {}) {
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
            }
            catch {
                // File doesn't exist, no backup needed
            }
        }
        await ensureDirectoryExistsAsync(path.dirname(filePath));
        const content = JSON.stringify(data, null, options.indent || 2);
        // Validate content size
        validateFileSize(Buffer.byteLength(content, 'utf8'), options.maxSize, 'json');
        await fsPromises.writeFile(filePath, content, {
            encoding: options.encoding || 'utf8',
            mode: options.mode,
            flag: options.flag,
        });
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to write JSON file asynchronously: ${error instanceof Error ? error.message : 'Unknown error'}`, 'write_json_async', filePath, error instanceof Error ? error : undefined);
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
function readTextFile(filePath, options = {}) {
    try {
        if (options.validatePath !== false) {
            validatePath(filePath);
        }
        if (!fs.existsSync(filePath)) {
            throw new FileOperationError(`File not found: ${filePath}`, 'read_text', filePath);
        }
        // Check file size
        const stats = fs.statSync(filePath);
        validateFileSize(stats.size, options.maxSize, 'text');
        return fs.readFileSync(filePath, options.encoding || 'utf8');
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'read_text', filePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Write text file with encoding and safety features
 * @param filePath Path to write the file
 * @param content Content to write
 * @param options File operation options
 */
function writeTextFile(filePath, content, options = {}) {
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
        validateFileSize(Buffer.byteLength(content, options.encoding || 'utf8'), options.maxSize, 'text');
        fs.writeFileSync(filePath, content, {
            encoding: options.encoding || 'utf8',
            mode: options.mode,
            flag: options.flag,
        });
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to write text file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'write_text', filePath, error instanceof Error ? error : undefined);
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
function readManifestFile(manifestPath) {
    const manifest = readJsonFile(manifestPath, { validatePath: true });
    // Basic validation
    if (!manifest.version || !manifest.network || !manifest.routes) {
        throw new FileOperationError('Invalid manifest format: missing required fields', 'read_manifest', manifestPath);
    }
    return manifest;
}
/**
 * Read deployment artifact with type safety
 * @param deploymentPath Path to deployment JSON
 * @returns Typed deployment info
 */
function readDeploymentArtifact(deploymentPath) {
    const artifact = readJsonFile(deploymentPath, { validatePath: true });
    if (!artifact.address || !artifact.transactionHash) {
        throw new FileOperationError('Invalid deployment artifact: missing address or transaction hash', 'read_deployment', deploymentPath);
    }
    return artifact;
}
/**
 * Save deployment artifact with standardized format
 * @param deploymentPath Path to save artifact
 * @param artifact Deployment information
 */
function saveDeploymentArtifact(deploymentPath, artifact) {
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
function listFiles(dirPath, options = {}) {
    try {
        validatePath(dirPath);
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        const files = [];
        const processDirectory = (currentPath, depth = 0) => {
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
                }
                else if (stats.isFile()) {
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
            return files.map((_file) => getFileMetadata(_file, { validatePath: false }));
        }
        return files;
    }
    catch (error) {
        throw new FileOperationError(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`, 'list_files', dirPath, error instanceof Error ? error : undefined);
    }
}
/**
 * Ensure directory exists, create if not (synchronous)
 * @param dirPath Directory path
 * @param options Directory creation options
 */
function ensureDirectoryExists(dirPath, options = {}) {
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
    }
    catch (error) {
        throw new FileOperationError(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ensure_directory', dirPath, error instanceof Error ? error : undefined);
    }
}
/**
 * Ensure directory exists asynchronously
 * @param dirPath Directory path
 * @param options Directory creation options
 */
async function ensureDirectoryExistsAsync(dirPath, options = {}) {
    try {
        if (options.validatePath !== false) {
            validatePath(dirPath);
        }
        try {
            await fsPromises.access(dirPath, fs.constants.F_OK);
        }
        catch {
            await fsPromises.mkdir(dirPath, {
                recursive: true,
                mode: options.mode,
            });
        }
    }
    catch (error) {
        throw new FileOperationError(`Failed to create directory asynchronously: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ensure_directory_async', dirPath, error instanceof Error ? error : undefined);
    }
}
/**
 * Get enhanced file metadata with security information
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Enhanced file metadata object
 */
function getFileMetadata(filePath, options = {}) {
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
    }
    catch (error) {
        throw new FileOperationError(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 'get_metadata', filePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Get file metadata asynchronously
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Promise with enhanced file metadata
 */
async function getFileMetadataAsync(filePath, options = {}) {
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
    }
    catch (error) {
        throw new FileOperationError(`Failed to get file metadata asynchronously: ${error instanceof Error ? error.message : 'Unknown error'}`, 'get_metadata_async', filePath, error instanceof Error ? error : undefined);
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
function copyFile(sourcePath, destinationPath, options = {}) {
    try {
        if (options.validatePaths !== false) {
            validatePath(sourcePath);
            validatePath(destinationPath);
        }
        if (!fs.existsSync(sourcePath)) {
            throw new FileOperationError(`Source file not found: ${sourcePath}`, 'copy_file', sourcePath);
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
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'copy_file', sourcePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Move file with enhanced security
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param options Move operation options
 */
function moveFile(sourcePath, destinationPath, options = {}) {
    try {
        if (options.validatePaths !== false) {
            validatePath(sourcePath);
            validatePath(destinationPath);
        }
        if (!fs.existsSync(sourcePath)) {
            throw new FileOperationError(`Source file not found: ${sourcePath}`, 'move_file', sourcePath);
        }
        const destDir = path.dirname(destinationPath);
        ensureDirectoryExists(destDir, { validatePath: false });
        fs.renameSync(sourcePath, destinationPath);
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'move_file', sourcePath, error instanceof Error ? error : undefined);
    }
}
/**
 * Delete file safely with enhanced security
 * @param filePath File path to delete
 * @param options Delete operation options
 */
function deleteFile(filePath, options = {}) {
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
        }
        else if (!options.force) {
            throw new FileOperationError(`File does not exist: ${filePath}`, 'delete_file', filePath);
        }
    }
    catch (error) {
        if (error instanceof FileOperationError || error instanceof SecurityError) {
            throw error;
        }
        throw new FileOperationError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'delete_file', filePath, error instanceof Error ? error : undefined);
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
function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 B';
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
function isPathSafe(filePath) {
    try {
        validatePath(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get file extension with proper validation
 * @param filePath File path
 * @returns File extension (including dot) or empty string
 */
function getFileExtension(filePath) {
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
function isFileReadable(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.F_OK | fs.constants.R_OK);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get directory size recursively with proper error handling
 * @param dirPath Directory path
 * @param options Size calculation options
 * @returns Size in bytes
 */
function getDirectorySize(dirPath, options = {}) {
    try {
        if (options.validatePath !== false) {
            validatePath(dirPath);
        }
        if (!fs.existsSync(dirPath)) {
            return 0;
        }
        let totalSize = 0;
        const calculateSize = (currentPath, depth = 0) => {
            if (options.maxDepth && depth > options.maxDepth) {
                return;
            }
            const items = fs.readdirSync(currentPath);
            for (const item of items) {
                const fullPath = path.join(currentPath, item);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    calculateSize(fullPath, depth + 1);
                }
                else {
                    totalSize += stats.size;
                }
            }
        };
        calculateSize(dirPath);
        return totalSize;
    }
    catch (error) {
        throw new FileOperationError(`Failed to calculate directory size: ${error instanceof Error ? error.message : 'Unknown error'}`, 'directory_size', dirPath, error instanceof Error ? error : undefined);
    }
}
/**
 * Clean directory with enhanced safety
 * @param dirPath Directory path
 * @param options Clean operation options
 */
function cleanDirectory(dirPath, options = {}) {
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
            }
            else {
                fs.unlinkSync(fullPath);
            }
        }
        if (!options.preserveDir) {
            fs.rmdirSync(dirPath);
        }
    }
    catch (error) {
        throw new FileOperationError(`Failed to clean directory: ${error instanceof Error ? error.message : 'Unknown error'}`, 'clean_directory', dirPath, error instanceof Error ? error : undefined);
    }
}
