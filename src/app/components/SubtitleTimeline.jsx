// File: components/SubtitleTimeline.jsx
"use client";

import { useState, useRef, useEffect } from "react";

export default function SubtitleTimeline({
  subtitles,
  duration,
  currentTime,
  onSeek,
  onSubtitleSelect,
  currentSubtitleIndex,
}) {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [hoverTime, setHoverTime] = useState(null);
  const [zoom, setZoom] = useState(1); // Zoom level, 1 = full duration
  const [offset, setOffset] = useState(0); // Time offset for zoom

  // Set timeline width on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Convert time to position on timeline
  const timeToPosition = (time) => {
    const visibleDuration = duration / zoom;
    const visibleStart = offset;
    const visibleEnd = offset + visibleDuration;

    if (time < visibleStart || time > visibleEnd) return null;

    return ((time - visibleStart) / visibleDuration) * timelineWidth;
  };

  // Convert position to time
  const positionToTime = (position) => {
    const visibleDuration = duration / zoom;
    const visibleStart = offset;

    return visibleStart + (position / timelineWidth) * visibleDuration;
  };

  // Handle timeline click
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;
    const time = positionToTime(position);

    if (time >= 0 && time <= duration) {
      onSeek(time);
    }
  };

  // Handle mouse move on timeline
  const handleMouseMove = (e) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const position = e.clientX - rect.left;

    // Show time on hover
    setHoverTime(positionToTime(position));

    // Handle dragging
    if (isDragging) {
      const time = positionToTime(position);
      if (time >= 0 && time <= duration) {
        onSeek(time);
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (zoom < 4) {
      // Max zoom level
      // Center zoom around current time
      const visibleDuration = duration / zoom;
      const newZoom = zoom * 1.5;
      const newVisibleDuration = duration / newZoom;

      // Calculate new offset to keep current time centered
      const currentCenter = offset + visibleDuration / 2;
      const newOffset = Math.max(0, currentCenter - newVisibleDuration / 2);

      setZoom(newZoom);
      setOffset(newOffset);
    }
  };

  const handleZoomOut = () => {
    if (zoom > 1) {
      const newZoom = Math.max(1, zoom / 1.5);
      if (newZoom === 1) {
        setOffset(0); // Reset offset at full zoom out
      } else {
        // Adjust offset to keep centered
        const visibleDuration = duration / zoom;
        const newVisibleDuration = duration / newZoom;
        const currentCenter = offset + visibleDuration / 2;
        const newOffset = Math.max(0, currentCenter - newVisibleDuration / 2);
        setOffset(newOffset);
      }
      setZoom(newZoom);
    }
  };

  return (
    <div className="select-none">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-gray-700">Timeline</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded-md hover:bg-gray-100"
            disabled={zoom <= 1}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded-md hover:bg-gray-100"
            disabled={zoom >= 4}
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative h-24 bg-gray-100 rounded-md overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoverTime(null);
        }}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 right-0 h-6 flex border-b border-gray-200">
          {Array.from({ length: 11 }).map((_, i) => {
            const markerTime = offset + (i / 10) * (duration / zoom);
            if (markerTime > duration) return null;

            return (
              <div
                key={i}
                className="absolute h-full flex flex-col items-center"
                style={{ left: `${i * 10}%` }}
              >
                <div className="h-2 w-0.5 bg-gray-300"></div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatTime(markerTime)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtitles */}
        <div className="absolute top-6 left-0 right-0 bottom-0 p-2">
          {subtitles.map((subtitle, index) => {
            const startPos = timeToPosition(subtitle.startTime);
            const endPos = timeToPosition(subtitle.endTime);

            // Skip if not in view
            if (startPos === null && endPos === null) return null;
            if (startPos === null && endPos < 0) return null;
            if (endPos === null && startPos > timelineWidth) return null;

            // Calculate visible portion
            const visibleStartPos = startPos !== null ? startPos : 0;
            const visibleEndPos = endPos !== null ? endPos : timelineWidth;
            const width = visibleEndPos - visibleStartPos;

            return (
              <div
                key={subtitle.id}
                className={`absolute h-10 rounded-md flex items-center px-2 text-xs border transition-colors ${
                  index === currentSubtitleIndex
                    ? "bg-pink-100 border-pink-500 text-pink-900"
                    : "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                }`}
                style={{
                  left: `${visibleStartPos}px`,
                  width: `${width}px`,
                  top: "8px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubtitleSelect(index);
                }}
              >
                {subtitle.text}
              </div>
            );
          })}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{
            left: `${timeToPosition(currentTime) || 0}px`,
            display: timeToPosition(currentTime) === null ? "none" : "block",
          }}
        >
          <div className="w-3 h-3 rounded-full bg-red-500 absolute -left-1.5 -top-1.5"></div>
        </div>

        {/* Hover time indicator */}
        {hoverTime !== null && (
          <div
            className="absolute top-0 h-6 px-2 py-1 bg-black text-white text-xs rounded-md opacity-80 transform -translate-x-1/2 z-20"
            style={{ left: `${timeToPosition(hoverTime) || 0}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
    </div>
  );
}
