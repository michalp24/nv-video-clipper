import { Storage } from "@google-cloud/storage";

// Determine which storage backend to use
const USE_GCS = process.env.GCS_PROJECT_ID && process.env.GCS_BUCKET_NAME;
const USE_R2 = process.env.R2_ENDPOINT && !process.env.R2_ENDPOINT.includes("placeholder");
const USE_LOCAL = process.env.STORAGE_MODE === "local" || (!USE_GCS && !USE_R2);

let gcsStorage: Storage | null = null;
let gcsBucketName: string | null = null;

// Initialize GCS if configured
if (USE_GCS) {
  const credentialsPath = process.env.GCS_CREDENTIALS_PATH;
  
  // Initialize Storage with or without explicit credentials
  // If no credentials path provided, uses Application Default Credentials
  gcsStorage = new Storage({
    projectId: process.env.GCS_PROJECT_ID!,
    ...(credentialsPath && { keyFilename: credentialsPath }),
  });
  
  gcsBucketName = process.env.GCS_BUCKET_NAME!;
}

// Import R2 functions if needed
let r2Module: any = null;
if (USE_R2) {
  r2Module = require("./r2");
}

// Import local storage functions if needed
let localModule: any = null;
if (USE_LOCAL) {
  localModule = require("./local-storage");
  console.log("✓ Using Local Filesystem Storage (no cloud needed)");
}

/**
 * Generate a signed upload URL (works with GCS, R2, and local storage)
 */
export async function generateUploadUrl(key: string): Promise<string> {
  if (USE_LOCAL && localModule) {
    // Local storage implementation
    return localModule.generateUploadUrl(key);
  } else if (USE_GCS && gcsStorage && gcsBucketName) {
    // GCS implementation
    const bucket = gcsStorage.bucket(gcsBucketName);
    const file = bucket.file(key);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType: "video/mp4",
    });

    return signedUrl;
  } else if (USE_R2 && r2Module) {
    // R2 implementation
    return r2Module.generateUploadUrl(key);
  } else {
    throw new Error("No storage backend configured. Please set up GCS, R2, or use local storage.");
  }
}

/**
 * Generate a signed download URL (works with GCS, R2, and local storage)
 */
export async function generateDownloadUrl(key: string): Promise<string> {
  if (USE_LOCAL && localModule) {
    // Local storage implementation
    return localModule.generateDownloadUrl(key);
  } else if (USE_GCS && gcsStorage && gcsBucketName) {
    // GCS implementation
    const bucket = gcsStorage.bucket(gcsBucketName);
    const file = bucket.file(key);

    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return signedUrl;
  } else if (USE_R2 && r2Module) {
    // R2 implementation
    return r2Module.generateDownloadUrl(key);
  } else {
    throw new Error("No storage backend configured. Please set up GCS, R2, or use local storage.");
  }
}

/**
 * Check which storage backend is active
 */
export function getStorageBackend(): "local" | "gcs" | "r2" | "none" {
  if (USE_LOCAL) return "local";
  if (USE_GCS) return "gcs";
  if (USE_R2) return "r2";
  return "none";
}
