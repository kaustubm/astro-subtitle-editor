// File: lib/videoProcessor.js
import { join } from "path";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync, statSync } from "fs";
import { spawn } from "child_process";
import { createClient } from "@deepgram/sdk";
import { srt } from "@deepgram/captions";
import { netflixSrt } from "./netflixFormatter";
import axios from "axios";

// Initialize Deepgram client with your API key
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Language model mapping
const LANGUAGE_MODELS = {
  english: "nova-3",
  malay: "nova-2",
  mandarin: "nova-2",
  tamil: "nova-2",
};

// Language codes for Deepgram
const LANGUAGE_CODES = {
  english: "en",
  malay: "ms",
  mandarin: "zh-CN",
  tamil: "ta",
};

// Netflix formatting languages
const NETFLIX_FORMAT_LANGUAGES = ["english", "malay"];

// Translation API URL (using a mock API for example)
// In production, use a proper translation service like Google Translate, DeepL, etc.
const TRANSLATION_API_URL =
  process.env.TRANSLATION_API_URL ||
  "https://api.translation-service.com/translate";

/**
 * Main function to process a video file
 */
export async function processVideo(jobId, videoPath) {
  const jobDir = join(process.cwd(), "tmp", jobId);
  const subtitlesDir = join(jobDir, "subtitles");

  try {
    // Create subtitles directory
    await mkdir(subtitlesDir, { recursive: true });

    // Update job status
    await updateJobStatus(jobId, {
      completed: false,
      message: "Extracting audio from video...",
    });

    // Extract audio from video
    const audioPath = join(jobDir, "audio.wav");
    await extractAudio(videoPath, audioPath);

    // Verify the audio file exists and is valid
    if (!existsSync(audioPath)) {
      throw new Error("Audio extraction failed: file not created");
    }

    const stats = statSync(audioPath);
    if (stats.size === 0) {
      throw new Error("Audio extraction failed: file is empty");
    }

    // Create original subtitles in all languages
    const languages = Object.keys(LANGUAGE_MODELS);
    const originalSRTs = {};
    const failedLanguages = [];
    const transcriptions = {};

    for (const language of languages) {
      try {
        // Update job status
        await updateJobStatus(jobId, {
          completed: false,
          message: `Generating ${language} subtitles...`,
        });

        // Generate SRT for this language
        const result = await transcribeAudio(audioPath, language);
        transcriptions[language] = result;

        // Generate SRT with appropriate format (Netflix or standard)
        const srtPath = await generateSubtitles(result, language, subtitlesDir);
        originalSRTs[language] = srtPath;
      } catch (error) {
        console.error(`Failed to generate subtitles for ${language}:`, error);
        failedLanguages.push(language);
        await updateJobStatus(jobId, {
          completed: false,
          message: `Error generating ${language} subtitles. Continuing with other languages...`,
        });
      }
    }

    if (Object.keys(originalSRTs).length === 0) {
      throw new Error("Failed to generate subtitles for any language");
    }

    // Translate subtitles to other languages
    await updateJobStatus(jobId, {
      completed: false,
      message: "Translating subtitles to other languages...",
    });

    // For each source language that succeeded
    for (const srcLang of Object.keys(originalSRTs)) {
      const srcSrtPath = originalSRTs[srcLang];

      // Translate to all other languages that succeeded
      for (const targetLang of Object.keys(originalSRTs)) {
        if (srcLang !== targetLang) {
          try {
            // If we have the transcription result for both languages, use that for better translation
            if (transcriptions[srcLang] && transcriptions[targetLang]) {
              await translateWithTranscriptions(
                transcriptions[srcLang],
                srcLang,
                targetLang,
                subtitlesDir
              );
            } else {
              // Fall back to translating the SRT file directly
              await translateSubtitles(
                srcSrtPath,
                srcLang,
                targetLang,
                subtitlesDir
              );
            }
          } catch (error) {
            console.error(
              `Failed to translate from ${srcLang} to ${targetLang}:`,
              error
            );
            await updateJobStatus(jobId, {
              completed: false,
              message: `Error translating from ${srcLang} to ${targetLang}. Continuing with other translations...`,
            });
          }
        }
      }
    }

    // Update job status to completed
    await updateJobStatus(jobId, {
      completed: true,
      message: "All subtitles generated successfully!",
      failedLanguages: failedLanguages.length > 0 ? failedLanguages : undefined,
    });
  } catch (error) {
    console.error(`Error processing video for job ${jobId}:`, error);

    // Update job status to failed
    await updateJobStatus(jobId, {
      completed: false,
      error: true,
      message: `Error: ${error.message}`,
    });
  } finally {
    // Optional: Clean up temporary files except the subtitle output
    // If you want to implement cleanup, add code here
  }
}

