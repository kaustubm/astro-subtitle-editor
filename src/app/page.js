// File: app/page.js
"use client";

import { useState, useEffect } from "react";
import VideoUploader from "@/app/components/VideoUploader";
import ProcessingStatus from "@/app/components/ProcessingStatus";

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [subtitleFiles, setSubtitleFiles] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [jobId, setJobId] = useState(null);

  // Poll for status updates if we have a jobId
  useEffect(() => {
    let statusInterval;

    if (jobId) {
      statusInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/status/${jobId}`);

          if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${statusResponse.status}`);
          }

          const status = await statusResponse.json();

          setProcessingStatus(status.message);

          if (status.completed) {
            clearInterval(statusInterval);
            setSubtitleFiles(status.subtitleFiles);
          } else if (status.error) {
            clearInterval(statusInterval);
          }
        } catch (error) {
          console.error("Error checking job status:", error);
          setProcessingStatus(`Error checking status: ${error.message}`);
        }
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [jobId]);

  const handleUpload = async (file) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setProcessingStatus("Uploading video...");
      setUploadError(null);

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("video", file);

      // Use XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest();

      // Create a promise to handle the XHR response
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open("POST", "/api/upload", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round(
              (event.loaded / event.total) * 100
            );
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Invalid server response"));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(
                new Error(
                  errorResponse.error ||
                    `Upload failed with status ${xhr.status}`
                )
              );
            } catch (error) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.send(formData);
      });

      const response = await uploadPromise;
      setIsUploading(false);
      setJobId(response.jobId);
      setProcessingStatus("Processing video...");
    } catch (error) {
      console.error("Error uploading video:", error);
      setIsUploading(false);
      setUploadError(error.message);
      setProcessingStatus({
        error: true,
        message: `Error: ${error.message}`,
      });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-8">
        Multilingual Subtitle Generator
      </h1>

      <div className="w-full max-w-2xl">
        {!processingStatus && !uploadError ? (
          <VideoUploader
            onUpload={handleUpload}
            isUploading={isUploading}
            progress={uploadProgress}
          />
        ) : (
          <ProcessingStatus
            status={processingStatus}
            subtitleFiles={subtitleFiles}
          />
        )}

        {uploadError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{uploadError}</p>
            <button
              onClick={() => {
                setUploadError(null);
                setProcessingStatus(null);
              }}
              className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
