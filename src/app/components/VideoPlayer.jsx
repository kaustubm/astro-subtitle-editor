// // // File: components/VideoPlayer.jsx
// // "use client";

// // import {
// //   useState,
// //   useEffect,
// //   forwardRef,
// //   useImperativeHandle,
// //   useRef,
// // } from "react";

// // const VideoPlayer = forwardRef(
// //   (
// //     {
// //       src,
// //       subtitles,
// //       currentTime,
// //       isPlaying,
// //       onTimeUpdate,
// //       onPlayPause,
// //       style,
// //     },
// //     ref
// //   ) => {
// //     const videoRef = useRef(null);
// //     const [duration, setDuration] = useState(0);
// //     const [videoHeight, setVideoHeight] = useState(0);
// //     const [videoWidth, setVideoWidth] = useState(0);
// //     const [currentSubtitle, setCurrentSubtitle] = useState(null);

// //     // Expose video methods to parent
// //     useImperativeHandle(ref, () => ({
// //       play: () => videoRef.current?.play(),
// //       pause: () => videoRef.current?.pause(),
// //       get currentTime() {
// //         return videoRef.current?.currentTime || 0;
// //       },
// //       set currentTime(time) {
// //         if (videoRef.current) videoRef.current.currentTime = time;
// //       },
// //     }));

// //     // Handle metadata loaded to get video dimensions
// //     const handleMetadataLoaded = () => {
// //       if (videoRef.current) {
// //         setDuration(videoRef.current.duration || 0);
// //         setVideoHeight(videoRef.current.videoHeight || 0);
// //         setVideoWidth(videoRef.current.videoWidth || 0);
// //       }
// //     };

// //     // Handle time updates from video player
// //     const handleTimeUpdate = () => {
// //       if (videoRef.current) {
// //         onTimeUpdate(videoRef.current.currentTime);
// //       }
// //     };

// //     // Play/pause handling
// //     useEffect(() => {
// //       if (videoRef.current) {
// //         if (isPlaying) {
// //           videoRef.current
// //             .play()
// //             .catch((err) => console.error("Error playing video:", err));
// //         } else {
// //           videoRef.current.pause();
// //         }
// //       }
// //     }, [isPlaying]);

// //     // Find current subtitle based on time
// //     useEffect(() => {
// //       const current = subtitles.find(
// //         (subtitle) =>
// //           currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
// //       );
// //       setCurrentSubtitle(current);
// //     }, [currentTime, subtitles]);

// //     // Calculate subtitle positioning based on style
// //     const getSubtitleStyle = () => {
// //       const baseStyle = {
// //         position: "absolute",
// //         left: "50%",
// //         transform: "translateX(-50%)",
// //         textAlign: "center",
// //         color: style.color || "#FFFFFF",
// //         fontFamily: style.font || "Roboto, Arial, sans-serif",
// //         fontSize: `${style.fontSize || 26}px`,
// //         fontWeight: "500",
// //         maxWidth: "80%",
// //         padding: "8px 16px",
// //         borderRadius: "4px",
// //         textShadow: "0px 0px 4px rgba(0, 0, 0, 0.5)",
// //         background:
// //           style.backgroundOpacity > 0
// //             ? `rgba(0, 0, 0, ${style.backgroundOpacity})`
// //             : "transparent",
// //         WebkitTextStroke: `${style.outlineWidth || 1.5}px ${
// //           style.outlineColor || "#000000"
// //         }`,
// //       };

// //       // Position based on setting
// //       if (style.position === "bottom") {
// //         return {
// //           ...baseStyle,
// //           bottom: `${style.margin || 50}px`,
// //         };
// //       } else {
// //         return {
// //           ...baseStyle,
// //           top: `${style.margin || 50}px`,
// //         };
// //       }
// //     };

// //     return (
// //       <div className="relative w-full h-full bg-black">
// //         <video
// //           ref={videoRef}
// //           src={src}
// //           className="w-full h-full"
// //           onTimeUpdate={handleTimeUpdate}
// //           onLoadedMetadata={handleMetadataLoaded}
// //           onClick={onPlayPause}
// //           controls
// //         />

// //         {/* Custom Video Controls */}
// //         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
// //           <div className="flex items-center justify-between text-white">
// //             <button onClick={onPlayPause} className="p-2">
// //               {isPlaying ? (
// //                 <svg
// //                   className="w-6 h-6"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   viewBox="0 0 24 24"
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
// //                   />
// //                 </svg>
// //               ) : (
// //                 <svg
// //                   className="w-6 h-6"
// //                   fill="none"
// //                   stroke="currentColor"
// //                   viewBox="0 0 24 24"
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
// //                   />
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     strokeWidth={2}
// //                     d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
// //                   />
// //                 </svg>
// //               )}
// //             </button>

// //             <div className="text-sm">
// //               {formatTime(currentTime)} / {formatTime(duration)}
// //             </div>
// //           </div>
// //         </div>

// //         {/* Subtitle Display */}
// //         {currentSubtitle && (
// //           <div style={getSubtitleStyle()}>{currentSubtitle.text}</div>
// //         )}
// //       </div>
// //     );
// //   }
// // );

// // VideoPlayer.displayName = "VideoPlayer";

// // // Helper function to format time
// // function formatTime(seconds) {
// //   const mins = Math.floor(seconds / 60);
// //   const secs = Math.floor(seconds % 60);
// //   return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
// // }

// // export default VideoPlayer;

// // Update components/VideoPlayer.jsx
// // Add specific height constraints to the video container

// "use client";

// import {
//   useState,
//   useEffect,
//   forwardRef,
//   useImperativeHandle,
//   useRef,
// } from "react";

