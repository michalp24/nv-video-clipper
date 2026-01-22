import { promises as fs } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";

// Storage directory in project root
const STORAGE_DIR = join(process.cwd(), "storage");
const UPLOADS_DIR = join(STORAGE_DIR, "uploads");
const RESULTS_DIR = join(STORAGE_DIR, "results");

/**
 * Initialize local storage directories
 */
async function initStorage() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

// Initialize on module load
initStorage().catch(console.error);

/**
 * Generate a signed upload URL (for local storage, we just return a local endpoint)
 */
export async function generateUploadUrl(key: string): Promise<string> {
  // For local storage, we'll use a special local:// protocol
  // The frontend will detect this and handle the upload differently
  return `local://${key}`;
}

/**
 * Save uploaded file data
 */
export async function saveUploadedFile(key: string, fileBuffer: Buffer): Promise<void> {
  const filePath = join(STORAGE_DIR, key);
  const dir = join(filePath, "..");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, fileBuffer);
}

/**
 * Generate a download URL (for local storage, this is a file path)
 */
export async function generateDownloadUrl(key: string): Promise<string> {
  // Return API endpoint that will serve the file
  return `/api/storage/download?key=${encodeURIComponent(key)}`;
}

/**
 * Get file path for a key
 */
export function getFilePath(key: string): string {
  return join(STORAGE_DIR, key);
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await fs.access(getFilePath(key));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get storage backend name
 */
export function getStorageBackend(): "local" | "gcs" | "r2" | "none" {
  return "local";
}
