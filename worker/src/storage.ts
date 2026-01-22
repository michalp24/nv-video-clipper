import { Storage } from "@google-cloud/storage";
import { createWriteStream, createReadStream } from "fs";
import { pipeline } from "stream/promises";

// Determine which storage backend to use
const USE_GCS = process.env.GCS_PROJECT_ID && process.env.GCS_BUCKET_NAME;
const USE_R2 = process.env.R2_ENDPOINT && !process.env.R2_ENDPOINT?.includes("placeholder");
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
  console.log(`✓ Using Google Cloud Storage${credentialsPath ? ' with service account key' : ' with Application Default Credentials'}`);
}

// Import R2 functions if needed
let r2Module: any = null;
let r2Initialized = false;

async function initR2() {
  if (r2Initialized || !USE_R2) return;
  const module = await import("./r2.js");
  r2Module = module;
  console.log("✓ Using Cloudflare R2");
  r2Initialized = true;
}

// Import local storage functions if needed
let localModule: any = null;
let localInitialized = false;

async function initLocal() {
  if (localInitialized || !USE_LOCAL) return;
  const module = await import("./local-storage.js");
  localModule = module;
  console.log("✓ Using Local Filesystem Storage");
  localInitialized = true;
}

/**
 * Download a file from storage to local path
 */
export async function downloadFromStorage(key: string, localPath: string): Promise<void> {
  if (USE_LOCAL) {
    await initLocal();
    if (localModule) {
      await localModule.downloadFromLocal(key, localPath);
    }
  } else if (USE_GCS && gcsStorage && gcsBucketName) {
    // GCS implementation
    const bucket = gcsStorage.bucket(gcsBucketName);
    const file = bucket.file(key);

    await file.download({
      destination: localPath,
    });
  } else if (USE_R2) {
    await initR2();
    if (r2Module) {
      await r2Module.downloadFromR2(key, localPath);
    }
  } else {
    throw new Error("No storage backend configured");
  }
}

/**
 * Upload a file from local path to storage
 */
export async function uploadToStorage(localPath: string, key: string): Promise<void> {
  if (USE_LOCAL) {
    await initLocal();
    if (localModule) {
      await localModule.uploadToLocal(localPath, key);
    }
  } else if (USE_GCS && gcsStorage && gcsBucketName) {
    // GCS implementation
    const bucket = gcsStorage.bucket(gcsBucketName);
    const file = bucket.file(key);

    await bucket.upload(localPath, {
      destination: key,
      metadata: {
        contentType: "video/mp4",
      },
    });
  } else if (USE_R2) {
    await initR2();
    if (r2Module) {
      await r2Module.uploadToR2(localPath, key);
    }
  } else {
    throw new Error("No storage backend configured");
  }
}

/**
 * Get storage backend name
 */
export function getStorageBackend(): string {
  if (USE_LOCAL) return "Local Filesystem";
  if (USE_GCS) return "Google Cloud Storage";
  if (USE_R2) return "Cloudflare R2";
  return "None";
}
