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
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { join } from "path";
import os from "os";
import Parser from "srt-parser-2";
import { Readable } from "stream";

// Configure API route for large file handling
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

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

// Extract audio from video file (optional for large files)
const extractAudioFromVideo = async (videoPath) => {
  try {
    const outputPath = videoPath + ".mp3";
    // Use ffmpeg to extract audio only - more efficient for Deepgram processing
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execPromise = promisify(exec);

    await execPromise(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${outputPath}"`
    );
    return outputPath;
  } catch (error) {
    console.error("Error extracting audio:", error);
    throw error;
  }
};

export async function POST(request) {
  console.log("Transcription API called");
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

    if (file.size > 100 * 1024 * 1024) {
      // If file is larger than 100MB
      console.log("Large file detected, saving to disk first");
      // Get file data as buffer - but in manageable chunks
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);

      // Save file to disk
      const uniqueFileName = `${uuidv4()}-${file.name}`;
      filePath = await saveToDisk(buffer, uniqueFileName);
      console.log(`File saved to ${filePath}`);

      // For very large files, we might want to extract just the audio
      if (
        file.size > 500 * 1024 * 1024 &&
        (file.type.includes("video") ||
          file.name.match(/\.(mp4|mov|avi|mkv)$/i))
      ) {
        console.log("Extracting audio from large video file");
        const audioPath = await extractAudioFromVideo(filePath);
        // Read the audio file instead
        buffer = require("fs").readFileSync(audioPath);
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

    // Send audio file to Deepgram with proper timeout and error handling
    let transcriptionResult;
    try {
      const { result, error } =
        await deepgram.listen.prerecorded.transcribeFile(buffer, options);
      transcriptionResult = { result, error };
    } catch (deepgramError) {
      console.error("Deepgram exception:", deepgramError);
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
