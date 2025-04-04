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
//   const [hours, minutes, secondsMs] = timeString.split(":");
//   const [seconds, milliseconds] = secondsMs.split(",");
//   return (
//     parseInt(hours) * 3600 +
//     parseInt(minutes) * 60 +
//     parseInt(seconds) +
//     parseInt(milliseconds) / 1000
//   );
// };

// // Function to format seconds to SRT time format (00:00:00,000)
// const formatSrtTime = (seconds) => {
//   const pad = (num, size) => {
//     let s = num.toString();
//     while (s.length < size) s = "0" + s;
//     return s;
//   };

//   const hours = Math.floor(seconds / 3600);
//   const minutes = Math.floor((seconds % 3600) / 60);
//   const secs = Math.floor(seconds % 60);
//   const milliseconds = Math.floor((seconds % 1) * 1000);

//   return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(
//     milliseconds,
//     3
//   )}`;
// };

// // Function to convert SRT to our app's subtitle format
// const convertSrtToSubtitles = (srtContent) => {
//   const parser = new Parser();
//   const parsed = parser.fromSrt(srtContent);

//   return parsed.map((item, index) => {
//     // Handle time format with commas (00:00:00,000)
//     const startTime = parseTimeToSeconds(item.startTime);
//     const endTime = parseTimeToSeconds(item.endTime);

//     return {
//       id: index + 1,
//       startTime,
//       endTime,
//       text: item.text,
//     };
//   });
// };

// // Process subtitles according to Netflix standards
// const processNetflixSubtitles = (subtitles) => {
//   return subtitles.map((subtitle) => {
//     // Apply Netflix duration rules
//     const duration = subtitle.endTime - subtitle.startTime;

//     // Enforce minimum duration (5/6 of a second)
//     if (duration < 5 / 6) {
//       subtitle.endTime = subtitle.startTime + 5 / 6;
//     }

//     // Enforce maximum duration (7 seconds)
//     if (duration > 7) {
//       subtitle.endTime = subtitle.startTime + 7;
//     }

//     // Netflix line treatment - max 2 lines
//     let text = subtitle.text;
//     const words = text.split(" ");

//     // If text is long, insert line breaks according to Netflix rules
//     if (words.length > 13) {
//       // Long enough to consider splitting
//       // Find optimal splitting point based on Netflix guidelines
//       // Split after punctuation, before conjunctions or prepositions
//       const punctuation = [",", ".", ":", ";", "!", "?"];
//       const conjunctions = ["and", "but", "or", "nor", "for", "so", "yet"];
//       const prepositions = [
//         "in",
//         "on",
//         "at",
//         "by",
//         "for",
//         "with",
//         "about",
//         "against",
//         "between",
//         "through",
//       ];

//       // Find best split point
//       let splitIndex = Math.floor(words.length / 2);
//       let bestSplitFound = false;

//       // Look for better split points
//       for (
//         let i = Math.max(4, splitIndex - 3);
//         i <= Math.min(words.length - 4, splitIndex + 3);
//         i++
//       ) {
//         // Check if previous word ends with punctuation
//         if (punctuation.some((p) => words[i - 1].endsWith(p))) {
//           splitIndex = i;
//           bestSplitFound = true;
//           break;
//         }

//         // Check if current word is conjunction or preposition
//         if (
//           conjunctions.includes(words[i].toLowerCase()) ||
//           prepositions.includes(words[i].toLowerCase())
//         ) {
//           splitIndex = i;
//           bestSplitFound = true;
//           break;
//         }
//       }

//       // Only split if we found a good point or the text is very long
//       if (bestSplitFound || words.length > 16) {
//         // Insert line break - replace the space with a newline
//         const firstPart = words.slice(0, splitIndex).join(" ");
//         const secondPart = words.slice(splitIndex).join(" ");
//         text = `${firstPart}\n${secondPart}`;
//       }
//     }

//     subtitle.text = text;
//     return subtitle;
//   });
// };

// // Generate updated SRT content from our subtitle format
// const generateSrtFromSubtitles = (subtitles) => {
//   let srtContent = "";

//   subtitles.forEach((subtitle, index) => {
//     srtContent += `${index + 1}\n`;
//     srtContent += `${formatSrtTime(subtitle.startTime)} --> ${formatSrtTime(
//       subtitle.endTime
//     )}\n`;
//     srtContent += `${subtitle.text}\n\n`;
//   });

//   return srtContent;
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
//     const initialSrtContent = srt(result);

//     // Convert SRT to our app's subtitle format
//     let subtitles = convertSrtToSubtitles(initialSrtContent);

//     // Process subtitles according to Netflix standards
//     subtitles = processNetflixSubtitles(subtitles);

//     // Generate updated SRT content with Netflix standards applied
//     const netflixSrtContent = generateSrtFromSubtitles(subtitles);

//     // Save SRT file
//     const srtPath = await saveToDisk(
//       Buffer.from(netflixSrtContent),
//       `${uuidv4()}.srt`
//     );

//     return NextResponse.json({
//       subtitles,
//       srtContent: netflixSrtContent,
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
