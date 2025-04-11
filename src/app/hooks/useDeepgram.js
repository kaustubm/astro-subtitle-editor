"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

export default function useDeepgram() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const clearProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const transcribeVideo = useCallback(async (mediaFile, language = "en") => {
    if (!mediaFile) {
      setError("No media file provided");
      throw new Error("No media file provided");
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setStatus("initializing");
    setJobId(null);

    const newJobId = uuidv4();
    setJobId(newJobId);

    try {
      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append("language", language);
      formData.append("jobId", newJobId);

      startProgressTracking(newJobId);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Transcription failed with an unknown error"
        );
      }

      const data = await response.json();

      if (data.status === "processing") {
        return await waitForCompletion(data.jobId || newJobId);
      }

      clearProgressTracking();
      setProgress(100);
      setStatus("completed");
      setMessage("Transcription completed successfully");
      return data;
    } catch (err) {
      clearProgressTracking();
      const errorMessage = err.message || "Transcription failed";
      setError(errorMessage);
      setStatus("failed");
      setMessage(`Error: ${errorMessage}`);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const waitForCompletion = async (jobId) => {
    try {
      let attempts = 0;
      const maxAttempts = 60;
      const delay = 2000;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const response = await fetch(`/api/progress?jobId=${jobId}`);
        if (!response.ok) continue;

        const data = await response.json();

        setProgress(data.progress || 0);
        setStatus(data.status || "processing");
        setMessage(data.message || "Processing...");

        if (data.status === "completed") {
          const resultResponse = await fetch(
            `/api/transcribe/result?jobId=${jobId}`
          );
          if (resultResponse.ok) {
            return await resultResponse.json();
          }
        } else if (data.status === "failed") {
          throw new Error(data.message || "Transcription failed");
        }
      }

      throw new Error("Transcription timed out");
    } catch (error) {
      setError(error.message);
      setStatus("failed");
      throw error;
    }
  };

  const startProgressTracking = (jobId) => {
    clearProgressTracking();

    progressIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress?jobId=${jobId}`);
        if (!response.ok) return;

        const data = await response.json();
        setProgress(data.progress || 0);
        setStatus(data.status || "processing");
        setMessage(data.message || "Processing...");

        if (data.status === "completed" || data.status === "failed") {
          clearProgressTracking();
        }
      } catch (error) {
        console.error("Progress tracking error:", error);
      }
    }, 2000);
  };

  return {
    transcribeVideo,
    isProcessing,
    progress,
    error,
    status,
    message,
    jobId,
    reset: () => {
      setProgress(0);
      setError(null);
      setStatus("idle");
      setMessage("");
      setJobId(null);
    },
  };
}
