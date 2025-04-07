// File: app/api/status/[jobId]/route.js
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request, { params }) {
  try {
    const jobId = params.jobId; // Fix: don't destructure with await

    if (!jobId) {
      return NextResponse.json(
        { error: "No job ID provided" },
        { status: 400 }
      );
    }

    const jobDir = join(process.cwd(), "tmp", jobId);
    const statusFilePath = join(jobDir, "status.json");

    // Check if status file exists
    if (!existsSync(statusFilePath)) {
      return NextResponse.json({
        completed: false,
        message: "Processing queued...",
      });
    }

    // Read the status file
    const statusData = await readFile(statusFilePath, "utf-8");
    const status = JSON.parse(statusData);

    // If completed, add paths to subtitle files
    if (status.completed) {
      const subtitleFiles = {};

      // Read subtitle file information
      const languages = ["english", "malay", "mandarin", "tamil"];

      // Filter out any failed languages
      const availableLanguages = status.failedLanguages
        ? languages.filter((lang) => !status.failedLanguages.includes(lang))
        : languages;

      for (const srcLang of availableLanguages) {
        subtitleFiles[srcLang] = {};

        // Original subtitle file
        const originalSrtPath = join(jobDir, "subtitles", `${srcLang}.srt`);
        if (existsSync(originalSrtPath)) {
          subtitleFiles[srcLang][
            "original"
          ] = `/api/download/${jobId}/${srcLang}.srt`;
        }

        // Translated subtitle files
        for (const targetLang of availableLanguages) {
          if (srcLang !== targetLang) {
            const srtFileName = `${srcLang}_to_${targetLang}.srt`;
            const srtFilePath = join(jobDir, "subtitles", srtFileName);

            if (existsSync(srtFilePath)) {
              // In production, you would generate a signed URL or serve through a proper endpoint
              subtitleFiles[srcLang][
                targetLang
              ] = `/api/download/${jobId}/${srtFileName}`;
            }
          }
        }
      }

      return NextResponse.json({
        ...status,
        subtitleFiles,
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting job status:", error);
    return NextResponse.json(
      { error: `Failed to get job status: ${error.message}` },
      { status: 500 }
    );
  }
}
