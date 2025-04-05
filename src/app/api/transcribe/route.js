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

// Create temp directory if it doesn't exist
const ensureTempDir = async () => {
  const tempDir = join(os.tmpdir(), "netflix-subtitle-editor");
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
  const [hours, minutes, seconds] = timeString.split(":").map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "en";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get file data as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to disk (temporary solution - in production you might want to use cloud storage)
    const uniqueFileName = `${uuidv4()}-${file.name}`;
    const filePath = await saveToDisk(buffer, uniqueFileName);

    // Initialize Deepgram client with the new createClient method
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

    // Send audio file to Deepgram for transcription using the new API structure
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      options
    );

    if (error) {
      console.error("Deepgram API error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Use the built-in SRT formatter from Deepgram
    const srtContent = srt(result);

    // Save SRT file
    const srtPath = await saveToDisk(
      Buffer.from(srtContent),
      `${uuidv4()}.srt`
    );

    // Convert SRT to our app's subtitle format
    const subtitles = convertSrtToSubtitles(srtContent);

    return NextResponse.json({
      subtitles,
      srtContent,
      srtPath,
      filePath,
      confidence:
        result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
