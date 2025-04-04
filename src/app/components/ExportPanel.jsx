// File: components/ExportPanel.jsx
"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function ExportPanel({
  onExport,
  subtitles,
  videoInfo,
  srtContent,
}) {
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportQuality, setExportQuality] = useState("medium");
  const [selectedSubtitles, setSelectedSubtitles] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportJobId, setExportJobId] = useState(null);
  const [downloadUrls, setDownloadUrls] = useState(null);

  // Export options
  const formats = [
    {
      id: "mp4",
      label: "MP4 with Embedded Subtitles",
      description: "Video with subtitles embedded directly in the file",
    },
    {
      id: "srt",
      label: "SRT Subtitle File",
      description:
        "Text-based subtitle file compatible with most video players",
    },
    {
      id: "vtt",
      label: "WebVTT File",
      description: "Web-optimized subtitle format for online video",
    },
    {
      id: "both",
      label: "Both Video and SRT",
      description: "MP4 video file and separate SRT file",
    },
  ];

  const qualities = [
    {
      id: "high",
      label: "High Quality",
      description: "Best quality, larger file size",
    },
    {
      id: "medium",
      label: "Medium Quality",
      description: "Balanced quality and file size",
    },
    {
      id: "low",
      label: "Low Quality",
      description: "Smaller file size, reduced quality",
    },
  ];

  // Filter subtitles if 'selected' option is chosen
  const getFilteredSrtContent = () => {
    if (selectedSubtitles === "all" || !subtitles || subtitles.length === 0) {
      return srtContent;
    }

    // In a real app, this would filter based on selected subtitles
    // For this demo, we'll just return the full SRT content
    return srtContent;
  };

  // Handle export button click
  const handleExportClick = async () => {
    try {
      // For integrated backend exports
      if (typeof onExport === "function") {
        // Use the callback provided by the parent component
        onExport(exportFormat, exportQuality, selectedSubtitles);
        return;
      }

      // Direct API call implementation
      setIsExporting(true);
      setExportProgress(0);

      // Generate a job ID for tracking progress
      const jobId = uuidv4();
      setExportJobId(jobId);

      // Create FormData with necessary files and parameters
      const formData = new FormData();
      formData.append("video", videoInfo.file);
      formData.append("srt", getFilteredSrtContent());
      formData.append("format", exportFormat);
      formData.append("quality", exportQuality);
      formData.append("jobId", jobId);

      // Start progress tracking
      const progressTracker = startProgressTracking(jobId);

      // Call the export API
      const response = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Parse response
      const data = await response.json();

      // Set download URLs
      if (data.outputPath) {
        if (exportFormat === "both") {
          setDownloadUrls({
            video: `/api/export?path=${encodeURIComponent(data.outputPath)}`,
            srt: `/api/export?path=${encodeURIComponent(data.srtPath)}`,
          });
        } else {
          setDownloadUrls({
            [exportFormat]: `/api/export?path=${encodeURIComponent(
              data.outputPath
            )}`,
          });
        }
      }

      // Continue checking progress until complete
      await waitForCompletion(jobId);

      // Clear progress tracker
      clearInterval(progressTracker);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Error during export: ${error.message}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  // Function to start tracking progress
  const startProgressTracking = (jobId) => {
    const progressInterval = setInterval(async () => {
      try {
        // Fetch progress from the API
        const response = await fetch(`/api/progress?jobId=${jobId}`);

        if (response.ok) {
          const progressData = await response.json();
          setExportProgress(progressData.progress || 0);

          // If job is failed, clear interval
          if (progressData.status === "failed") {
            clearInterval(progressInterval);
            alert(progressData.message || "Export failed");
          }
        }
      } catch (err) {
        console.error("Error tracking progress:", err);
      }
    }, 1000);

    return progressInterval;
  };

  // Function to wait for completion
  const waitForCompletion = async (jobId) => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/progress?jobId=${jobId}`);

          if (response.ok) {
            const progressData = await response.json();

            if (
              progressData.status === "completed" ||
              progressData.status === "failed"
            ) {
              clearInterval(checkInterval);
              resolve();
            }
          }
        } catch (err) {
          console.error("Error checking completion:", err);
        }
      }, 2000);
    });
  };

  // Calculate estimated file size
  const calculateEstimatedSize = () => {
    if (exportFormat === "srt" || exportFormat === "vtt") {
      return "< 1 MB";
    }

    if (!videoInfo) return "Unknown";

    // Base size estimation on original file
    const baseSizeMB = videoInfo.size / (1024 * 1024);

    // Quality multiplier
    const qualityMultiplier =
      exportQuality === "high" ? 1.2 : exportQuality === "medium" ? 0.8 : 0.5;

    return `~${Math.round(baseSizeMB * qualityMultiplier)} MB`;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-8 sm:p-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Export Your Project
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Choose your preferred format and quality settings
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="text-base font-medium text-gray-900">
              Export Format
            </label>
            <p className="text-sm text-gray-500">
              Select how you want to export your subtitles
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {formats.map((format) => (
                <div
                  key={format.id}
                  className={`relative rounded-lg border p-4 flex cursor-pointer focus:outline-none ${
                    exportFormat === format.id
                      ? "bg-pink-50 border-pink-500"
                      : "border-gray-300 hover:border-pink-300"
                  }`}
                  onClick={() => setExportFormat(format.id)}
                >
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="export-format"
                      className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                      checked={exportFormat === format.id}
                      onChange={() => setExportFormat(format.id)}
                    />
                  </div>
                  <div className="ml-3 flex flex-col">
                    <span
                      className={`block text-sm font-medium ${
                        exportFormat === format.id
                          ? "text-pink-900"
                          : "text-gray-900"
                      }`}
                    >
                      {format.label}
                    </span>
                    <span
                      className={`block text-xs ${
                        exportFormat === format.id
                          ? "text-pink-700"
                          : "text-gray-500"
                      }`}
                    >
                      {format.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Selection (for video formats) */}
          {(exportFormat === "mp4" || exportFormat === "both") && (
            <div>
              <label className="text-base font-medium text-gray-900">
                Video Quality
              </label>
              <p className="text-sm text-gray-500">
                Select the quality level for your exported video
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {qualities.map((quality) => (
                  <div
                    key={quality.id}
                    className={`relative rounded-lg border p-4 flex cursor-pointer focus:outline-none ${
                      exportQuality === quality.id
                        ? "bg-pink-50 border-pink-500"
                        : "border-gray-300 hover:border-pink-300"
                    }`}
                    onClick={() => setExportQuality(quality.id)}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
                        name="export-quality"
                        className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                        checked={exportQuality === quality.id}
                        onChange={() => setExportQuality(quality.id)}
                      />
                    </div>
                    <div className="ml-3 flex flex-col">
                      <span
                        className={`block text-sm font-medium ${
                          exportQuality === quality.id
                            ? "text-pink-900"
                            : "text-gray-900"
                        }`}
                      >
                        {quality.label}
                      </span>
                      <span
                        className={`block text-xs ${
                          exportQuality === quality.id
                            ? "text-pink-700"
                            : "text-gray-500"
                        }`}
                      >
                        {quality.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtitle Selection */}
          <div>
            <label className="text-base font-medium text-gray-900">
              Subtitle Options
            </label>
            <p className="text-sm text-gray-500">
              Choose which subtitles to include
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center">
                <input
                  id="all-subtitles"
                  name="subtitle-option"
                  type="radio"
                  className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                  checked={selectedSubtitles === "all"}
                  onChange={() => setSelectedSubtitles("all")}
                />
                <label
                  htmlFor="all-subtitles"
                  className="ml-3 block text-sm text-gray-700"
                >
                  All subtitles ({subtitles.length})
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="selected-subtitles"
                  name="subtitle-option"
                  type="radio"
                  className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                  checked={selectedSubtitles === "selected"}
                  onChange={() => setSelectedSubtitles("selected")}
                />
                <label
                  htmlFor="selected-subtitles"
                  className="ml-3 block text-sm text-gray-700"
                >
                  Selected subtitles only
                </label>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Export Summary
            </h3>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Format</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formats.find((f) => f.id === exportFormat)?.label}
                </dd>
              </div>

              {(exportFormat === "mp4" || exportFormat === "both") && (
                <div>
                  <dt className="text-xs text-gray-500">Quality</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {qualities.find((q) => q.id === exportQuality)?.label}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-gray-500">Subtitles</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selectedSubtitles === "all"
                    ? `All (${subtitles.length})`
                    : "Selected only"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500">Estimated Size</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {calculateEstimatedSize()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Progress Bar (when exporting) */}
          {isExporting && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">
                Export Progress: {exportProgress}%
              </label>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-pink-600 h-2.5 rounded-full"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Download Links (when export is complete) */}
          {downloadUrls && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-800 mb-3">
                Export Complete! Your files are ready for download:
              </h3>

              <div className="space-y-3">
                {downloadUrls.video && (
                  <a
                    href={downloadUrls.video}
                    download
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Video
                  </a>
                )}

                {downloadUrls.srt && (
                  <a
                    href={downloadUrls.srt}
                    download
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download SRT Subtitles
                  </a>
                )}

                {downloadUrls.vtt && (
                  <a
                    href={downloadUrls.vtt}
                    download
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg
                      className="mr-2 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download WebVTT Subtitles
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-8 bg-gray-50 border-t border-gray-200 sm:px-10">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <p>Files will be available for download after processing.</p>
          </div>

          <button
            onClick={handleExportClick}
            disabled={isExporting}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm ${
              isExporting
                ? "text-gray-500 bg-gray-200 cursor-not-allowed"
                : "text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            }`}
          >
            {isExporting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Exporting...
              </>
            ) : (
              "Export Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
