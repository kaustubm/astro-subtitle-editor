// File: app/api/transcribe/route.js
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
import { storeTranscriptionResult } from "./result/route";

// AWS SDK imports
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create an S3 client using EC2 instance role
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
});

// S3 bucket configuration
const S3_BUCKET = process.env.S3_BUCKET || "deepgram-transcription";
const S3_FOLDER = "temp-uploads/";

// File size thresholds
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB threshold for S3 approach

// Create temp directory if it doesn't exist
const ensureTempDir = async () => {
  const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
  try {
    await mkdir(tempDir, { recursive: true });
    console.log(`Temporary directory created at: ${tempDir}`);
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

// Upload file to S3 and return a pre-signed URL
const uploadToS3 = async (filePath, fileName) => {
  try {
    const fileContent = await readFile(filePath);
    const fileKey = `${S3_FOLDER}${uuidv4()}-${fileName}`;

    // Get content type based on file extension
    let contentType = "application/octet-stream";
    if (fileName.endsWith(".mp4")) contentType = "video/mp4";
    else if (fileName.endsWith(".mp3")) contentType = "audio/mpeg";
    else if (fileName.endsWith(".wav")) contentType = "audio/wav";
    else if (fileName.endsWith(".avi")) contentType = "video/x-msvideo";
    else if (fileName.endsWith(".mov")) contentType = "video/quicktime";
    else if (fileName.endsWith(".mkv")) contentType = "video/x-matroska";

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        Body: fileContent,
        ContentType: contentType,
      })
    );

    console.log(`File uploaded to S3: ${fileKey}`);

    // Generate a pre-signed URL that expires in 24 hours
    const getObjectCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 86400, // 24 hours in seconds
    });

    console.log(`Generated pre-signed URL: ${signedUrl}`);

    return {
      url: signedUrl,
      fileKey,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
};

// Delete file from S3 after processing
const deleteFromS3 = async (fileKey) => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
      })
    );
    console.log(`Successfully deleted from S3: ${fileKey}`);
    return true;
  } catch (error) {
    console.error(`Error deleting from S3 ${fileKey}:`, error);
    return false;
  }
};

// Function to update job progress
const updateJobProgress = async (jobId, progress, status, message) => {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || ""}/api/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId,
        progress,
        status,
        message,
      }),
    });
    return true;
  } catch (error) {
    console.error("Error updating job progress:", error);
    return false;
  }
};

// Determine if we should use the S3 approach based on file size
const isLargeFile = (size) => {
  return size > LARGE_FILE_THRESHOLD;
};

export async function POST(request) {
  let filePath = null;
  let srtPath = null;
  let s3FileKey = null;
  const jobId = uuidv4();

  try {
    // Create initial job status
    await updateJobProgress(
      jobId,
      0,
      "initializing",
      "Starting transcription job"
    );

    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "en";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileSize = file.size;
    console.log(
      `Processing file: ${file.name}, size: ${fileSize} bytes (${(
        fileSize /
        (1024 * 1024)
      ).toFixed(2)} MB)`
    );

    await updateJobProgress(jobId, 5, "processing", "Processing file upload");

    // Stream file to disk to avoid memory issues
    const uniqueFileName = `${uuidv4()}-${file.name}`;
    filePath = await streamToDisk(file, uniqueFileName);
    console.log(`File saved to disk at: ${filePath}`);

    await updateJobProgress(
      jobId,
      15,
      "processing",
      "File received, preparing for transcription"
    );

    // Initialize Deepgram client with longer timeout
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
      global: {
        fetch: {
          options: {
            timeout: 30 * 60 * 1000, // 30 minutes
          },
        },
      },
    });

    // Configure transcription options
    const options = {
      model: language === "en" ? "nova-3" : "nova-2",
      smart_format: true,
      utterances: false,
      punctuate: true,
      diarize: false,
      language: language,
    };

    let result;

    if (isLargeFile(fileSize)) {
      await updateJobProgress(
        jobId,
        25,
        "processing",
        "Large file detected, uploading to S3"
      );

      console.log("Using S3 URL-based processing for large file");

      // Upload to S3 and get pre-signed URL
      const { url, fileKey } = await uploadToS3(filePath, file.name);
      s3FileKey = fileKey;

      await updateJobProgress(
        jobId,
        40,
        "processing",
        "File uploaded to S3, sending to Deepgram"
      );

      console.log(`Processing file from pre-signed URL: ${url}`);

      // Use URL-based transcription with the pre-signed URL
      const { result: urlResult, error } =
        await deepgram.listen.prerecorded.transcribeUrl({ url }, options);

      if (error) {
        throw new Error(`Deepgram API error: ${error}`);
      }

      result = urlResult;

      await updateJobProgress(
        jobId,
        75,
        "processing",
        "Transcription completed, generating subtitles"
      );

      // We can delete the local file now since S3 has it
      await deleteFile(filePath);
      filePath = null;
    } else {
      await updateJobProgress(
        jobId,
        25,
        "processing",
        "Processing file for transcription"
      );

      console.log("Using direct file processing for smaller file");
      const fileContent = await readFile(filePath);
      console.log(`File read complete. Size: ${fileContent.length} bytes`);

      await updateJobProgress(
        jobId,
        40,
        "processing",
        "Sending to Deepgram for transcription"
      );

      const { result: fileResult, error } =
        await deepgram.listen.prerecorded.transcribeFile(fileContent, options);

      if (error) {
        throw new Error(`Deepgram API error: ${error}`);
      }

      result = fileResult;

      await updateJobProgress(
        jobId,
        75,
        "processing",
        "Transcription completed, generating subtitles"
      );
    }

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

    await updateJobProgress(
      jobId,
      100,
      "completed",
      "Transcription job completed successfully"
    );

    // Create the response object
    const response = {
      jobId,
      subtitles,
      srtContent,
      srtPath,
      filePath,
      confidence:
        result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    };

    // Also save the result to disk for persistence
    try {
      const tempDir = await ensureTempDir();
      const resultPath = join(tempDir, `${jobId}-result.json`);
      await writeFile(resultPath, JSON.stringify(response));
      console.log(`Saved transcription result to: ${resultPath}`);
    } catch (error) {
      console.error("Error saving transcription result to disk:", error);
      // Continue even if saving fails
    }

    // Store result in memory for later retrieval
    storeTranscriptionResult(jobId, response);

    // Schedule cleanup of temporary files and S3 objects for 24 hours later
    // This gives users plenty of time to use the editor
    setTimeout(async () => {
      if (filePath) await deleteFile(filePath);
      if (srtPath) await deleteFile(srtPath);
      if (s3FileKey) await deleteFromS3(s3FileKey);
    }, 24 * 60 * 60 * 1000); // Clean up after 24 hours

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);

    // Update job status to failed
    await updateJobProgress(
      jobId,
      0,
      "failed",
      `Transcription failed: ${error.message || "Unknown error"}`
    );

    // Clean up files if there was an error
    if (filePath) await deleteFile(filePath);
    if (srtPath) await deleteFile(srtPath);
    if (s3FileKey) await deleteFromS3(s3FileKey);

    return NextResponse.json(
      {
        jobId,
        error: error.message || "Unknown error during transcription",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
