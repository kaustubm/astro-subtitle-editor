// File: components/UploadPanel.jsx
"use client";

import { useState, useRef } from "react";

export default function UploadPanel({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  // Process the selected file
  const handleFile = (file) => {
    if (file && (isValidVideoFile(file) || isValidAudioFile(file))) {
      setSelectedFile(file);
    } else {
      alert(
        "Please select a valid media file (MP4, MOV, AVI, MKV, MP3, WAV, etc.)"
      );
    }
  };

  // Check if file is a valid video
  const isValidVideoFile = (file) => {
    const validTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ];
    return validTypes.includes(file.type);
  };

  // Check if file is a valid audio
  const isValidAudioFile = (file) => {
    const validTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/m4a",
      "audio/x-m4a",
      "audio/x-wav",
    ];
    return validTypes.includes(file.type);
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get appropriate icon based on file type
  const getFileIcon = () => {
    if (!selectedFile) return null;

    if (isValidVideoFile(selectedFile)) {
      return (
        <svg
          className="h-8 w-8 text-pink-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    } else if (isValidAudioFile(selectedFile)) {
      return (
        <svg
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      );
    }
  };

  // Get file type display text
  const getFileTypeText = () => {
    if (!selectedFile) return "";

    const type = selectedFile.type.split("/")[0];
    const format = selectedFile.type.split("/")[1].toUpperCase();

    return `${type.charAt(0).toUpperCase() + type.slice(1)} · ${format}`;
  };

  // Handle upload button click
  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  // Check if file is large (over 100 MB)
  const isLargeFile = () => {
    if (!selectedFile) return false;
    return selectedFile.size > 100 * 1024 * 1024; // 100 MB
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Upload Your Media
      </h2>

      {/* File Drop Area */}
      <div
        className={`w-full max-w-lg border-2 border-dashed rounded-lg p-12 text-center cursor-pointer mb-6 ${
          isDragging
            ? "border-pink-500 bg-pink-50"
            : "border-gray-300 hover:border-pink-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a"
          onChange={handleFileSelect}
        />

        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <p className="mt-4 text-sm text-gray-600">
          Drag and drop your video or audio file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported formats: MP4, MOV, AVI, MKV, MP3, WAV, and more
        </p>
      </div>

      {/* Selected File Info */}
      {selectedFile && (
        <div className="w-full max-w-lg bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">{getFileIcon()}</div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                {selectedFile.name}
              </h3>
              <div className="mt-1 text-xs text-gray-500">
                {formatFileSize(selectedFile.size)} · {getFileTypeText()}
              </div>
              {isLargeFile() && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <strong>Note:</strong> This is a large file (over 100MB).
                  Transcription may take longer.
                </div>
              )}
              <div className="mt-3 flex">
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={() => setSelectedFile(null)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile}
        className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm ${
          selectedFile
            ? "text-white bg-pink-600 hover:bg-pink-700"
            : "text-gray-500 bg-gray-200 cursor-not-allowed"
        }`}
      >
        <svg
          className="-ml-1 mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        Upload{" "}
        {selectedFile
          ? isValidVideoFile(selectedFile)
            ? "Video"
            : "Audio"
          : "Media"}
      </button>

      <p className="mt-6 text-xs text-gray-500 max-w-md text-center">
        By uploading a file, you agree to our terms of service. We only store
        your media temporarily for processing.
      </p>
    </div>
  );
}
