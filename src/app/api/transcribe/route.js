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
// import { setTimeout as sleep } from "timers/promises";

// // AWS SDK imports
// import {
//   S3Client,
//   PutObjectCommand,
//   DeleteObjectCommand,
//   GetObjectCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { fromIni } from "@aws-sdk/credential-providers";

// // Constants
// const S3_BUCKET = process.env.S3_BUCKET || "deepgram-transcription-v2";
// const S3_FOLDER = "temp-uploads/";
// const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
// const MAX_TRANSCRIPTION_ATTEMPTS = 3;
// const CLEANUP_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

// // Create S3 client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "ap-southeast-1",
//   credentials: fromIni({
//     profile: process.env.AWS_PROFILE || "cloudops-automation",
//   }),
// });

// // Helper functions
// const ensureTempDir = async () => {
//   const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
//   await mkdir(tempDir, { recursive: true });
//   return tempDir;
// };

// const streamToDisk = async (file, filename) => {
//   const tempDir = await ensureTempDir();
//   const filePath = join(tempDir, filename);
//   const writeStream = fs.createWriteStream(filePath);
//   const readStream = file.stream();
//   await pipeline(readStream, writeStream);
//   return filePath;
// };

// const deleteFile = async (filePath) => {
//   try {
//     await unlink(filePath);
//     return true;
//   } catch (error) {
//     console.error(`Error deleting file ${filePath}:`, error);
//     return false;
//   }
// };

// const parseTimeToSeconds = (timeString) => {
//   const [hours, minutes, secondsWithMillis] = timeString.split(":");
//   const [seconds, milliseconds] = secondsWithMillis.split(/[,.]/);
//   return (
//     parseFloat(hours) * 3600 +
//     parseFloat(minutes) * 60 +
//     parseFloat(seconds) +
//     parseFloat(milliseconds || "0") / 1000
//   );
// };

// const convertSrtToSubtitles = (srtContent) => {
//   const parser = new Parser();
//   return parser.fromSrt(srtContent).map((item, index) => ({
//     id: index + 1,
//     startTime: parseTimeToSeconds(item.startTime.replace(",", ".")),
//     endTime: parseTimeToSeconds(item.endTime.replace(",", ".")),
//     text: item.text,
//   }));
// };

// const uploadToS3 = async (filePath, fileName) => {
//   const fileContent = await readFile(filePath);
//   const fileKey = `${S3_FOLDER}${uuidv4()}-${fileName}`;

//   const extension = fileName.split(".").pop()?.toLowerCase();
//   const contentTypeMap = {
//     mp4: "video/mp4",
//     mp3: "audio/mpeg",
//     wav: "audio/wav",
//     avi: "video/x-msvideo",
//     mov: "video/quicktime",
//     mkv: "video/x-matroska",
//   };
//   const contentType = contentTypeMap[extension] || "application/octet-stream";

//   await s3Client.send(
//     new PutObjectCommand({
//       Bucket: S3_BUCKET,
//       Key: fileKey,
//       Body: fileContent,
//       ContentType: contentType,
//     })
//   );

//   const signedUrl = await getSignedUrl(
//     s3Client,
//     new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }),
//     { expiresIn: 86400 }
//   );

//   return { url: signedUrl, fileKey };
// };

// const deleteFromS3 = async (fileKey) => {
//   try {
//     await s3Client.send(
//       new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: fileKey })
//     );
//     return true;
//   } catch (error) {
//     console.error(`Error deleting from S3 ${fileKey}:`, error);
//     return false;
//   }
// };

// const updateJobProgress = async (jobId, progress, status, message) => {
//   try {
//     await fetch(`${process.env.NEXTAUTH_URL || ""}/api/progress`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ jobId, progress, status, message }),
//     });
//   } catch (error) {
//     console.error("Error updating job progress:", error);
//   }
// };

// export async function POST(request) {
//   let filePath = null;
//   let srtPath = null;
//   let s3FileKey = null;
//   const jobId = uuidv4();

//   try {
//     await updateJobProgress(jobId, 0, "initializing", "Starting transcription");

//     const formData = await request.formData();
//     const file = formData.get("file");
//     const language = formData.get("language") || "en";

//     if (!file) {
//       throw new Error("No file provided");
//     }

//     await updateJobProgress(jobId, 5, "processing", "Processing file upload");

//     const uniqueFileName = `${uuidv4()}-${file.name}`;
//     filePath = await streamToDisk(file, uniqueFileName);

//     await updateJobProgress(
//       jobId,
//       15,
//       "processing",
//       "Preparing for transcription"
//     );

//     const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");
//     const options = {
//       model: language === "en" ? "nova-3" : "nova-2",
//       smart_format: true,
//       punctuate: true,
//       language,
//     };

//     let result;

//     if (file.size > LARGE_FILE_THRESHOLD) {
//       await updateJobProgress(
//         jobId,
//         25,
//         "processing",
//         "Uploading large file to S3"
//       );

//       const { url, fileKey } = await uploadToS3(filePath, file.name);
//       s3FileKey = fileKey;

