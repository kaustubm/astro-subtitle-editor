// File: components/EditorHeader.jsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function EditorHeader({
  currentStep,
  onStepChange,
  projectName,
}) {
  const [isSaving, setIsSaving] = useState(false);

  // Simulate save project
  const handleSave = () => {
    setIsSaving(true);

    // Mock save
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  // Steps in the editing process
  const steps = [
    {
      id: "upload",
      label: "Upload",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      id: "transcribe",
      label: "Transcribe",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
    {
      id: "edit",
      label: "Edit",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      id: "export",
      label: "Export",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
  ];

  // Get step index
  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Project Name */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg
                className="h-8 w-8 text-pink-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="ml-2 text-xl font-semibold">
                Subtitle Editor
              </span>
            </Link>

            {projectName && (
              <>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700 font-medium truncate max-w-xs">
                  {projectName}
                </span>
              </>
            )}
          </div>

          {/* Save Button */}
          <div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
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
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save Project
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li
                  key={step.id}
                  className={`${
                    stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : ""
                  } relative`}
                >
                  {getCurrentStepIndex() > stepIdx ? (
                    // Completed step
                    <div className="flex items-center">
                      <button
                        onClick={() => onStepChange(step.id)}
                        className="group"
                      >
                        <span className="flex items-center">
                          <span className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-pink-600 rounded-full group-hover:bg-pink-800">
                            <svg
                              className="h-6 w-6 text-white"
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
                          </span>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {step.label}
                          </span>
                        </span>
                      </button>

                      {stepIdx !== steps.length - 1 && (
                        <div className="absolute top-5 right-0 h-0.5 w-full max-w-20 bg-pink-600"></div>
                      )}
                    </div>
                  ) : currentStep === step.id ? (
                    // Current step
                    <div className="flex items-center" aria-current="step">
                      <span className="flex items-center">
                        <span className="flex-shrink-0 h-10 w-10 flex items-center justify-center border-2 border-pink-600 rounded-full">
                          <span className="text-pink-600">{step.icon}</span>
                        </span>
                        <span className="ml-3 text-sm font-medium text-pink-600">
                          {step.label}
                        </span>
                      </span>

                      {stepIdx !== steps.length - 1 && (
                        <div className="absolute top-5 right-0 h-0.5 w-full max-w-20 bg-gray-200"></div>
                      )}
                    </div>
                  ) : (
                    // Upcoming step
                    <div className="flex items-center">
                      <span className="flex items-center">
                        <span className="flex-shrink-0 h-10 w-10 flex items-center justify-center border-2 border-gray-200 rounded-full">
                          <span className="text-gray-400">{step.icon}</span>
                        </span>
                        <span className="ml-3 text-sm font-medium text-gray-500">
                          {step.label}
                        </span>
                      </span>

                      {stepIdx !== steps.length - 1 && (
                        <div className="absolute top-5 right-0 h-0.5 w-full max-w-20 bg-gray-200"></div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </header>
  );
}
