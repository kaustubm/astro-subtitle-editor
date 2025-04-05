// Update components/VideoPlayer.jsx
// Add specific height constraints to the video container

"use client";

import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

const VideoPlayer = forwardRef(
  (
    {
      src,
      subtitles,
      currentTime,
      isPlaying,
      onTimeUpdate,
      onPlayPause,
      style,
    },
    ref
  ) => {
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [videoHeight, setVideoHeight] = useState(0);
    const [videoWidth, setVideoWidth] = useState(0);
    const [currentSubtitle, setCurrentSubtitle] = useState(null);

    // Expose video methods to parent
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      get currentTime() {
        return videoRef.current?.currentTime || 0;
      },
      set currentTime(time) {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
    }));

    // Handle metadata loaded to get video dimensions
    const handleMetadataLoaded = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration || 0);
        setVideoHeight(videoRef.current.videoHeight || 0);
        setVideoWidth(videoRef.current.videoWidth || 0);
      }
    };

    // Handle time updates from video player
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    // Play/pause handling
    useEffect(() => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current
            .play()
            .catch((err) => console.error("Error playing video:", err));
        } else {
          videoRef.current.pause();
        }
      }
    }, [isPlaying]);

    // Find current subtitle based on time
    useEffect(() => {
      const current = subtitles.find(
        (subtitle) =>
          currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
      );
      setCurrentSubtitle(current);
    }, [currentTime, subtitles]);

    return (
      <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src={src}
          className="max-h-full max-w-full h-auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleMetadataLoaded}
          onClick={onPlayPause}
          controls
        />

        {/* Custom Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <button onClick={onPlayPause} className="p-2">
              {isPlaying ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
              )}
            </button>

            <div className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Subtitle Display */}
        {currentSubtitle && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 px-4 py-1 text-center rounded-sm"
            style={{
              bottom: `${
                style.position === "bottom" ? style.margin || 50 : "auto"
              }px`,
              top: `${
                style.position === "top" ? style.margin || 50 : "auto"
              }px`,
              fontFamily: style.font || "Roboto, Arial, sans-serif",
              fontSize: `${style.fontSize || 26}px`,
              color: style.color || "#FFFFFF",
              textShadow: "0px 0px 4px rgba(0, 0, 0, 0.5)",
              WebkitTextStroke: `${style.outlineWidth || 1.5}px ${
                style.outlineColor || "#000000"
              }`,
              backgroundColor: `rgba(0, 0, 0, ${
                style.backgroundOpacity || 0.25
              })`,
              maxWidth: "80%",
              zIndex: 10,
            }}
          >
            {currentSubtitle.text}
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

// Helper function to format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default VideoPlayer;
