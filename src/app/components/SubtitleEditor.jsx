// File: components/SubtitleEditor.jsx
"use client";

import { useState, useEffect } from "react";

export default function SubtitleEditor({
  subtitles,
  currentIndex,
  onTextChange,
  onTimingChange,
  onDelete,
  onAdd,
  onSelect,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState("");
  const [editStartTime, setEditStartTime] = useState(0);
  const [editEndTime, setEditEndTime] = useState(0);

  // Update editing state when current subtitle changes
  useEffect(() => {
    if (currentIndex !== null && currentIndex >= 0 && subtitles[currentIndex]) {
      setEditingIndex(currentIndex);
      setEditText(subtitles[currentIndex].text);
      setEditStartTime(subtitles[currentIndex].startTime);
      setEditEndTime(subtitles[currentIndex].endTime);
    }
  }, [currentIndex, subtitles]);

  // Save changes to subtitle
  const saveChanges = () => {
    if (editingIndex !== null) {
      onTextChange(subtitles[editingIndex].id, editText);
      onTimingChange(subtitles[editingIndex].id, editStartTime, editEndTime);
    }
  };

  // Handle changes to timing inputs
  const handleStartTimeChange = (value) => {
    const newTime = parseFloat(value);
    if (!isNaN(newTime) && newTime >= 0 && newTime < editEndTime) {
      setEditStartTime(newTime);
    }
  };

  const handleEndTimeChange = (value) => {
    const newTime = parseFloat(value);
    if (!isNaN(newTime) && newTime > editStartTime) {
      setEditEndTime(newTime);
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}.${ms
      .toString()
      .padStart(3, "0")}`;
  };

  // Parse formatted time to seconds
  const parseTime = (timeStr) => {
    const [minsec, ms] = timeStr.split(".");
    const [mins, secs] = minsec.split(":");
    return parseInt(mins) * 60 + parseInt(secs) + parseInt(ms || 0) / 1000;
  };

  // Add new subtitle at current time or after last subtitle
  const handleAddSubtitle = () => {
    const lastSubtitle = subtitles[subtitles.length - 1];
    const startTime = lastSubtitle ? lastSubtitle.endTime + 0.5 : 0;
    onAdd(startTime, startTime + 4);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Subtitle list */}
      <div className="flex-1 overflow-y-auto pr-2 mb-4">
        <ul className="space-y-2">
          {subtitles.map((subtitle, index) => (
            <li
              key={subtitle.id}
              className={`p-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer border ${
                index === editingIndex
                  ? "border-pink-500 bg-pink-50"
                  : "border-gray-200"
              }`}
              onClick={() => {
                setEditingIndex(index);
                setEditText(subtitle.text);
                setEditStartTime(subtitle.startTime);
                setEditEndTime(subtitle.endTime);
                onSelect(index);
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">
                  #{subtitle.id} · {formatTime(subtitle.startTime)} -{" "}
                  {formatTime(subtitle.endTime)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(subtitle.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {subtitle.text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor for current subtitle */}
      {editingIndex !== null && subtitles[editingIndex] && (
        <div className="border-t pt-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={formatTime(editStartTime)}
                onChange={(e) =>
                  handleStartTimeChange(parseTime(e.target.value))
                }
                onBlur={saveChanges}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                End Time
              </label>
              <input
                type="text"
                value={formatTime(editEndTime)}
                onChange={(e) => handleEndTimeChange(parseTime(e.target.value))}
                onBlur={saveChanges}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex-none">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Duration
              </label>
              <div className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50">
                {(editEndTime - editStartTime).toFixed(2)}s
              </div>
            </div>
          </div>

          <label className="block text-xs font-medium text-gray-500 mb-1">
            Subtitle Text
          </label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveChanges}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            rows={3}
          />

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => {
                saveChanges();
                if (editingIndex < subtitles.length - 1) {
                  onSelect(editingIndex + 1);
                }
              }}
              className="px-3 py-1.5 text-sm text-white bg-pink-600 rounded-md hover:bg-pink-700"
            >
              Save & Next
            </button>

            <button
              onClick={handleAddSubtitle}
              className="px-3 py-1.5 text-sm text-pink-600 border border-pink-600 rounded-md hover:bg-pink-50"
            >
              Add Subtitle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
