// File: app/api/download/[jobId]/[fileName]/route.js
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request, { params }) {
  try {
    const jobId = params.jobId;
    const fileName = params.fileName;

    if (!jobId || !fileName) {
      return NextResponse.json(
        { error: "Missing job ID or file name" },
        { status: 400 }
      );
    }

    // Sanitize file name to prevent directory traversal attacks
    // Only allow alphanumeric characters, underscores, hyphens, periods, and specific known extensions
    if (!/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*\.srt$/.test(fileName)) {
      return NextResponse.json(
        { error: "Invalid file name format" },
        { status: 400 }
      );
    }

    const filePath = join(process.cwd(), "tmp", jobId, "subtitles", fileName);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileContent = await readFile(filePath);

    // Return the file as a download
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/x-subrip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: `Failed to download file: ${error.message}` },
      { status: 500 }
    );
  }
}