//       let attempts = 0;
//       let transcriptionError = null;

//       while (attempts < MAX_TRANSCRIPTION_ATTEMPTS) {
//         attempts++;
//         try {
//           await updateJobProgress(
//             jobId,
//             40 + (attempts - 1) * 10,
//             "processing",
//             `Transcription attempt ${attempts}/${MAX_TRANSCRIPTION_ATTEMPTS}`
//           );

//           const response = await deepgram.listen.prerecorded.transcribeUrl(
//             { url },
//             options
//           );

//           if (response.error) throw response.error;
//           result = response.result;
//           break;
//         } catch (error) {
//           transcriptionError = error;
//           if (attempts < MAX_TRANSCRIPTION_ATTEMPTS) {
//             await sleep(5000 * Math.pow(2, attempts - 1));
//           }
//         }
//       }

//       if (!result) {
//         throw (
//           transcriptionError || new Error("All transcription attempts failed")
//         );
//       }

//       await deleteFile(filePath);
//       filePath = null;
//     } else {
//       const fileStream = fs.createReadStream(filePath);
//       const response = await deepgram.listen.prerecorded.transcribeFile(
//         fileStream,
//         options
//       );
//       if (response.error) throw response.error;
//       result = response.result;
//     }

//     await updateJobProgress(jobId, 75, "processing", "Generating subtitles");

//     const srtContent = srt(result);
//     const tempDir = await ensureTempDir();
//     srtPath = join(tempDir, `${uuidv4()}.srt`);
//     await writeFile(srtPath, srtContent);

//     const response = {
//       jobId,
//       subtitles: convertSrtToSubtitles(srtContent),
//       srtContent,
//       confidence:
//         result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
//     };

//     await updateJobProgress(jobId, 100, "completed", "Transcription completed");

//     setTimeout(async () => {
//       if (filePath) await deleteFile(filePath);
//       if (srtPath) await deleteFile(srtPath);
//       if (s3FileKey) await deleteFromS3(s3FileKey);
//     }, CLEANUP_DELAY_MS);

//     return NextResponse.json(response);
//   } catch (error) {
//     console.error("Transcription error:", error);
//     await updateJobProgress(
//       jobId,
//       0,
//       "failed",
//       `Transcription failed: ${error.message || "Unknown error"}`
//     );

//     const cleanupPromises = [];
//     if (filePath) cleanupPromises.push(deleteFile(filePath));
//     if (srtPath) cleanupPromises.push(deleteFile(srtPath));
//     if (s3FileKey) cleanupPromises.push(deleteFromS3(s3FileKey));
//     await Promise.all(cleanupPromises);

//     return NextResponse.json(
//       { jobId, error: error.message || "Unknown error" },
//       { status: 500 }
//     );
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
import { setTimeout as sleep } from "timers/promises";

// AWS SDK imports
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fromIni } from "@aws-sdk/credential-providers";

// Constants
const S3_BUCKET = process.env.S3_BUCKET || "deepgram-transcription-v2";
const S3_FOLDER = "temp-uploads/";
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
const MAX_TRANSCRIPTION_ATTEMPTS = 3;
const CLEANUP_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: fromIni({
    profile: process.env.AWS_PROFILE || "cloudops-automation",
  }),
});

// Helper functions
const ensureTempDir = async () => {
  const tempDir = join(os.tmpdir(), "astro-subtitle-editor");
  await mkdir(tempDir, { recursive: true });
  return tempDir;
};

const streamToDisk = async (file, filename) => {
  const tempDir = await ensureTempDir();
  const filePath = join(tempDir, filename);
  const writeStream = fs.createWriteStream(filePath);
  const readStream = file.stream();
  await pipeline(readStream, writeStream);
  return filePath;
};

const deleteFile = async (filePath) => {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

const parseTimeToSeconds = (timeString) => {
  const [hours, minutes, secondsWithMillis] = timeString.split(":");
  const [seconds, milliseconds] = secondsWithMillis.split(/[,.]/);
  return (
    parseFloat(hours) * 3600 +
    parseFloat(minutes) * 60 +
    parseFloat(seconds) +
    parseFloat(milliseconds || "0") / 1000
  );
};

const convertSrtToSubtitles = (srtContent) => {
  const parser = new Parser();
  return parser.fromSrt(srtContent).map((item, index) => ({
    id: index + 1,
    startTime: parseTimeToSeconds(item.startTime.replace(",", ".")),
    endTime: parseTimeToSeconds(item.endTime.replace(",", ".")),
    text: item.text,
  }));
};

const uploadToS3 = async (filePath, fileName) => {
  const fileContent = await readFile(filePath);
  const fileKey = `${S3_FOLDER}${uuidv4()}-${fileName}`;

  const extension = fileName.split(".").pop()?.toLowerCase();
  const contentTypeMap = {
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
  };
  const contentType = contentTypeMap[extension] || "application/octet-stream";

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: fileContent,
      ContentType: contentType,
    })
  );

  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }),
    { expiresIn: 86400 }
  );

  return { url: signedUrl, fileKey };
};

