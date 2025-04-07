// File: lib/netflixFormatter.js
import { DeepgramConverter, chunkArray } from "@deepgram/captions";

/**
 * NetflixSubtitleFormatter - Custom formatter implementing Netflix subtitling guidelines
 *
 * Netflix guidelines include:
 * - Maximum of 42 characters per line
 * - Maximum of 2 lines per subtitle
 * - Duration of 5-7 seconds for a full two-line subtitle
 * - Minimum duration of 20 frames (0.8 seconds at 25fps)
 * - Proper line breaks for readability
 * - Appropriate punctuation
 */
export class NetflixSubtitleFormatter extends DeepgramConverter {
  constructor(transcriptionData, language = "english") {
    super(transcriptionData);
    this.language = language;
    this.maxCharsPerLine = 42; // Netflix standard
    this.minDuration = 0.8; // Minimum duration in seconds
    this.maxDuration = 7; // Maximum duration in seconds
    this.maxLinesPerSubtitle = 2; // Netflix standard
  }

  /**
   * Override the getLines method to implement Netflix standards
   */
  getLines(lineLength = 7) {
    // For Asian languages like Mandarin, use fewer words per line
    if (
      ["mandarin", "chinese", "zh", "zh-CN"].includes(
        this.language.toLowerCase()
      )
    ) {
      lineLength = 5;
    }

    // Get the base lines from the Deepgram converter
    const baseLines = super.getLines(lineLength);

    // Apply Netflix formatting standards
    const netflixLines = this.applyNetflixStandards(baseLines);

    return netflixLines;
  }

  /**
   * Apply Netflix standards to line breaks and timing
   */
  applyNetflixStandards(lines) {
    const netflixLines = [];

    for (const line of lines) {
      if (!line || line.length === 0) continue;

      // Ensure minimum duration
      const start = line[0].start;
      const end = line[line.length - 1].end;
      const duration = end - start;

      if (duration < this.minDuration) {
        // Extend to minimum duration if too short
        line[line.length - 1].end = start + this.minDuration;
      } else if (duration > this.maxDuration) {
        // Split into multiple captions if too long
        const segments = this.splitByDuration(line, this.maxDuration);
        netflixLines.push(...segments);
        continue;
      }

      // Check character count and split if needed
      const textContent = line
        .map((word) => word.punctuated_word || word.word)
        .join(" ");

      if (textContent.length <= this.maxCharsPerLine) {
        // Line is within character limit
        netflixLines.push(line);
      } else {
        // Split line to respect character limit
        const splitLines = this.splitByCharCount(line, this.maxCharsPerLine);
        netflixLines.push(...splitLines);
      }
    }

    return netflixLines;
  }

  /**
   * Split a line of words into multiple lines based on character count
   */
  splitByCharCount(line, maxChars) {
    const result = [];
    let currentLine = [];
    let currentLength = 0;

    for (const word of line) {
      const wordText = (word.punctuated_word || word.word) + " ";

      if (
        currentLength + wordText.length > maxChars &&
        currentLine.length > 0
      ) {
        // Start a new line
        result.push(currentLine);
        currentLine = [word];
        currentLength = wordText.length;
      } else {
        // Add to current line
        currentLine.push(word);
        currentLength += wordText.length;
      }
    }

    if (currentLine.length > 0) {
      result.push(currentLine);
    }

    return result;
  }

  /**
   * Split a line of words into multiple lines based on duration
   */
  splitByDuration(line, maxDuration) {
    const result = [];
    let currentLine = [];
    let lineStart = line[0].start;

    for (const word of line) {
      if (word.end - lineStart > maxDuration && currentLine.length > 0) {
        // Start a new line when we exceed max duration
        result.push(currentLine);
        currentLine = [word];
        lineStart = word.start;
      } else {
        // Add to current line
        currentLine.push(word);
      }
    }

    if (currentLine.length > 0) {
      result.push(currentLine);
    }

    return result;
  }
}

/**
 * Generate SRT content according to Netflix standards
 */
export function netflixSrt(transcriptionData, language = "english") {
  // Create Netflix formatter
  const formatter = new NetflixSubtitleFormatter(transcriptionData, language);

  // Build SRT content
  let srtContent = "";
  const lines = formatter.getLines();

  lines.forEach((line, index) => {
    if (line.length === 0) return;

    // Add caption number
    srtContent += index + 1 + "\n";

    // Convert timestamps to SRT format (00:00:00,000)
    const start = formatTimestamp(line[0].start);
    const end = formatTimestamp(line[line.length - 1].end);
    srtContent += `${start} --> ${end}\n`;

    // Add caption text
    const text = line
      .map((word) => word.punctuated_word || word.word)
      .join(" ");
    srtContent += text + "\n\n";
  });

  return srtContent;
}

/**
 * Format timestamp to SRT format (00:00:00,000)
 */
function formatTimestamp(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);

  // Get hours, minutes, seconds
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const secs = date.getUTCSeconds().toString().padStart(2, "0");

  // Get milliseconds and format to 3 digits
  const ms = Math.floor((seconds % 1) * 1000)
    .toString()
    .padStart(3, "0");

  return `${hours}:${minutes}:${secs},${ms}`;
}
