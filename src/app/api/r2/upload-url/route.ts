import { NextResponse } from "next/server";
import { generateUploadUrl, getStorageBackend } from "@/lib/storage";
import { nanoid } from "nanoid";
import type { UploadUrlResponse } from "@/types";

export async function POST() {
  try {
    const backend = getStorageBackend();
    
    if (backend === "none") {
      return NextResponse.json(
        { error: "No storage backend configured. Please set up GCS or R2." },
        { status: 500 }
      );
    }

    console.log(`Using storage backend: ${backend.toUpperCase()}`);

    // Generate a unique key for the upload
    const key = `uploads/${nanoid()}.mp4`;

    // Generate signed upload URL (works with both GCS and R2)
    const uploadUrl = await generateUploadUrl(key);

    const response: UploadUrlResponse = {
      uploadUrl,
      key,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