const deleteFromS3 = async (fileKey) => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: fileKey })
    );
    return true;
  } catch (error) {
    console.error(`Error deleting from S3 ${fileKey}:`, error);
    return false;
  }
};

const updateJobProgress = async (jobId, progress, status, message) => {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || ""}/api/progress`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, progress, status, message }),
      }
    );

    if (!response.ok) {
      console.error("Failed to update progress:", await response.text());
    }
  } catch (error) {
    console.error("Error updating job progress:", error);
  }
};

export async function POST(request) {
  let filePath = null;
  let srtPath = null;
  let s3FileKey = null;
  let clientJobId = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language") || "en";
    clientJobId = formData.get("jobId") || uuidv4();

    if (!file) {
      throw new Error("No file provided");
    }

    // Initial progress update
    await updateJobProgress(
      clientJobId,
      0,
      "initializing",
      "Starting transcription"
    );

    // File processing
    await updateJobProgress(
      clientJobId,
      5,
      "processing",
      "Processing file upload"
    );
    const uniqueFileName = `${uuidv4()}-${file.name}`;
    filePath = await streamToDisk(file, uniqueFileName);
    await updateJobProgress(
      clientJobId,
      15,
      "processing",
      "Preparing for transcription"
    );

    // Deepgram setup
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");
    const options = {
      model: language === "en" ? "nova-3" : "nova-2",
      smart_format: true,
      punctuate: true,
      language,
    };

    let result;

    if (file.size > LARGE_FILE_THRESHOLD) {
      // Large file processing
      await updateJobProgress(
        clientJobId,
        25,
        "processing",
        "Uploading large file to S3"
      );
      const { url, fileKey } = await uploadToS3(filePath, file.name);
      s3FileKey = fileKey;
      await updateJobProgress(
        clientJobId,
        35,
        "processing",
        "File uploaded, starting transcription"
      );

      let attempts = 0;
      let transcriptionError = null;

      while (attempts < MAX_TRANSCRIPTION_ATTEMPTS) {
        attempts++;
        try {
          await updateJobProgress(
            clientJobId,
            40 + (attempts - 1) * 10,
            "processing",
            `Transcription attempt ${attempts}/${MAX_TRANSCRIPTION_ATTEMPTS}`
          );

          const { result: transcriptionResult, error } =
            await deepgram.listen.prerecorded.transcribeUrl({ url }, options);

          if (error) throw error;
          result = transcriptionResult;

          // Update progress based on actual transcription progress
          await updateJobProgress(
            clientJobId,
            80,
            "processing",
            "Transcription in progress"
          );
          break;
        } catch (error) {
          transcriptionError = error;
          if (attempts < MAX_TRANSCRIPTION_ATTEMPTS) {
            await sleep(5000 * Math.pow(2, attempts - 1));
          }
        }
      }

      if (!result) {
        throw (
          transcriptionError || new Error("All transcription attempts failed")
        );
      }

      await deleteFile(filePath);
      filePath = null;
    } else {
      // Small file processing
      await updateJobProgress(
        clientJobId,
        30,
        "processing",
        "Starting transcription"
      );
      const fileStream = fs.createReadStream(filePath);
      const { result: transcriptionResult, error } =
        await deepgram.listen.prerecorded.transcribeFile(fileStream, options);

      if (error) throw error;
      result = transcriptionResult;

      // Update progress during processing
      await updateJobProgress(
        clientJobId,
        70,
        "processing",
        "Transcription in progress"
      );
    }

    // Post-processing
    await updateJobProgress(
      clientJobId,
      85,
      "processing",
      "Generating subtitles"
    );
    const srtContent = srt(result);
    const tempDir = await ensureTempDir();
    srtPath = join(tempDir, `${uuidv4()}.srt`);
    await writeFile(srtPath, srtContent);

    const response = {
      jobId: clientJobId,
      subtitles: convertSrtToSubtitles(srtContent),
      srtContent,
      confidence:
        result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0,
    };

    // Final completion
    await updateJobProgress(
      clientJobId,
      100,
      "completed",
      "Transcription completed"
    );

    // Cleanup
    setTimeout(async () => {
      if (filePath) await deleteFile(filePath);
      if (srtPath) await deleteFile(srtPath);
      if (s3FileKey) await deleteFromS3(s3FileKey);
    }, CLEANUP_DELAY_MS);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);
    await updateJobProgress(
      clientJobId || uuidv4(),
      0,
      "failed",
      `Transcription failed: ${error.message || "Unknown error"}`
    );

    // Cleanup on error
    const cleanupPromises = [];
    if (filePath) cleanupPromises.push(deleteFile(filePath));
    if (srtPath) cleanupPromises.push(deleteFile(srtPath));
    if (s3FileKey) cleanupPromises.push(deleteFromS3(s3FileKey));
    await Promise.all(cleanupPromises);

    return NextResponse.json(
      { jobId: clientJobId, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
