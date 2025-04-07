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

import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { srt } from "@deepgram/captions";
import { writeFile, unlink, readFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import os from "os";
import Parser from "srt-parser-2";
import { pipeline } from "stream/promises";
import fs from "fs";

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

// Function to stream file to disk instead of loading it all in memory
const streamToDisk = async (file, filename) => {
  const tempDir = await ensureTempDir();
  const filePath = join(tempDir, filename);

  // Create a write stream to the destination path
  const writeStream = fs.createWriteStream(filePath);

  // Get the file's readable stream
  const readStream = file.stream();

  // Pipe the read stream to the write stream
  await pipeline(readStream, writeStream);

  return filePath;
};

// Function to safely delete a file
const deleteFile = async (filePath) => {
  try {
    await unlink(filePath);
    console.log(`Successfully deleted: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

// Function to parse SRT time format to seconds
const parseTimeToSeconds = (timeString) => {
  const [hours, minutes, secondsWithMillis] = timeString.split(":");
  const [seconds, milliseconds] = secondsWithMillis
    .replace(",", ".")
    .split(".");

  return (
    parseFloat(hours) * 3600 +
    parseFloat(minutes) * 60 +
    parseFloat(seconds) +
    parseFloat(milliseconds || 0) / 1000
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

// For large files, we directly stream to Deepgram from disk
const transcribeWithDeepgram = async (filePath, options) => {
  try {
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // Use file read stream instead of loading entire file into memory
    const fileStream = fs.createReadStream(filePath);

    // Set a longer timeout for large files (30 minutes)
    const timeoutMs = 30 * 60 * 1000;

    // Using stream transcription instead of file upload
    const { result, error } =
      await deepgram.listen.prerecorded.transcribeStream(fileStream, {
        ...options,
        _timeout: timeoutMs,
      });

    if (error) {
      console.error("Deepgram API error:", error);
      throw new Error(`Deepgram API error: ${error.message}`);
    }

    return result;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

export async function POST(request) {
  let filePath = null;
  let srtPath = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "en";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get file size
    const fileSize = file.size;
    console.log(`Processing file of size: ${fileSize} bytes`);

    // Stream file to disk to avoid memory issues
    const uniqueFileName = `${uuidv4()}-${file.name}`;
    filePath = await streamToDisk(file, uniqueFileName);
    console.log(`File saved to: ${filePath}`);

    // Configure transcription options
    const options = {
      model: language === "en" ? "nova-3" : "nova-2",
      smart_format: true,
      utterances: false,
      punctuate: true,
      diarize: false,
      language: language,
    };

    console.log(`Starting transcription with options:`, options);

    // Use streaming transcription for large files
    const result = await transcribeWithDeepgram(filePath, options);
    console.log("Transcription completed successfully");

    // Use the built-in SRT formatter from Deepgram
    const srtContent = srt(result);

    // Save SRT file
    const srtFileName = `${uuidv4()}.srt`;
    srtPath = join(await ensureTempDir(), srtFileName);
    await writeFile(srtPath, srtContent);
    console.log(`SRT file saved to: ${srtPath}`);

    // Convert SRT to our app's subtitle format
    const subtitles = convertSrtToSubtitles(srtContent);

    // Return the response
    const response = {
      subtitles,
      srtContent,
      srtPath,
      filePath,
      confidence:
        result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);

    // Clean up files if there was an error
    if (filePath) await deleteFile(filePath);
    if (srtPath) await deleteFile(srtPath);

    return NextResponse.json(
      {
        error: error.message || "Unknown error during transcription",
        details: error.toString(),
      },
      { status: 500 }
    );
  } finally {
    // Schedule cleanup after response is sent (files persist until response is received by client)
    if (filePath || srtPath) {
      console.log("Scheduling cleanup of temporary files...");
      setTimeout(async () => {
        if (filePath) await deleteFile(filePath);
        if (srtPath) await deleteFile(srtPath);
      }, 5000); // 5 second delay to ensure response is completely sent
    }
  }
}
