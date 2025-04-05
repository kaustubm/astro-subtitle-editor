// File: app/editor/page.js
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditorHeader from "@/app/components/EditorHeader";
import VideoPlayer from "@/app/components/VideoPlayer";
import SubtitleTimeline from "@/app/components/SubtitleTimeline";
import SubtitleEditor from "@/app/components/SubtitleEditor";
import StyleEditor from "@/app/components/StyleEditor";
import ExportPanel from "@/app/components/ExportPanel";
import UploadPanel from "@/app/components/UploadPanel";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import useDeepgram from "@/app/hooks/useDeepgram";

export default function EditorPage() {
  const [currentStep, setCurrentStep] = useState("upload"); // upload, transcribe, edit, export
  const [video, setVideo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [srtContent, setSrtContent] = useState("");
  const [subtitleStyle, setSubtitleStyle] = useState({
    font: "Roboto",
    fontSize: 26,
    color: "#FFFFFF",
    outlineColor: "#000000",
    outlineWidth: 1.5,
    backgroundOpacity: 0.25,
    position: "bottom",
    margin: 50,
  });

  // Get Deepgram hook
  const {
    transcribeVideo,
    isProcessing: isTranscribing,
    progress: transcriptionProgress,
    error: transcriptionError,
  } = useDeepgram();

  const videoRef = useRef(null);
  const router = useRouter();

  // Update processing state based on Deepgram hook
  useEffect(() => {
    if (isTranscribing) {
      setIsProcessing(true);
      setProcessingProgress(transcriptionProgress);
      setProcessingMessage("Transcribing video with AI...");
    }
  }, [isTranscribing, transcriptionProgress]);

  // Handle file upload
  const handleFileUpload = (file) => {
    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingMessage("Processing video file...");

    // Create object URL for the video
    const videoUrl = URL.createObjectURL(file);
    setVideo({
      file: file,
      url: videoUrl,
      name: file.name,
      duration: 0, // Will be updated once loaded
      size: file.size,
      type: file.type,
    });

    setProcessingProgress(100);
    setCurrentStep("transcribe");
    setIsProcessing(false);
  };

  // Handle transcription
  const handleTranscription = async (language) => {
    try {
      // Make sure we have a video
      if (!video || !video.file) {
        throw new Error("No video file found");
      }

      // Call Deepgram API via our hook
      const result = await transcribeVideo(video.file, language);

      // Set subtitles from the result
      setSubtitles(result.subtitles || []);

      // Save SRT content for later use
      setSrtContent(result.srtContent || "");

      // Move to edit step
      setCurrentStep("edit");
    } catch (error) {
      console.error("Transcription error:", error);
      alert(`Error during transcription: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update subtitle text
  const updateSubtitleText = (id, newText) => {
    setSubtitles(
      subtitles.map((subtitle) =>
        subtitle.id === id ? { ...subtitle, text: newText } : subtitle
      )
    );

    // Update SRT content
    updateSrtFromSubtitles();
  };

  // Update subtitle timing
  const updateSubtitleTiming = (id, startTime, endTime) => {
    setSubtitles(
      subtitles.map((subtitle) =>
        subtitle.id === id ? { ...subtitle, startTime, endTime } : subtitle
      )
    );

    // Update SRT content
    updateSrtFromSubtitles();
  };

  // Update SRT content when subtitles change
  const updateSrtFromSubtitles = () => {
    let newSrtContent = "";

    subtitles.forEach((subtitle, index) => {
      // Format time for SRT (00:00:00,000)
      const formatSrtTime = (seconds) => {
        const pad = (num, size) => {
          let s = num.toString();
          while (s.length < size) s = "0" + s;
          return s;
        };

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);

        return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(
          milliseconds,
          3
        )}`;
      };

      newSrtContent += `${index + 1}\n`;
      newSrtContent += `${formatSrtTime(
        subtitle.startTime
      )} --> ${formatSrtTime(subtitle.endTime)}\n`;
      newSrtContent += `${subtitle.text}\n\n`;
    });

    setSrtContent(newSrtContent);
  };

  // Add a new subtitle
  const addSubtitle = (startTime, endTime = startTime + 4) => {
    const newId = Math.max(0, ...subtitles.map((s) => s.id)) + 1;
    const newSubtitle = {
      id: newId,
      startTime,
      endTime,
      text: "New subtitle",
    };

    const newSubtitles = [...subtitles, newSubtitle].sort(
      (a, b) => a.startTime - b.startTime
    );
    setSubtitles(newSubtitles);
    setCurrentSubtitleIndex(newSubtitles.findIndex((s) => s.id === newId));

    // Update SRT content
    updateSrtFromSubtitles();
  };

  // Delete a subtitle
  const deleteSubtitle = (id) => {
    const newSubtitles = subtitles.filter((subtitle) => subtitle.id !== id);
    setSubtitles(newSubtitles);

    if (currentSubtitleIndex >= newSubtitles.length) {
      setCurrentSubtitleIndex(Math.max(0, newSubtitles.length - 1));
    }

    // Update SRT content
    updateSrtFromSubtitles();
  };

  // Generate preview with current settings
  const generatePreview = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingMessage("Generating video preview...");

    try {
      // In a real implementation, this would call a backend API to generate the preview
      // For now, we'll simulate the process
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setProcessingProgress(Math.min(progress, 100));

        if (progress >= 100) {
          clearInterval(interval);

          // Use original video as preview for this demo
          setPreviewUrl(video.url);
          setIsProcessing(false);
        }
      }, 100);
    } catch (error) {
      console.error("Preview generation error:", error);
      alert("Error generating preview. Please try again.");
      setIsProcessing(false);
    }
  };

  // Export final video
  const handleExport = async (format, quality) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingMessage("Exporting final video...");

    try {
      // In a real implementation, this would call a backend API to generate the final video
      // For now, we'll simulate the process

      // Simulate processing time based on format and quality
      const totalTime =
        format === "both" ? 10000 : format === "mp4" ? 7000 : 3000;

      const qualityMultiplier =
        quality === "high" ? 1.5 : quality === "low" ? 0.7 : 1;

      // Start progress updates
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        setProcessingProgress(Math.min(progress, 100));

        if (progress >= 100) {
          clearInterval(interval);

          // For demonstration, alert the user that export is complete
          // In a real app, you would provide download links
          alert(
            `Video exported successfully as ${format} with ${quality} quality!`
          );

          setCurrentStep("complete");
          setIsProcessing(false);
        }
      }, (totalTime * qualityMultiplier) / 50);
    } catch (error) {
      console.error("Export error:", error);
      alert("Error during export. Please try again.");
      setIsProcessing(false);
    }
  };

  // Handle video time update
  const handleTimeUpdate = (time) => {
    setCurrentTime(time);

    // Find current subtitle based on time
    const currentSub = subtitles.findIndex(
      (subtitle) => time >= subtitle.startTime && time <= subtitle.endTime
    );

    if (currentSub !== -1 && currentSub !== currentSubtitleIndex) {
      setCurrentSubtitleIndex(currentSub);
    }
  };

  // Handle video play/pause
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Seek to specific subtitle
  const seekToSubtitle = (index) => {
    if (videoRef.current && subtitles[index]) {
      videoRef.current.currentTime = subtitles[index].startTime;
      setCurrentTime(subtitles[index].startTime);
      setCurrentSubtitleIndex(index);
    }
  };

  // Handle style changes
  const handleStyleChange = (newStyle) => {
    setSubtitleStyle({ ...subtitleStyle, ...newStyle });
  };

  // Render different step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "upload":
        return <UploadPanel onFileUpload={handleFileUpload} />;

      case "transcribe":
        return (
          <div className="flex flex-col gap-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-900">
              Transcribe Video
            </h2>
            <p className="text-gray-600">
              Your video has been uploaded successfully. Now, let's transcribe
              it to generate subtitles. Select the primary language spoken in
              the video.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                className="p-4 border border-gray-300 rounded-md text-left hover:bg-pink-50 hover:border-pink-500"
                onClick={() => handleTranscription("en")}
              >
                <div className="font-medium">English</div>
                <div className="text-sm text-gray-500">
                  Uses Nova-3 model (best accuracy)
                </div>
              </button>

              <button
                className="p-4 border border-gray-300 rounded-md text-left hover:bg-pink-50 hover:border-pink-500"
                onClick={() => handleTranscription("ms")}
              >
                <div className="font-medium">Malay</div>
                <div className="text-sm text-gray-500">Uses Nova-2 model</div>
              </button>

              <button
                className="p-4 border border-gray-300 rounded-md text-left hover:bg-pink-50 hover:border-pink-500"
                onClick={() => handleTranscription("zh")}
              >
                <div className="font-medium">Chinese</div>
                <div className="text-sm text-gray-500">Uses Nova-2 model</div>
              </button>

              <button
                className="p-4 border border-gray-300 rounded-md text-left hover:bg-pink-50 hover:border-pink-500"
                onClick={() => handleTranscription("ta")}
              >
                <div className="font-medium">Tamil</div>
                <div className="text-sm text-gray-500">Uses Nova-2 model</div>
              </button>
            </div>
          </div>
        );

      case "edit":
        return (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Video Preview Panel */}
              <div className="lg:col-span-2 bg-gray-900 rounded-lg overflow-hidden h-[60vh] flex items-center justify-center">
                {video && (
                  <VideoPlayer
                    src={previewUrl || video.url}
                    subtitles={subtitles}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={handleTimeUpdate}
                    onPlayPause={handlePlayPause}
                    style={subtitleStyle}
                    ref={videoRef}
                  />
                )}
              </div>

              {/* Editing Panels */}
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <div className="bg-white p-4 rounded-lg shadow flex-none">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Subtitle Style
                    </h3>
                    <button
                      onClick={generatePreview}
                      className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700"
                    >
                      Update Preview
                    </button>
                  </div>
                  <StyleEditor
                    style={subtitleStyle}
                    onChange={handleStyleChange}
                  />
                </div>

                <div className="bg-white p-4 rounded-lg shadow flex-1 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Edit Subtitles
                  </h3>
                  <SubtitleEditor
                    subtitles={subtitles}
                    currentIndex={currentSubtitleIndex}
                    onTextChange={updateSubtitleText}
                    onTimingChange={updateSubtitleTiming}
                    onDelete={deleteSubtitle}
                    onAdd={addSubtitle}
                    onSelect={seekToSubtitle}
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4 bg-white p-4 rounded-lg shadow">
              <SubtitleTimeline
                subtitles={subtitles}
                duration={video ? videoRef.current?.duration || 30 : 0}
                currentTime={currentTime}
                onSeek={(time) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
                onSubtitleSelect={seekToSubtitle}
                currentSubtitleIndex={currentSubtitleIndex}
              />
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  // Download SRT file
                  const blob = new Blob([srtContent], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${video.name.replace(/\.[^/.]+$/, "")}.srt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 text-base font-medium text-pink-600 border border-pink-600 rounded-md hover:bg-pink-50"
              >
                Download SRT
              </button>

              <button
                onClick={() => setCurrentStep("export")}
                className="px-6 py-3 text-base font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700"
              >
                Continue to Export
              </button>
            </div>
          </div>
        );

      case "export":
        return (
          <ExportPanel
            onExport={handleExport}
            subtitles={subtitles}
            videoInfo={video}
            srtContent={srtContent}
          />
        );

      case "complete":
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Export Complete!
            </h2>
            <p className="text-gray-600 mb-8 text-center">
              Your video with professional subtitles has been created
              successfully.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 text-base font-medium text-pink-600 bg-white border border-pink-600 rounded-md hover:bg-pink-50"
              >
                Back to Home
              </button>
              <button
                onClick={() => setCurrentStep("upload")}
                className="px-6 py-3 text-base font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700"
              >
                Start New Project
              </button>
            </div>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <EditorHeader
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        projectName={
          video ? video.name.replace(/\.[^/.]+$/, "") : "New Project"
        }
      />

      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col">
        {renderStepContent()}
      </main>

      {isProcessing && (
        <LoadingOverlay
          progress={processingProgress}
          message={
            processingMessage ||
            (currentStep === "transcribe"
              ? "Transcribing video..."
              : currentStep === "edit"
              ? "Generating preview..."
              : "Processing your video...")
          }
        />
      )}
    </div>
  );
}
