// File: hooks/useDeepgram.js
"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function useDeepgram() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Function to transcribe video
  const transcribeVideo = async (videoFile, language = "en") => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      // Generate a unique job ID
      const newJobId = uuidv4();
      setJobId(newJobId);

      // Create FormData with the video file
      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("language", language);
      formData.append("jobId", newJobId);

      // Start progress tracking
      const progressTracker = startProgressTracking(newJobId);

      // Call the transcription API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      // Clear progress tracker
      clearInterval(progressTracker);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      // Update progress to 100%
      setProgress(100);

      // Parse response
      const data = await response.json();

      setIsProcessing(false);
      return data;
    } catch (err) {
      setError(err.message || "Error transcribing video");
      setIsProcessing(false);
      throw err;
    }
  };

  // Function to start tracking progress
  const startProgressTracking = (jobId) => {
    // Simulate progress updates
    // In a real implementation, this would poll an API endpoint
    let currentProgress = 0;

    const progressInterval = setInterval(async () => {
      try {
        // Fetch real progress from the API
        const response = await fetch(`/api/progress?jobId=${jobId}`);

        if (response.ok) {
          const progressData = await response.json();
          setProgress(progressData.progress || Math.min(currentProgress, 95));

          // If job is complete, clear interval
          if (
            progressData.status === "completed" ||
            progressData.status === "failed"
          ) {
            clearInterval(progressInterval);

            if (progressData.status === "failed") {
              setError(progressData.message || "Transcription failed");
            }
          }
        } else {
          // Fallback to simulated progress if API fails
          currentProgress += 5;
          setProgress(Math.min(currentProgress, 95));
        }
      } catch (err) {
        console.error("Error tracking progress:", err);
        // Fallback to simulated progress
        currentProgress += 5;
        setProgress(Math.min(currentProgress, 95));
      }
    }, 1000);

    return progressInterval;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jobId) {
        // Cancel any in-progress jobs if component unmounts
        // This would require a backend endpoint in a real implementation
      }
    };
  }, [jobId]);

  return {
    transcribeVideo,
    isProcessing,
    progress,
    error,
  };
}
