import { NextRequest, NextResponse } from "next/server";
import { getFilePath, fileExists } from "@/lib/local-storage";
import { readFile } from "fs/promises";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!(await fileExists(key))) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const filePath = getFilePath(key);
    const fileBuffer = await readFile(filePath);

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
