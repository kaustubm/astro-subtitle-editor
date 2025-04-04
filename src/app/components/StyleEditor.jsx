// File: components/StyleEditor.jsx
"use client";

import { useState } from "react";

export default function StyleEditor({ style, onChange }) {
  const [activeTab, setActiveTab] = useState("text");

  // Handle style change
  const handleChange = (property, value) => {
    onChange({ [property]: value });
  };

  // Handle preset selection
  const handlePresetSelect = (preset) => {
    switch (preset) {
      case "netflix":
        onChange({
          font: "Roboto",
          fontSize: 26,
          color: "#FFFFFF",
          outlineColor: "#000000",
          outlineWidth: 1.5,
          backgroundOpacity: 0.25,
          position: "bottom",
          margin: 50,
        });
        break;
      case "youtube":
        onChange({
          font: "Roboto",
          fontSize: 22,
          color: "#FFFFFF",
          outlineColor: "#000000",
          outlineWidth: 1,
          backgroundOpacity: 0.6,
          position: "bottom",
          margin: 40,
        });
        break;
      case "movie":
        onChange({
          font: "Arial",
          fontSize: 28,
          color: "#FFFFFF",
          outlineColor: "#000000",
          outlineWidth: 2,
          backgroundOpacity: 0,
          position: "bottom",
          margin: 60,
        });
        break;
      case "documentary":
        onChange({
          font: "Georgia",
          fontSize: 24,
          color: "#FFFFFF",
          outlineColor: "#000000",
          outlineWidth: 1,
          backgroundOpacity: 0.4,
          position: "bottom",
          margin: 45,
        });
        break;
    }
  };

  return (
    <div>
      {/* Preset styles */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Preset Styles
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handlePresetSelect("netflix")}
            className="flex flex-col items-center justify-center p-2 border border-gray-200 rounded-md hover:bg-pink-50 hover:border-pink-300 text-xs"
          >
            <span className="font-semibold mb-1">Netflix</span>
            <div className="w-full h-4 bg-black rounded-sm flex items-center justify-center">
              <span
                className="text-white text-[8px]"
                style={{ textShadow: "0px 0px 1px black" }}
              >
                Netflix Style
              </span>
            </div>
          </button>

          <button
            onClick={() => handlePresetSelect("youtube")}
            className="flex flex-col items-center justify-center p-2 border border-gray-200 rounded-md hover:bg-pink-50 hover:border-pink-300 text-xs"
          >
            <span className="font-semibold mb-1">YouTube</span>
            <div className="w-full h-4 bg-black/60 rounded-sm flex items-center justify-center">
              <span className="text-white text-[8px]">YouTube Style</span>
            </div>
          </button>

          <button
            onClick={() => handlePresetSelect("movie")}
            className="flex flex-col items-center justify-center p-2 border border-gray-200 rounded-md hover:bg-pink-50 hover:border-pink-300 text-xs"
          >
            <span className="font-semibold mb-1">Movie</span>
            <div className="w-full h-4 bg-transparent rounded-sm flex items-center justify-center">
              <span
                className="text-white text-[8px]"
                style={{ WebkitTextStroke: "0.5px black" }}
              >
                Movie Style
              </span>
            </div>
          </button>

          <button
            onClick={() => handlePresetSelect("documentary")}
            className="flex flex-col items-center justify-center p-2 border border-gray-200 rounded-md hover:bg-pink-50 hover:border-pink-300 text-xs"
          >
            <span className="font-semibold mb-1">Documentary</span>
            <div className="w-full h-4 bg-black/40 rounded-sm flex items-center justify-center">
              <span
                className="text-white text-[8px]"
                style={{ fontFamily: "Georgia" }}
              >
                Doc Style
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs for different style categories */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab("text")}
            className={`py-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === "text"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`py-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === "appearance"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab("position")}
            className={`py-2 px-1 text-sm font-medium border-b-2 ${
              activeTab === "position"
                ? "border-pink-500 text-pink-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Position
          </button>
        </nav>
      </div>

      {/* Text tab content */}
      {activeTab === "text" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Font
            </label>
            <select
              value={style.font}
              onChange={(e) => handleChange("font", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="Roboto">Roboto (Netflix)</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Font Size: {style.fontSize}px
            </label>
            <input
              type="range"
              min="16"
              max="36"
              step="1"
              value={style.fontSize}
              onChange={(e) =>
                handleChange("fontSize", parseInt(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Text Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                value={style.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="w-8 h-8 rounded-md border border-gray-300 mr-2"
              />
              <input
                type="text"
                value={style.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Appearance tab content */}
      {activeTab === "appearance" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Outline Color
            </label>
            <div className="flex items-center">
              <input
                type="color"
                value={style.outlineColor}
                onChange={(e) => handleChange("outlineColor", e.target.value)}
                className="w-8 h-8 rounded-md border border-gray-300 mr-2"
              />
              <input
                type="text"
                value={style.outlineColor}
                onChange={(e) => handleChange("outlineColor", e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Outline Width: {style.outlineWidth}px
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.25"
              value={style.outlineWidth}
              onChange={(e) =>
                handleChange("outlineWidth", parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Background Opacity: {Math.round(style.backgroundOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={style.backgroundOpacity}
              onChange={(e) =>
                handleChange("backgroundOpacity", parseFloat(e.target.value))
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Position tab content */}
      {activeTab === "position" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Position
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => handleChange("position", "bottom")}
                className={`flex-1 py-2 px-3 text-sm border rounded-md ${
                  style.position === "bottom"
                    ? "bg-pink-100 border-pink-500 text-pink-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Bottom
              </button>
              <button
                onClick={() => handleChange("position", "top")}
                className={`flex-1 py-2 px-3 text-sm border rounded-md ${
                  style.position === "top"
                    ? "bg-pink-100 border-pink-500 text-pink-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Top
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Margin: {style.margin}px
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={style.margin}
              onChange={(e) => handleChange("margin", parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Distance from the {style.position} of the screen
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Preview
        </label>
        <div className="relative h-16 bg-gray-800 rounded-md overflow-hidden">
          <div
            className="absolute left-1/2 transform -translate-x-1/2 px-4 py-1 text-center"
            style={{
              [style.position]: `${style.margin / 3}px`,
              fontFamily: style.font || "Roboto, Arial, sans-serif",
              fontSize: `${style.fontSize / 2}px`,
              color: style.color || "#FFFFFF",
              WebkitTextStroke: `${style.outlineWidth / 2}px ${
                style.outlineColor || "#000000"
              }`,
              textShadow: "0px 0px 2px rgba(0, 0, 0, 0.5)",
              backgroundColor:
                style.backgroundOpacity > 0
                  ? `rgba(0, 0, 0, ${style.backgroundOpacity})`
                  : "transparent",
              borderRadius: "2px",
              maxWidth: "90%",
            }}
          >
            Sample Subtitle Text
          </div>
        </div>
      </div>
    </div>
  );
}
