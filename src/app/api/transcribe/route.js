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

// import { NextResponse } from "next/server";
// import { createClient } from "@deepgram/sdk";
// import { srt } from "@deepgram/captions";
// import { writeFile, unlink, readFile } from "fs/promises";
// import { mkdir } from "fs/promises";
// import { v4 as uuidv4 } from "uuid";
// import { join } from "path";
// import os from "os";
// import Parser from "srt-parser-2";
// import { pipeline } from "stream/promises";
// import fs from "fs";

// // AWS SDK imports
// import {
//   S3Client,
//   PutObjectCommand,
//   DeleteObjectCommand,
// } from "@aws-sdk/client-s3";

// // Create an S3 client using EC2 instance role
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "ap-southeast-1",
//   // When deployed to EC2 with an instance profile, no explicit credentials are needed
//   // The SDK will automatically use the EC2 instance role credentials
// });

// // S3 bucket configuration
// const S3_BUCKET = process.env.S3_BUCKET || "deepgram-transcription";
// const S3_FOLDER = "temp-uploads/";

// // Create temp directory if it doesn't exist
// const ensureTempDir = async () => {
//   const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
//   try {
//     await mkdir(tempDir, { recursive: true });
//     console.log(`Temporary directory created at: ${tempDir}`);
//     return tempDir;
//   } catch (error) {
//     console.error("Error creating temp directory:", error);
//     throw new Error("Failed to create temporary directory");
//   }
// };

// // Function to stream file to disk instead of loading it all in memory
// const streamToDisk = async (file, filename) => {
//   const tempDir = await ensureTempDir();
//   const filePath = join(tempDir, filename);

//   // Create a write stream to the destination path
//   const writeStream = fs.createWriteStream(filePath);

//   // Get the file's readable stream
//   const readStream = file.stream();

//   // Pipe the read stream to the write stream
//   await pipeline(readStream, writeStream);

//   return filePath;
// };

// // Function to safely delete a file
// const deleteFile = async (filePath) => {
//   try {
//     await unlink(filePath);
//     console.log(`Successfully deleted: ${filePath}`);
//     return true;
//   } catch (error) {
//     console.error(`Error deleting file ${filePath}:`, error);
//     return false;
//   }
// };

// // Function to parse SRT time format to seconds
// const parseTimeToSeconds = (timeString) => {
//   const [hours, minutes, secondsWithMillis] = timeString.split(":");
//   const [seconds, milliseconds] = secondsWithMillis
//     .replace(",", ".")
//     .split(".");

//   return (
//     parseFloat(hours) * 3600 +
//     parseFloat(minutes) * 60 +
//     parseFloat(seconds) +
//     parseFloat(milliseconds || 0) / 1000
//   );
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

// // Upload file to S3 and return the URL
// const uploadToS3 = async (filePath, fileName) => {
//   try {
//     const fileContent = await readFile(filePath);
//     const fileKey = `${S3_FOLDER}${uuidv4()}-${fileName}`;

//     // Get content type based on file extension
//     let contentType = "application/octet-stream";
//     if (fileName.endsWith(".mp4")) contentType = "video/mp4";
//     else if (fileName.endsWith(".mp3")) contentType = "audio/mpeg";
//     else if (fileName.endsWith(".wav")) contentType = "audio/wav";
//     else if (fileName.endsWith(".avi")) contentType = "video/x-msvideo";
//     else if (fileName.endsWith(".mov")) contentType = "video/quicktime";

//     // Upload to S3
//     await s3Client.send(
//       new PutObjectCommand({
//         Bucket: S3_BUCKET,
//         Key: fileKey,
//         Body: fileContent,
//         ContentType: contentType,
//       })
//     );

//     console.log(`File uploaded to S3: ${fileKey}`);

//     // Create S3 URL
//     const url = `https://${S3_BUCKET}.s3.${
//       process.env.AWS_REGION || "ap-southeast-1"
//     }.amazonaws.com/${fileKey}`;

//     return {
//       url,
//       fileKey,
//     };
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     throw new Error(`Failed to upload to S3: ${error.message}`);
//   }
// };

