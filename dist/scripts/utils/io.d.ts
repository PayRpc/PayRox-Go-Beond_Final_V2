/**
 * Enhanced utility functions for file I/O operations with security and type safety
 * Follows PayRox enterprise standards for deployment and manifest management
 */
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
    filter?: (_file: string) => boolean;
    maxDepth?: number;
    followSymlinks?: boolean;
}
export interface ArchiveOptions {
    compression?: 'gzip' | 'brotli' | 'none';
    level?: number;
    exclude?: string[];
    preservePermissions?: boolean;
}
export declare class FileOperationError extends Error {
    readonly _operation: string;
    readonly _filePath: string;
    readonly _cause?: Error | undefined;
    constructor(message: string, _operation: string, _filePath: string, _cause?: Error | undefined);
}
export declare class SecurityError extends Error {
    readonly _filePath: string;
    constructor(message: string, _filePath: string);
}
export declare const FILE_LIMITS: {
    readonly MAX_FILE_SIZE: number;
    readonly MAX_JSON_SIZE: number;
    readonly MAX_TEXT_SIZE: number;
    readonly MAX_DIRECTORY_DEPTH: 20;
};
/**
 * Validate file path for security (prevent path traversal attacks)
 * @param filePath Path to validate
 * @param baseDir Optional base directory to restrict to
 * @throws SecurityError if path is unsafe
 */
export declare function validatePath(filePath: string, baseDir?: string): void;
/**
 * Validate file size against limits
 * @param size File size in bytes
 * @param maxSize Maximum allowed size
 * @param fileType Type of file for specific limits
 */
export declare function validateFileSize(size: number, maxSize?: number, fileType?: 'json' | 'text' | 'binary'): void;
/**
 * Read JSON file with enhanced error handling and type safety
 * @param filePath Path to the JSON file
 * @param options File operation options
 * @returns Parsed JSON object with proper typing
 */
export declare function readJsonFile<T = any>(filePath: string, options?: FileOperationOptions): T;
/**
 * Read JSON file asynchronously with enhanced error handling
 * @param filePath Path to the JSON file
 * @param options File operation options
 * @returns Promise with parsed JSON object
 */
export declare function readJsonFileAsync<T = any>(filePath: string, options?: FileOperationOptions): Promise<T>;
/**
 * Write JSON file with formatting and enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options with formatting
 */
export declare function writeJsonFile<T = any>(filePath: string, data: T, options?: FileOperationOptions & {
    indent?: number;
}): void;
/**
 * Write JSON file asynchronously with enhanced safety
 * @param filePath Path to write the file
 * @param data Data to write
 * @param options File operation options
 */
export declare function writeJsonFileAsync<T = any>(filePath: string, data: T, options?: FileOperationOptions & {
    indent?: number;
}): Promise<void>;
/**
 * Enhanced text file operations with security and validation
 */
/**
 * Read text file with encoding handling and size validation
 * @param filePath Path to the text file
 * @param options File operation options
 * @returns File content as string
 */
export declare function readTextFile(filePath: string, options?: FileOperationOptions): string;
/**
 * Write text file with encoding and safety features
 * @param filePath Path to write the file
 * @param content Content to write
 * @param options File operation options
 */
export declare function writeTextFile(filePath: string, content: string, options?: FileOperationOptions): void;
/**
 * Read PayRox manifest file with validation
 * @param manifestPath Path to manifest file
 * @returns Typed manifest object
 */
export declare function readManifestFile(manifestPath: string): {
    version: string;
    network: {
        name: string;
        chainId: number;
    };
    routes: Array<{
        selector: string;
        facet: string;
        codehash?: string;
    }>;
    metadata?: Record<string, any>;
};
/**
 * Read deployment artifact with type safety
 * @param deploymentPath Path to deployment JSON
 * @returns Typed deployment info
 */
