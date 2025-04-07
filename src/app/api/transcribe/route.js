// // File: app/api/transcribe/route.js
// import { NextResponse } from "next/server";
// import { createClient } from "@deepgram/sdk";
// import { srt } from "@deepgram/captions";
// import { writeFile } from "fs/promises";
// import { mkdir } from "fs/promises";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";
// import { join } from "path";
// import os from "os";
// import Parser from "srt-parser-2";

// // Create temp directory if it doesn't exist
// const ensureTempDir = async () => {
//   const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
//   try {
//     await mkdir(tempDir, { recursive: true });
//     return tempDir;
//   } catch (error) {
//     console.error("Error creating temp directory:", error);
//     throw new Error("Failed to create temporary directory");
//   }
// };

// // Function to write file to disk
// const saveToDisk = async (buffer, filename) => {
//   const tempDir = await ensureTempDir();
//   const filePath = join(tempDir, filename);
//   await writeFile(filePath, buffer);
//   return filePath;
// };

// // Function to parse SRT time format to seconds
// const parseTimeToSeconds = (timeString) => {
//   const [hours, minutes, seconds] = timeString.split(":").map(parseFloat);
//   return hours * 3600 + minutes * 60 + seconds;
// };

// // Function to convert SRT to our app's subtitle format
// const convertSrtToSubtitles = (srtContent) => {
//   const parser = new Parser();
//   const parsed = parser.fromSrt(srtContent);

//   return parsed.map((item, index) => {
//     // Handle time format with commas (00:00:00,000)
//     const startTimeStr = item.startTime.replace(",", ".");
//     const endTimeStr = item.endTime.replace(",", ".");

//     return {
//       id: index + 1,
//       startTime: parseTimeToSeconds(startTimeStr),
//       endTime: parseTimeToSeconds(endTimeStr),
//       text: item.text,
//     };
//   });
// };

// export async function POST(request) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get("file");
//     const language = formData.get("language") || "en";

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     // Get file data as buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Save file to disk (temporary solution - in production you might want to use cloud storage)
//     const uniqueFileName = `${uuidv4()}-${file.name}`;
//     const filePath = await saveToDisk(buffer, uniqueFileName);

//     // Initialize Deepgram client with the new createClient method
//     const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

//     // Determine which model to use based on language
//     const model = language === "en" ? "nova-3" : "nova-2";

//     // Configure transcription options
//     const options = {
//       model: model,
//       smart_format: true,
//       utterances: false,
//       punctuate: true,
//       diarize: false,
//       language: language,
//     };

//     // Send audio file to Deepgram for transcription using the new API structure
//     const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
//       buffer,
//       options
//     );

//     if (error) {
//       console.error("Deepgram API error:", error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     // Use the built-in SRT formatter from Deepgram
//     const srtContent = srt(result);

//     // Save SRT file
//     const srtPath = await saveToDisk(
//       Buffer.from(srtContent),
//       `${uuidv4()}.srt`
//     );

//     // Convert SRT to our app's subtitle format
//     const subtitles = convertSrtToSubtitles(srtContent);

//     return NextResponse.json({
//       subtitles,
//       srtContent,
//       srtPath,
//       filePath,
//       confidence:
//         result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
//     });
//   } catch (error) {
//     console.error("Transcription error:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// File: app/api/transcribe/route.js
import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { srt } from "@deepgram/captions";
import { writeFile, unlink } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import os from "os";
import Parser from "srt-parser-2";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Set a larger body size limit
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

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

// Function to write file to disk
const saveToDisk = async (buffer, filename) => {
  const tempDir = await ensureTempDir();
  const filePath = join(tempDir, filename);
  await writeFile(filePath, buffer);
  return filePath;
};

// Function to clean up old temp files
const cleanupTempFiles = async (maxAgeHours = 24) => {
  try {
    const tempDir = await ensureTempDir();
    const files = await readdir(tempDir);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    let cleanedCount = 0;
    let cleanedBytes = 0;

    for (const file of files) {
      const filePath = join(tempDir, file);
      const fileStat = await stat(filePath);

      // Check if file is older than maxAgeHours
      if (now - fileStat.mtime.getTime() > maxAgeMs) {
        cleanedBytes += fileStat.size;
        await unlink(filePath);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `Cleaned up ${cleanedCount} files (${(
          cleanedBytes /
          1024 /
          1024
        ).toFixed(2)} MB) older than ${maxAgeHours} hours`
      );
    }
  } catch (error) {
    console.error("Error cleaning up temp files:", error);
    // Non-fatal error, continue execution
  }
};

// Function to parse SRT time format to seconds
const parseTimeToSeconds = (timeString) => {
  const [hours, minutes, secondsMs] = timeString.split(":");
  const [seconds, milliseconds] = secondsMs.split(",");
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(milliseconds) / 1000
  );
};

// Function to convert SRT to our app's subtitle format
const convertSrtToSubtitles = (srtContent) => {
  const parser = new Parser();
  const parsed = parser.fromSrt(srtContent);

  return parsed.map((item, index) => {
    // Handle time format with commas (00:00:00,000)
    const startTimeStr = item.startTime.replace(",", ".");
    const endTimeStr = item.endTime.replace(",", ".");

    return {
      id: index + 1,
      startTime: parseTimeToSeconds(startTimeStr),
      endTime: parseTimeToSeconds(endTimeStr),
      text: item.text,
    };
  });
};

