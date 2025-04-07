"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export default function useDeepgram() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // Function to transcribe video
  const transcribeVideo = useCallback(async (mediaFile, language = "en") => {
    console.log("Starting media transcription process");
    const fileSize = mediaFile.size;
    const isLargeFile = fileSize > 100 * 1024 * 1024; // Over 100MB

    try {
      // Reset state
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      setStatus("initializing");
      setMessage(
        isLargeFile
          ? "Preparing large file for transcription..."
          : "Preparing file for transcription..."
      );

      // Generate a unique job ID
      const newJobId = uuidv4();
      setJobId(newJobId);
      console.log(`Generated Job ID: ${newJobId}`);

      // Create FormData with the media file
      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append("language", language);
      formData.append("jobId", newJobId);

      // Start progress tracking
      const progressTracker = startProgressTracking(newJobId, isLargeFile);

      // Initial progress update
      setProgress(5);
      setStatus("uploading");
      setMessage(
        isLargeFile
          ? "Uploading large file (this may take a while)..."
          : "Uploading file..."
      );

      // Call the transcription API
      console.log(
        `Sending transcription request to API for ${fileSize} bytes file`
      );
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      // Check response
      if (!response.ok) {
        clearInterval(progressTracker);
        const errorData = await response.json();
        console.error("Transcription API error:", errorData);
        throw new Error(
          errorData.error || "Transcription failed with an unknown error"
        );
      }

      // Parse response
      const data = await response.json();
      console.log("Transcription response received:", data);

      // Set the job ID from the response if available
      if (data.jobId) {
        setJobId(data.jobId);
      }

      // For large files, continue tracking progress
      // Otherwise, clear the interval
      if (!isLargeFile) {
        clearInterval(progressTracker);
      }

      // Validate response
      if (!data.subtitles || data.subtitles.length === 0) {
        setError("No subtitles were generated");
        throw new Error("No subtitles were generated");
      }

      // Check if we need to wait for the transcription to complete
      if (data.status === "processing" && data.jobId) {
        // Continue tracking progress until completion
        return await waitForCompletion(data.jobId, progressTracker);
      } else {
        // Update progress to 100%
        setProgress(100);
        setStatus("completed");
        setMessage("Transcription completed successfully");
        setIsProcessing(false);
        return data;
      }
    } catch (err) {
      console.error("Transcription error:", err);

      // Detailed error handling
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during transcription";

      setError(errorMessage);
      setStatus("failed");
      setMessage(`Transcription failed: ${errorMessage}`);
      setIsProcessing(false);

      // Re-throw to allow caller to handle
      throw err;
    }
  }, []);

  // Function to wait for job completion
  const waitForCompletion = async (jobId, progressTracker) => {
    console.log(`Waiting for completion of job ${jobId}`);

    try {
      // Continue checking until job is completed or failed
      let isJobCompleted = false;
      let result = null;

      while (!isJobCompleted) {
        // Wait 2 seconds between checks
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check job status
        const response = await fetch(`/api/progress?jobId=${jobId}`);

        if (response.ok) {
          const data = await response.json();

          if (data.status === "completed") {
            clearInterval(progressTracker);
            setProgress(100);
            setStatus("completed");
            setMessage("Transcription completed successfully");
            isJobCompleted = true;

            // Fetch the result
            const resultResponse = await fetch(
              `/api/transcribe/result?jobId=${jobId}`
            );
            if (resultResponse.ok) {
              result = await resultResponse.json();
            } else {
              throw new Error("Failed to fetch transcription result");
            }
          } else if (data.status === "failed") {
            clearInterval(progressTracker);
            throw new Error(data.message || "Transcription failed");
          }

          // Update progress
          setProgress(data.progress || 0);
          setStatus(data.status || "processing");
          setMessage(data.message || "Processing your media file...");
        } else {
          console.warn("Failed to check job status");
        }
      }

      setIsProcessing(false);
      return result;
    } catch (error) {
      clearInterval(progressTracker);
      setError(error.message);
      setStatus("failed");
      setMessage(`Transcription failed: ${error.message}`);
      setIsProcessing(false);
      throw error;
    }
  };

  // Function to start tracking progress
  const startProgressTracking = (jobId, isLargeFile) => {
    console.log(`Starting progress tracking for job ${jobId}`);
    let currentProgress = 0;
    let errorCount = 0;
    const MAX_ERROR_RETRIES = 5;

    // For large files, we'll check progress more frequently
    const checkInterval = isLargeFile ? 1000 : 2000;

    // Different progress simulation rates for different file sizes
    const progressIncrement = isLargeFile ? 2 : 5;
    const maxSimulatedProgress = isLargeFile ? 90 : 95;

    const progressInterval = setInterval(async () => {
      try {
        console.log(`Fetching progress for job ${jobId}`);
        const response = await fetch(`/api/progress?jobId=${jobId}`);

        if (response.ok) {
          const progressData = await response.json();
          console.log("Progress data:", progressData);

          // Update progress
          if (progressData.progress !== undefined) {
            setProgress(progressData.progress);
            currentProgress = progressData.progress;
          } else {
            // Simulate progress if not provided
            currentProgress += progressIncrement;
            setProgress(Math.min(currentProgress, maxSimulatedProgress));
          }

          // Update status and message
          if (progressData.status) {
            setStatus(progressData.status);
          }

          if (progressData.message) {
            setMessage(progressData.message);
          }

          // Check job status
          if (
            progressData.status === "completed" ||
            progressData.status === "failed"
          ) {
            clearInterval(progressInterval);

            if (progressData.status === "failed") {
              console.error("Job failed:", progressData.message);
              setError(progressData.message || "Transcription failed");
            }
          }

          // Reset error count on successful fetch
          errorCount = 0;
        } else {
          // Handle API errors
          errorCount++;
          console.warn(`Progress fetch failed (attempt ${errorCount})`);

          // Simulate progress
          currentProgress += progressIncrement / 2; // Slower progress during errors
          setProgress(Math.min(currentProgress, maxSimulatedProgress));

          // Stop trying after max retries
          if (errorCount >= MAX_ERROR_RETRIES) {
            clearInterval(progressInterval);
            setError("Failed to track transcription progress");
          }
        }
      } catch (err) {
        console.error("Progress tracking error:", err);

        // Increment error count
        errorCount++;

        // Simulate progress
        currentProgress += progressIncrement / 2; // Slower progress during errors
        setProgress(Math.min(currentProgress, maxSimulatedProgress));

        // Stop trying after max retries
        if (errorCount >= MAX_ERROR_RETRIES) {
          clearInterval(progressInterval);
          setError("Failed to track transcription progress");
        }
      }
    }, checkInterval);

    return progressInterval;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jobId) {
        console.log(`Cleaning up job ${jobId}`);
        // In a real implementation, you might want to cancel the job on the server
      }
    };
  }, [jobId]);

  return {
    transcribeVideo,
    isProcessing,
    progress,
    error,
    status,
    message,
    jobId,
  };
}
