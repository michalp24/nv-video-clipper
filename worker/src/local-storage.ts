import { promises as fs } from "fs";
import { join } from "path";

// Storage directory (relative to project root, which is one level up from worker)
const STORAGE_DIR = join(process.cwd(), "..", "storage");

/**
 * Download a file from local storage to processing location
 */
export async function downloadFromLocal(key: string, localPath: string): Promise<void> {
  const sourcePath = join(STORAGE_DIR, key);
  
  // Copy file from storage to processing location
  await fs.copyFile(sourcePath, localPath);
}

/**
 * Upload a file from processing location to local storage
 */
export async function uploadToLocal(localPath: string, key: string): Promise<void> {
  const destPath = join(STORAGE_DIR, key);
  const destDir = join(destPath, "..");
  
  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true });
  
  // Copy file from processing location to storage
  await fs.copyFile(localPath, destPath);
}

/**
 * Get storage backend name
 */
export function getStorageBackend(): string {
  return "Local Filesystem";
}
