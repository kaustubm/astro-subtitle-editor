// File: app/api/transcribe/result/route.js
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";

// In-memory store for transcription results
// In production, this should be replaced with Redis or another persistent store
const transcriptionResults = new Map();

/**
 * Store a transcription result in memory
 * @param {string} jobId - The unique job ID
 * @param {object} result - The transcription result
 */
export const storeTranscriptionResult = (jobId, result) => {
  transcriptionResults.set(jobId, {
    ...result,
    timestamp: Date.now(),
  });

  // Auto cleanup after 24 hours
  setTimeout(() => {
    transcriptionResults.delete(jobId);
  }, 24 * 60 * 60 * 1000);
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Check if result exists in memory
    const result = transcriptionResults.get(jobId);

    if (result) {
      // If we have an SRT path, read the content
      if (result.srtPath) {
        try {
          const srtContent = await readFile(result.srtPath, {
            encoding: "utf8",
          });
          result.srtContent = srtContent;
        } catch (error) {
          console.warn(`Could not read SRT file at ${result.srtPath}:`, error);
          // Continue even if we can't read the SRT file
        }
      }

      return NextResponse.json(result);
    }

    // If not found in memory, look for a temp file
    // This is a fallback in case the server restarted and lost in-memory results
    try {
      const tempDir = path.join(os.tmpdir(), "astro-subtitle-editor");
      const resultPath = path.join(tempDir, `${jobId}-result.json`);
      const resultData = await readFile(resultPath, { encoding: "utf8" });
      const parsedResult = JSON.parse(resultData);

      // Store in memory for future requests
      transcriptionResults.set(jobId, {
        ...parsedResult,
        timestamp: Date.now(),
      });

      return NextResponse.json(parsedResult);
    } catch (error) {
      // File not found or invalid JSON, that's okay
    }

    // Result not found
    return NextResponse.json(
      { error: "Transcription result not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error retrieving transcription result:", error);
    return NextResponse.json(
      { error: "Failed to retrieve transcription result" },
      { status: 500 }
    );
  }
}
