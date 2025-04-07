// File: components/ProcessingStatus.js
import { useState } from "react";

export default function ProcessingStatus({ status, subtitleFiles }) {
  const [expandedLanguage, setExpandedLanguage] = useState(null);

  // Handle case when there was an error
  const hasError = status && status.error;

  return (
    <div className="w-full">
      <div className="border rounded-lg p-6">
        {!subtitleFiles ? (
          <>
            <div className="flex items-center justify-center mb-4">
              {hasError ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              )}
            </div>
            <h3 className="text-lg font-medium text-center mb-2">
              {hasError ? "Processing Error" : "Processing Your Video"}
            </h3>
            <p className="text-center text-gray-500">{status}</p>
            {!hasError && (
              <p className="text-center mt-4 text-sm text-gray-400">
                This may take several minutes depending on the size of your
                video.
              </p>
            )}
            {hasError && (
              <button
                onClick={() => window.location.reload()}
                className="w-full mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Try Again
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-center mb-6">
              Subtitles Generated Successfully!
            </h3>

            {Object.keys(subtitleFiles).length === 0 ? (
              <p className="text-center text-gray-500 mb-6">
                No subtitles were generated. There may have been an issue with
                the audio processing.
              </p>
            ) : (
              <div className="space-y-4">
                <h4 className="font-medium">Download Subtitles:</h4>

                {Object.entries(subtitleFiles).map(([language, files]) => (
                  <div key={language} className="border rounded p-3">
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() =>
                        setExpandedLanguage(
                          expandedLanguage === language ? null : language
                        )
                      }
                    >
                      <h5 className="font-medium capitalize">
                        {language} Source Subtitles
                      </h5>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${
                          expandedLanguage === language
                            ? "transform rotate-180"
                            : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                    {expandedLanguage === language && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {files.original && (
                          <a
                            href={files.original}
                            download={`${language}.srt`}
                            className="flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition"
                          >
                            <span className="font-medium">Original</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          </a>
                        )}

                        {Object.entries(files)
                          .filter(([key]) => key !== "original")
                          .map(([targetLang, url]) => (
                            <a
                              key={targetLang}
                              href={url}
                              download={`${language}_to_${targetLang}.srt`}
                              className="flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition"
                            >
                              <span className="capitalize">
                                Translated to {targetLang}
                              </span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Process Another Video
            </button>
          </>
        )}
      </div>

      {status &&
        status.failedLanguages &&
        status.failedLanguages.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 font-medium mb-2">
              Some languages failed to process:
            </p>
            <ul className="list-disc list-inside text-yellow-600">
              {status.failedLanguages.map((lang) => (
                <li key={lang} className="capitalize">
                  {lang}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-yellow-600">
              The application will still generate translations between the
              languages that processed successfully.
            </p>
          </div>
        )}
    </div>
  );
}