// // Delete file from S3 after processing
// const deleteFromS3 = async (fileKey) => {
//   try {
//     await s3Client.send(
//       new DeleteObjectCommand({
//         Bucket: S3_BUCKET,
//         Key: fileKey,
//       })
//     );
//     console.log(`Successfully deleted from S3: ${fileKey}`);
//     return true;
//   } catch (error) {
//     console.error(`Error deleting from S3 ${fileKey}:`, error);
//     return false;
//   }
// };

// // Determine if we should use the S3 approach based on file size
// const isLargeFile = (size) => {
//   return size > 50 * 1024 * 1024; // 50MB threshold
// };

// export async function POST(request) {
//   let filePath = null;
//   let srtPath = null;
//   let s3FileKey = null;

//   try {
//     const formData = await request.formData();
//     const file = formData.get("file");
//     const language = formData.get("language") || "en";

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     const fileSize = file.size;
//     console.log(
//       `Processing file: ${file.name}, size: ${fileSize} bytes (${(
//         fileSize /
//         (1024 * 1024)
//       ).toFixed(2)} MB)`
//     );

//     // Stream file to disk to avoid memory issues
//     const uniqueFileName = `${uuidv4()}-${file.name}`;
//     filePath = await streamToDisk(file, uniqueFileName);
//     console.log(`File saved to disk at: ${filePath}`);

//     // Initialize Deepgram client with longer timeout
//     const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
//       global: {
//         fetch: {
//           options: {
//             timeout: 30 * 60 * 1000, // 30 minutes
//           },
//         },
//       },
//     });

//     // Configure transcription options
//     const options = {
//       model: language === "en" ? "nova-3" : "nova-2",
//       smart_format: true,
//       utterances: false,
//       punctuate: true,
//       diarize: false,
//       language: language,
//     };

//     let result;

//     if (isLargeFile(fileSize)) {
//       console.log("Using S3 URL-based processing for large file");

//       // Upload to S3 and get URL
//       const { url, fileKey } = await uploadToS3(filePath, file.name);
//       s3FileKey = fileKey;

//       console.log(`Processing file from S3 URL: ${url}`);

//       // Use URL-based transcription
//       const { result: urlResult, error } =
//         await deepgram.listen.prerecorded.transcribeUrl({ url }, options);

//       if (error) {
//         throw new Error(`Deepgram API error: ${error.message}`);
//       }

//       result = urlResult;

//       // We can delete the local file now since S3 has it
//       await deleteFile(filePath);
//       filePath = null;
//     } else {
//       console.log("Using direct file processing for smaller file");
//       const fileContent = await readFile(filePath);
//       console.log(`File read complete. Size: ${fileContent.length} bytes`);

//       const { result: fileResult, error } =
//         await deepgram.listen.prerecorded.transcribeFile(fileContent, options);

//       if (error) {
//         throw new Error(`Deepgram API error: ${error.message}`);
//       }

//       result = fileResult;
//     }

//     console.log("Transcription completed successfully");

//     // Use the built-in SRT formatter from Deepgram
//     const srtContent = srt(result);

//     // Save SRT file
//     const srtFileName = `${uuidv4()}.srt`;
//     srtPath = join(await ensureTempDir(), srtFileName);
//     await writeFile(srtPath, srtContent);
//     console.log(`SRT file saved to: ${srtPath}`);

//     // Convert SRT to our app's subtitle format
//     const subtitles = convertSrtToSubtitles(srtContent);

//     // Return the response
//     const response = {
//       subtitles,
//       srtContent,
//       srtPath,
//       filePath,
//       confidence:
//         result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
//     };

//     // Schedule cleanup of temporary files and S3 objects
//     setTimeout(async () => {
//       if (filePath) await deleteFile(filePath);
//       if (srtPath) await deleteFile(srtPath);
//       if (s3FileKey) await deleteFromS3(s3FileKey);
//     }, 5000);

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error("Transcription error:", error);

//     // Clean up files if there was an error
//     if (filePath) await deleteFile(filePath);
//     if (srtPath) await deleteFile(srtPath);
//     if (s3FileKey) await deleteFromS3(s3FileKey);

//     return NextResponse.json(
//       {
//         error: error.message || "Unknown error during transcription",
//         details: error.toString(),
//       },
//       { status: 500 }
//     );
//   }
// }
