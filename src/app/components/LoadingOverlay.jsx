// File: app/components/LoadingOverlay.jsx
"use client";

export default function LoadingOverlay({
  progress = 0,
  message = "Processing...",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            {/* Spinner background */}
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>

            {/* Spinner progress */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
            >
              <circle
                className="text-pink-600 transition-all duration-300"
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 3}px 300px`}
                transform="rotate(-90 50 50)"
              />
            </svg>

            {/* Progress text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold">{Math.round(progress)}%</span>
            </div>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
            {message}
          </h3>

          <p className="text-sm text-gray-500 text-center">
            This may take a few minutes for large files.
          </p>

          {progress >= 75 && (
            <div className="mt-4 text-sm text-green-600 font-medium animate-pulse">
              Almost there...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