// const VideoPlayer = forwardRef(
//   (
//     {
//       src,
//       subtitles,
//       currentTime,
//       isPlaying,
//       onTimeUpdate,
//       onPlayPause,
//       style,
//     },
//     ref
//   ) => {
//     const videoRef = useRef(null);
//     const [duration, setDuration] = useState(0);
//     const [videoHeight, setVideoHeight] = useState(0);
//     const [videoWidth, setVideoWidth] = useState(0);
//     const [currentSubtitle, setCurrentSubtitle] = useState(null);

//     // Expose video methods to parent
//     useImperativeHandle(ref, () => ({
//       play: () => videoRef.current?.play(),
//       pause: () => videoRef.current?.pause(),
//       get currentTime() {
//         return videoRef.current?.currentTime || 0;
//       },
//       set currentTime(time) {
//         if (videoRef.current) videoRef.current.currentTime = time;
//       },
//     }));

//     // Handle metadata loaded to get video dimensions
//     const handleMetadataLoaded = () => {
//       if (videoRef.current) {
//         setDuration(videoRef.current.duration || 0);
//         setVideoHeight(videoRef.current.videoHeight || 0);
//         setVideoWidth(videoRef.current.videoWidth || 0);
//       }
//     };

//     // Handle time updates from video player
//     const handleTimeUpdate = () => {
//       if (videoRef.current) {
//         onTimeUpdate(videoRef.current.currentTime);
//       }
//     };

//     // Play/pause handling
//     useEffect(() => {
//       if (videoRef.current) {
//         if (isPlaying) {
//           videoRef.current
//             .play()
//             .catch((err) => console.error("Error playing video:", err));
//         } else {
//           videoRef.current.pause();
//         }
//       }
//     }, [isPlaying]);

//     // Find current subtitle based on time
//     useEffect(() => {
//       const current = subtitles.find(
//         (subtitle) =>
//           currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
//       );
//       setCurrentSubtitle(current);
//     }, [currentTime, subtitles]);

//     return (
//       <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center bg-black">
//         <video
//           ref={videoRef}
//           src={src}
//           className="max-h-full max-w-full h-auto"
//           onTimeUpdate={handleTimeUpdate}
//           onLoadedMetadata={handleMetadataLoaded}
//           onClick={onPlayPause}
//           controls
//         />

//         {/* Custom Video Controls */}
//         <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
//           <div className="flex items-center justify-between text-white">
//             <button onClick={onPlayPause} className="p-2">
//               {isPlaying ? (
//                 <svg
//                   className="w-6 h-6"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
//                   />
//                 </svg>
//               ) : (
//                 <svg
//                   className="w-6 h-6"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
//                   />
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//                   />
//                 </svg>
//               )}
//             </button>

//             <div className="text-sm">
//               {formatTime(currentTime)} / {formatTime(duration)}
//             </div>
//           </div>
//         </div>

//         {/* Subtitle Display */}
//         {/* {currentSubtitle && (
//           <div
//             className="absolute left-1/2 transform -translate-x-1/2 px-4 py-1 text-center rounded-sm"
//             style={{
//               bottom: `${
//                 style.position === "bottom" ? style.margin || 50 : "auto"
//               }px`,
//               top: `${
//                 style.position === "top" ? style.margin || 50 : "auto"
//               }px`,
//               fontFamily: style.font || "Roboto, Arial, sans-serif",
//               fontSize: `${style.fontSize || 26}px`,
//               color: style.color || "#FFFFFF",
//               textShadow: "0px 0px 4px rgba(0, 0, 0, 0.5)",
//               WebkitTextStroke: `${style.outlineWidth || 1.5}px ${
//                 style.outlineColor || "#000000"
//               }`,
//               backgroundColor: `rgba(0, 0, 0, ${
//                 style.backgroundOpacity || 0.25
//               })`,
//               maxWidth: "80%",
//               zIndex: 10,
//             }}
//           >
//             {currentSubtitle.text}
//           </div>
//         )} */}
//         {currentSubtitle && (
//           <div
//             className="absolute left-1/2 transform -translate-x-1/2 px-4 py-1 text-center"
//             style={{
//               bottom: `${style.position === "bottom" ? 70 : "auto"}px`, // Netflix standard positioning
//               top: `${style.position === "top" ? 70 : "auto"}px`,
//               fontFamily: "'Netflix Sans', 'Roboto', sans-serif", // Netflix's custom font or closest alternative
//               fontSize: `${Math.min(
//                 28,
//                 Math.max(20, Math.floor(videoWidth * 0.028))
//               )}px`, // Responsive size based on video width
//               color: "#FFFFFF", // Pure white for maximum readability
//               textShadow:
//                 "0px 0px 4px rgba(0, 0, 0, 0.75), 0px 1px 4px rgba(0, 0, 0, 0.5)", // Netflix's shadow approach
//               WebkitTextStroke: "1px rgba(0, 0, 0, 0.8)", // Thin outline
//               backgroundColor: `rgba(0, 0, 0, ${
//                 style.backgroundOpacity || 0.25
//               })`,
//               maxWidth: "80%", // Netflix limits line length
//               padding: "6px 12px",
//               borderRadius: "4px",
//               lineHeight: "1.25", // Netflix uses tighter line height
//               zIndex: 10,
//             }}
//           >
//             {currentSubtitle.text}
//           </div>
//         )}
//       </div>
//     );
//   }
// );

// VideoPlayer.displayName = "VideoPlayer";

// // Helper function to format time
// function formatTime(seconds) {
//   const mins = Math.floor(seconds / 60);
//   const secs = Math.floor(seconds % 60);
//   return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
// }

// export default VideoPlayer;

// File: components/VideoPlayer.jsx
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
