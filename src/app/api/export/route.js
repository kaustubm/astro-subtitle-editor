// File: app/api/export/route.js
import { NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import path from "path";

const execPromise = promisify(exec);

// Create temp directory if it doesn't exist
const ensureTempDir = async () => {
  const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
  try {
    await mkdir(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    console.error("Error creating temp directory:", error);
    throw new Error("Failed to create temporary directory");
  }
};

// Function to save file to disk
const saveToDisk = async (buffer, filename) => {
  const tempDir = await ensureTempDir();
  const filePath = join(tempDir, filename);
  await writeFile(filePath, buffer);
  return filePath;
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video");
    const srtContent = formData.get("srt");
    const format = formData.get("format") || "mp4";
    const quality = formData.get("quality") || "medium";
    const jobId = formData.get("jobId") || uuidv4();

    if (!videoFile || !srtContent) {
      return NextResponse.json(
        { error: "Video file and SRT content are required" },
        { status: 400 }
      );
    }

    // Save files to disk
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const srtBuffer = Buffer.from(srtContent);

    const videoFilename = `${jobId}-input.mp4`;
    const srtFilename = `${jobId}-subtitles.srt`;
    const outputFilename = `${jobId}-output.${
      format === "vtt" ? "vtt" : "mp4"
    }`;

    const videoPath = await saveToDisk(videoBuffer, videoFilename);
    const srtPath = await saveToDisk(srtBuffer, srtFilename);

    // Update progress
    await fetch(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          progress: 20,
          status: "processing",
          message: "Preparing files for export",
        }),
      }
    );

    // Handle different export formats
    let outputPath;

    if (format === "srt") {
      // Just return the SRT file
      outputPath = srtPath;

      // Update progress
      await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            progress: 100,
            status: "completed",
            message: "SRT file ready for download",
          }),
        }
      );
    } else if (format === "vtt") {
      // Convert SRT to WebVTT
      outputPath = join(await ensureTempDir(), outputFilename);

      // Basic conversion (in production, use a proper SRT to VTT converter)
      let srtText = srtContent.toString();

      // Replace SRT format with WebVTT format
      srtText =
        "WEBVTT\n\n" +
        srtText
          .replace(/^[\d]+$/gm, "") // Remove subtitle numbers
          .replace(/,/g, ".") // Replace commas with periods in timestamps
          .trim();

      await writeFile(outputPath, srtText);

      // Update progress
      await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            progress: 100,
            status: "completed",
            message: "WebVTT file ready for download",
          }),
        }
      );
    } else {
      // Export MP4 with embedded subtitles
      outputPath = join(await ensureTempDir(), outputFilename);

      // Determine FFmpeg settings based on quality
      let preset, crf;

      switch (quality) {
        case "high":
          preset = "slow";
          crf = "18";
          break;
        case "low":
          preset = "faster";
          crf = "28";
          break;
        default: // medium
          preset = "medium";
          crf = "23";
          break;
      }

      // Update progress
      await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            progress: 40,
            status: "processing",
            message: "Embedding subtitles into video",
          }),
        }
      );

      // Run FFmpeg to embed subtitles
      try {
        const ffmpegCommand = `ffmpeg -i "${videoPath}" -vf "subtitles=${srtPath}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H80000000,BorderStyle=3,Outline=1.5,Shadow=0.75,Alignment=2,MarginV=50'" -c:v libx264 -preset ${preset} -crf ${crf} -c:a aac -b:a 192k "${outputPath}"`;

        await execPromise(ffmpegCommand);

        // Update progress
        await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId,
              progress: 100,
              status: "completed",
              message: "Video with subtitles ready for download",
            }),
          }
        );
      } catch (error) {
        console.error("FFmpeg error:", error);

        // Update progress with error
        await fetch(
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/progress`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId,
              progress: 0,
              status: "failed",
              message: "Failed to embed subtitles: " + error.message,
            }),
          }
        );

        throw new Error("Failed to embed subtitles: " + error.message);
      }
    }

    // Return success response with file paths
    return NextResponse.json({
      success: true,
      jobId,
      outputPath,
      format,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Route handler to get the exported file
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Make sure the path is within our temp directory (security check)
    const tempDir = await ensureTempDir();
    const normalizedPath = path.normalize(filePath);

    if (!normalizedPath.startsWith(tempDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
    }

    // Read the file
    const fileBuffer = await readFile(normalizedPath);

    // Determine content type
    let contentType;
    if (normalizedPath.endsWith(".mp4")) {
      contentType = "video/mp4";
    } else if (normalizedPath.endsWith(".srt")) {
      contentType = "text/plain";
    } else if (normalizedPath.endsWith(".vtt")) {
      contentType = "text/vtt";
    } else {
      contentType = "application/octet-stream";
    }

    // Set headers for download
    const filename = path.basename(normalizedPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