// Extract audio from video file
const extractAudioFromVideo = async (videoPath) => {
  try {
    const outputPath = videoPath + ".mp3";
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${outputPath}"`
    );
    return outputPath;
  } catch (error) {
    console.error("Error extracting audio:", error);
    throw error;
  }
};

// Check available disk space
const checkDiskSpace = async () => {
  try {
    const { stdout } = await execAsync("df -h /tmp");
    console.log("Disk space status:", stdout);

    // Parse the output to get the percentage used
    const lines = stdout.trim().split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      if (parts.length >= 5) {
        const percentUsed = parseInt(parts[4].replace("%", ""));
        if (percentUsed > 80) {
          console.warn(
            `WARNING: Disk space is ${percentUsed}% full. Starting aggressive cleanup.`
          );
          // Clean up files aggressively when disk is over 80% full
          await cleanupTempFiles(1); // Clean files older than 1 hour
        }
      }
    }
  } catch (error) {
    console.error("Error checking disk space:", error);
  }
};

export async function POST(request) {
  console.log("Transcription API called");

  // Run cleanup of old temp files
  cleanupTempFiles().catch(console.error);

  // Check available disk space
  checkDiskSpace().catch(console.error);

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "en";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(
      `Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`
    );

    // For very large files, we'll save to disk first rather than loading into memory
    let buffer;
    let filePath;
    let audioPath;

    if (file.size > 100 * 1024 * 1024) {
      // If file is larger than 100MB
      console.log("Large file detected, saving to disk first");
      // Get file data as buffer
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);

      // Save file to disk
      const uniqueFileName = `${uuidv4()}-${file.name}`;
      filePath = await saveToDisk(buffer, uniqueFileName);
      console.log(`File saved to ${filePath}`);

      // For very large files, extract just the audio
      if (
        file.size > 500 * 1024 * 1024 &&
        (file.type.includes("video") ||
          file.name.match(/\.(mp4|mov|avi|mkv)$/i))
      ) {
        console.log("Extracting audio from large video file");
        audioPath = await extractAudioFromVideo(filePath);
        // Read the audio file
        buffer = fs.readFileSync(audioPath);
        console.log(
          `Audio extracted to ${audioPath}, size: ${buffer.length} bytes`
        );
      }
    } else {
      // For smaller files, process normally
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    console.log(`Initializing Deepgram API with ${buffer.length} bytes`);

    // Initialize Deepgram client
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Determine which model to use based on language
    const model = language === "en" ? "nova-3" : "nova-2";

    // Configure transcription options
    const options = {
      model: model,
      smart_format: true,
      utterances: false,
      punctuate: true,
      diarize: false,
      language: language,
    };

    console.log(
      `Calling Deepgram API with model: ${model}, language: ${language}`
    );

    // Send audio file to Deepgram with proper error handling
    let transcriptionResult;
    try {
      const { result, error } =
        await deepgram.listen.prerecorded.transcribeFile(buffer, options);
      transcriptionResult = { result, error };
    } catch (deepgramError) {
      console.error("Deepgram exception:", deepgramError);

      // Clean up temporary files before returning error
      if (audioPath) {
        try {
          await unlink(audioPath);
        } catch (e) {
          console.error("Failed to delete audio file:", e);
        }
      }
      if (filePath && filePath !== audioPath) {
        try {
          await unlink(filePath);
        } catch (e) {
          console.error("Failed to delete video file:", e);
        }
      }

      return NextResponse.json(
        {
          error: `Deepgram API error: ${deepgramError.message}`,
        },
        { status: 500 }
      );
    }

    const { result, error } = transcriptionResult;

    if (error) {
      console.error("Deepgram API error:", error);

      // Clean up temporary files before returning error
      if (audioPath) {
        try {
          await unlink(audioPath);
        } catch (e) {
          console.error("Failed to delete audio file:", e);
        }
      }
      if (filePath && filePath !== audioPath) {
        try {
          await unlink(filePath);
        } catch (e) {
          console.error("Failed to delete video file:", e);
        }
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Transcription successful, formatting result");

    // Use the built-in SRT formatter from Deepgram
    const srtContent = srt(result);

    // Save SRT file
    const srtPath = await saveToDisk(
      Buffer.from(srtContent),
      `${uuidv4()}.srt`
    );

    // Convert SRT to our app's subtitle format
    const subtitles = convertSrtToSubtitles(srtContent);

    console.log(`Generated ${subtitles.length} subtitles`);

    // Clean up the audio file which is no longer needed
    if (audioPath) {
      try {
        await unlink(audioPath);
      } catch (e) {
        console.error("Failed to delete audio file:", e);
      }
    }

    // Keep the original video file and SRT around for a bit, will be cleaned up later

    return NextResponse.json({
      subtitles,
      srtContent,
      srtPath,
      filePath: filePath || null,
      confidence:
        result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