export declare function readDeploymentArtifact(deploymentPath: string): {
    address: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed?: string;
    deployer?: string;
    timestamp?: number;
};
/**
 * Save deployment artifact with standardized format
 * @param deploymentPath Path to save artifact
 * @param artifact Deployment information
 */
export declare function saveDeploymentArtifact(deploymentPath: string, artifact: {
    address: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed?: string;
    deployer?: string;
    timestamp?: number;
}): void;
/**
 * List files in directory with enhanced filtering and security
 * @param dirPath Directory path
 * @param options Directory listing options
 * @returns Array of file paths
 */
export declare function listFiles(dirPath: string, options?: DirectoryOptions & {
    extension?: string;
    pattern?: RegExp;
    includeMetadata?: boolean;
}): string[] | FileMetadata[];
/**
 * Ensure directory exists, create if not (synchronous)
 * @param dirPath Directory path
 * @param options Directory creation options
 */
export declare function ensureDirectoryExists(dirPath: string, options?: {
    mode?: string | number;
    validatePath?: boolean;
}): void;
/**
 * Ensure directory exists asynchronously
 * @param dirPath Directory path
 * @param options Directory creation options
 */
export declare function ensureDirectoryExistsAsync(dirPath: string, options?: {
    mode?: string | number;
    validatePath?: boolean;
}): Promise<void>;
/**
 * Get enhanced file metadata with security information
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Enhanced file metadata object
 */
export declare function getFileMetadata(filePath: string, options?: {
    validatePath?: boolean;
    includeChecksum?: boolean;
}): FileMetadata;
/**
 * Get file metadata asynchronously
 * @param filePath Path to the file
 * @param options Metadata options
 * @returns Promise with enhanced file metadata
 */
export declare function getFileMetadataAsync(filePath: string, options?: {
    validatePath?: boolean;
    includeChecksum?: boolean;
}): Promise<FileMetadata>;
/**
 * Enhanced file operations with security and validation
 */
/**
 * Copy file with enhanced security and metadata preservation
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param options Copy operation options
 */
export declare function copyFile(sourcePath: string, destinationPath: string, options?: {
    preserveTimestamps?: boolean;
    validatePaths?: boolean;
    backup?: boolean;
}): void;
/**
 * Move file with enhanced security
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param options Move operation options
 */
export declare function moveFile(sourcePath: string, destinationPath: string, options?: {
    validatePaths?: boolean;
}): void;
/**
 * Delete file safely with enhanced security
 * @param filePath File path to delete
 * @param options Delete operation options
 */
export declare function deleteFile(filePath: string, options?: {
    force?: boolean;
    validatePath?: boolean;
    backup?: boolean;
}): void;
/**
 * Format file size for human reading with proper units
 * @param bytes Size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted size string
 */
export declare function formatFileSize(bytes: number, decimals?: number): string;
/**
 * Check if path is safe (no traversal attempts)
 * @param filePath Path to check
 * @returns True if path is safe
 */
export declare function isPathSafe(filePath: string): boolean;
/**
 * Get file extension with proper validation
 * @param filePath File path
 * @returns File extension (including dot) or empty string
 */
export declare function getFileExtension(filePath: string): string;
/**
 * Check if file exists and is readable
 * @param filePath Path to check
 * @returns True if file exists and is readable
 */
export declare function isFileReadable(filePath: string): boolean;
/**
 * Get directory size recursively with proper error handling
 * @param dirPath Directory path
 * @param options Size calculation options
 * @returns Size in bytes
 */
export declare function getDirectorySize(dirPath: string, options?: {
    validatePath?: boolean;
    maxDepth?: number;
}): number;
/**
 * Clean directory with enhanced safety
 * @param dirPath Directory path
 * @param options Clean operation options
 */
export declare function cleanDirectory(dirPath: string, options?: {
    preserveDir?: boolean;
    validatePath?: boolean;
    backup?: boolean;
    pattern?: RegExp;
}): void;
