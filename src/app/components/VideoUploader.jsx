// File: components/VideoUploader.js
import { useState, useRef, useEffect } from "react";

export default function VideoUploader({ onUpload, isUploading, progress }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Reset error message when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      setErrorMessage(null);
    }
  }, [selectedFile]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    // Check if it's a video file
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please upload a video file");
      return false;
    }

    // Check file size (3GB limit)
    const maxSize = 3 * 1024 * 1024 * 1024; // 3GB in bytes
    if (file.size > maxSize) {
      setErrorMessage(
        `File size exceeds the 3GB limit (${(
          file.size /
          (1024 * 1024 * 1024)
        ).toFixed(2)}GB)`
      );
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
  };

  return (
    <div className="w-full">
      <form
        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-64 ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : errorMessage
            ? "border-red-300"
            : "border-gray-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onSubmit={handleSubmit}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="video-input"
          accept="video/*"
          onChange={handleChange}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-12 w-12 mb-4 ${
                errorMessage ? "text-red-400" : "text-gray-400"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p
              className={`mb-2 text-sm ${
                errorMessage ? "text-red-500 font-medium" : "text-gray-500"
              }`}
            >
              {errorMessage || (
                <>
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-500">Video files up to 3GB</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 px-4 py-2 rounded hover:bg-opacity-90 transition ${
                errorMessage
                  ? "bg-red-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              Select Video
            </button>
          </>
        ) : (
          <div className="w-full">
            <p className="text-center mb-4 font-medium">{selectedFile.name}</p>
            <p className="text-sm text-center mb-2 text-gray-500">
              Size: {formatFileSize(selectedFile.size)}
            </p>
            <p className="text-sm text-center mb-4 text-gray-500">
              Type: {selectedFile.type}
            </p>

            {isUploading ? (
              <div className="w-full mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center mt-2 text-sm">{progress}% Uploaded</p>
                <p className="text-center mt-1 text-xs text-gray-500">
                  Please don't close this window while uploading
                </p>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Remove
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Process Video
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      <div className="mt-6 text-sm text-gray-500">
        <p className="font-semibold">Supported languages:</p>
        <ul className="list-disc list-inside mt-1">
          <li>English (Nova-3 model)</li>
          <li>Malay (Nova-2 model)</li>
          <li>Mandarin (Nova-2 model)</li>
          <li>Tamil (Nova-2 model)</li>
        </ul>
        <p className="mt-4">
          Subtitles will be automatically translated to all supported languages.
        </p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-blue-700 font-medium mb-1">
            Tips for best results:
          </p>
          <ul className="list-disc list-inside text-blue-600 text-xs">
            <li>Use videos with clear audio</li>
            <li>Minimize background noise in the video</li>
            <li>
              Processing time depends on video length (a 3-minute video might
              take 1-2 minutes)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