/**
 * Update the job status file
 */
async function updateJobStatus(jobId, status) {
  const statusFilePath = join(process.cwd(), "tmp", jobId, "status.json");
  await writeFile(statusFilePath, JSON.stringify(status));
}

/**
 * Extract audio from video using ffmpeg
 */
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vn", // Disable video
      "-acodec",
      "pcm_s16le", // Audio codec
      "-ar",
      "16000", // Sample rate (16kHz is recommended for speech recognition)
      "-ac",
      "1", // Mono audio
      "-f",
      "wav", // Force WAV format
      "-y", // Overwrite output file if it exists
      audioPath,
    ]);

    let ffmpegLogs = "";

    ffmpeg.stdout.on("data", (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      ffmpegLogs += data.toString();
      console.log(`ffmpeg stderr: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `ffmpeg process exited with code ${code}. Logs: ${ffmpegLogs}`
          )
        );
      }
    });

    ffmpeg.on("error", (err) => {
      reject(new Error(`ffmpeg process error: ${err.message}`));
    });
  });
}

/**
 * Transcribe audio using Deepgram
 */
async function transcribeAudio(audioPath, language) {
  try {
    const model = LANGUAGE_MODELS[language];
    const languageCode = LANGUAGE_CODES[language];

    console.log(
      `Transcribing ${audioPath} with model ${model} and language ${languageCode}`
    );

    // Ensure file is readable
    const audioFile = await readFile(audioPath);

    // Transcribe the audio file with buffer
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioFile,
      {
        model: model,
        language: languageCode,
        smart_format: true,
        punctuate: true,
        utterances: true,
        diarize: true,
      }
    );

    if (error) {
      console.error("Deepgram error details:", error);
      throw new Error(`Deepgram transcription error: ${JSON.stringify(error)}`);
    }

    if (!result || !result.results || !result.results.channels) {
      throw new Error(
        "Invalid response from Deepgram: missing results structure"
      );
    }

    return result;
  } catch (error) {
    console.error(`Error transcribing audio for ${language}:`, error);
    throw error;
  }
}

/**
 * Generate subtitles using Deepgram result
 */
async function generateSubtitles(result, language, outputDir) {
  try {
    let srtContent;

    // Use Netflix formatting for English and Malay
    if (NETFLIX_FORMAT_LANGUAGES.includes(language)) {
      console.log(`Generating Netflix-style subtitles for ${language}`);
      srtContent = netflixSrt(result, language);
    } else {
      // Use standard formatting for other languages
      console.log(`Generating standard subtitles for ${language}`);
      srtContent = srt(result);
    }

    if (!srtContent || srtContent.trim() === "") {
      throw new Error("Generated SRT content is empty");
    }

    // Save SRT file
    const srtPath = join(outputDir, `${language}.srt`);
    await writeFile(srtPath, srtContent);

    return srtPath;
  } catch (error) {
    console.error(`Error generating subtitles for ${language}:`, error);
    throw error;
  }
}

/**
 * Translate subtitles from one language to another using transcriptions
 */
async function translateWithTranscriptions(
  srcTranscription,
  srcLang,
  targetLang,
  outputDir
) {
  try {
    // Generate SRT content with appropriate formatting for target language
    let srtContent;

    if (NETFLIX_FORMAT_LANGUAGES.includes(targetLang)) {
      // Use Netflix formatting for the target language
      srtContent = netflixSrt(srcTranscription, targetLang);
    } else {
      // Use standard formatting for other languages
      srtContent = srt(srcTranscription);
    }

    // Parse SRT content to get structure
    const srtEntries = parseSRT(srtContent);

    // Translate each text part
    const translatedEntries = await Promise.all(
      srtEntries.map(async (entry) => {
        try {
          // Translate text using translation API
          const translatedText = await translateText(
            entry.text,
            srcLang,
            targetLang
          );

          return {
            ...entry,
            text: translatedText,
          };
        } catch (error) {
          console.error(`Error translating entry: ${entry.text}`, error);
          // Return original text if translation fails
          return entry;
        }
      })
    );

    // Rebuild SRT content with translated text
    const translatedSrtContent = buildSRT(translatedEntries);

    // Save translated SRT file
    const translatedSrtPath = join(
      outputDir,
      `${srcLang}_to_${targetLang}.srt`
    );
    await writeFile(translatedSrtPath, translatedSrtContent);

    return translatedSrtPath;
  } catch (error) {
    console.error(`Error translating from ${srcLang} to ${targetLang}:`, error);
    throw error;
  }
}

/**
 * Translate subtitles from one language to another using SRT file
 */
async function translateSubtitles(srcSrtPath, srcLang, targetLang, outputDir) {
  try {
    // Read source SRT content
    const srcSrtContent = await readFile(srcSrtPath, "utf-8");

    // Parse SRT file to get only the text parts
    const srtEntries = parseSRT(srcSrtContent);

    // Translate each text part
    const translatedEntries = await Promise.all(
      srtEntries.map(async (entry) => {
        try {
          // Translate text using translation API
          const translatedText = await translateText(
            entry.text,
            srcLang,
            targetLang
          );

          return {
            ...entry,
            text: translatedText,
          };
        } catch (error) {
          console.error(`Error translating entry: ${entry.text}`, error);
          // Return original text if translation fails
          return entry;
        }
      })
    );

    // Rebuild SRT content with translated text
    const translatedSrtContent = buildSRT(translatedEntries);

    // Save translated SRT file
    const translatedSrtPath = join(
      outputDir,
      `${srcLang}_to_${targetLang}.srt`
    );
    await writeFile(translatedSrtPath, translatedSrtContent);

    return translatedSrtPath;
  } catch (error) {
    console.error(
      `Error translating subtitles from ${srcLang} to ${targetLang}:`,
      error
    );
    throw error;
  }
}

/**
 * Parse SRT content into structured entries
 */
function parseSRT(srtContent) {
  const entries = [];
  const lines = srtContent.split("\n");

  let i = 0;
  while (i < lines.length) {
    // Skip empty lines
    if (!lines[i] || !lines[i].trim()) {
      i++;
      continue;
    }

    // Parse entry number
    const entryNumber = parseInt(lines[i].trim(), 10);
    if (isNaN(entryNumber)) {
      i++;
      continue;
    }
    i++;

    // Skip if we've reached the end
    if (i >= lines.length) break;

    // Parse timestamps
    const timestamps = lines[i];
    i++;

    // Skip if we've reached the end
    if (i >= lines.length) break;

    // Parse text (may span multiple lines)
    let text = "";
    while (i < lines.length && lines[i].trim() !== "") {
      text += lines[i] + "\n";
      i++;
    }

    // Add entry to results
    entries.push({
      number: entryNumber,
      timestamps,
      text: text.trim(),
    });

    // Skip trailing empty line
    i++;
  }

  return entries;
}

/**
 * Build SRT content from structured entries
 */
function buildSRT(entries) {
  return entries
    .map((entry) => {
      return `${entry.number}\n${entry.timestamps}\n${entry.text}\n`;
    })
    .join("\n");
}

/**
 * Translate text using translation API
 */
async function translateText(text, sourceLang, targetLang) {
  try {
    // In a production environment, replace with actual translation API
    // This is a mock implementation

    // Simulate API call
    /*
    const response = await axios.post(TRANSLATION_API_URL, {
      text,
      source: LANGUAGE_CODES[sourceLang],
      target: LANGUAGE_CODES[targetLang]
    });
    
    return response.data.translatedText;
    */

    // Since we don't have an actual translation API in this example,
    // we'll simulate translation by prepending the target language
    // In production, use a proper translation service like Google Translate, DeepL, etc.
    return `[${targetLang}] ${text}`;
  } catch (error) {
    console.error("Translation error:", error);
    // Return original text if translation fails
    return text;
  }
}
