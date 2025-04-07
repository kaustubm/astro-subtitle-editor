// File: app/api/upload/route.js
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Increased maxDuration for large file uploads
export const maxDuration = 300; // 5 minutes in seconds

export async function POST(request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video");

    if (!videoFile) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Check file size limit (3GB)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "3221225472", 10);
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds the ${
            maxSize / (1024 * 1024 * 1024)
          } GB limit`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "File is not a video" },
        { status: 400 }
      );
    }

    // Generate a unique job ID
    const jobId = uuidv4();

    // Create directory for this job
    const jobDir = join(process.cwd(), "tmp", jobId);
    await mkdir(jobDir, { recursive: true });

    // Convert the file to a Buffer and save it
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const videoPath = join(jobDir, videoFile.name);
    await writeFile(videoPath, buffer);

    // Create initial status file
    await writeFile(
      join(jobDir, "status.json"),
      JSON.stringify({
        completed: false,
        message: "Upload complete. Processing will begin soon...",
      })
    );

    // Queue the processing job
    await queueProcessingJob(jobId, videoPath);

    return NextResponse.json({
      jobId,
      status: "Processing started",
      fileName: videoFile.name,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: `Failed to upload video: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to queue the processing job
async function queueProcessingJob(jobId, videoPath) {
  // In a production environment, you would use a proper job queue system
  // like Bull, Celery, or AWS SQS. For simplicity, we'll start a worker thread here.

  try {
    const { processVideo } = await import("@/app/lib/videoProcessor");

    // Start processing in the background
    processVideo(jobId, videoPath).catch((error) => {
      console.error(`Error processing video for job ${jobId}:`, error);
      // Error handling is done within the processVideo function
    });
  } catch (error) {
    console.error(`Error queuing job ${jobId}:`, error);
    const statusFilePath = join(process.cwd(), "tmp", jobId, "status.json");
    await writeFile(
      statusFilePath,
      JSON.stringify({
        completed: false,
        error: true,
        message: `Failed to start processing: ${error.message}`,
      })
    );
  }
}
