// // File: app/api/progress/route.js

// import { NextResponse } from "next/server";

// const jobProgress = new Map();

// const validateProgress = (progress) => {
//   const num = Number(progress);
//   return !isNaN(num) && num >= 0 && num <= 100;
// };

// export async function GET(request) {
//   const { searchParams } = new URL(request.url);
//   const jobId = searchParams.get("jobId");

//   if (!jobId) {
//     return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
//   }

//   const progress = jobProgress.get(jobId) || {
//     progress: 0,
//     status: "pending",
//     message: "Job not found or expired",
//   };

//   return NextResponse.json(progress);
// }

// export async function POST(request) {
//   try {
//     const body = await request.json();
//     const { jobId, progress, status, message } = body;

//     if (!jobId) {
//       return NextResponse.json(
//         { error: "Job ID is required" },
//         { status: 400 }
//       );
//     }

//     if (progress !== undefined && !validateProgress(progress)) {
//       return NextResponse.json(
//         { error: "Progress must be between 0 and 100" },
//         { status: 400 }
//       );
//     }

//     const current = jobProgress.get(jobId) || {};

//     jobProgress.set(jobId, {
//       ...current,
//       progress:
//         progress !== undefined ? Number(progress) : current.progress || 0,
//       status: status || current.status || "processing",
//       message: message || current.message || "Processing",
//       updatedAt: new Date().toISOString(),
//     });

//     if (status === "completed" || status === "failed") {
//       setTimeout(() => {
//         jobProgress.delete(jobId);
//       }, 86400000); // 24 hours
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Error updating progress:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";

// In-memory store for job progress (in production, use Redis or database)
const jobProgress = new Map();

// Helper to validate progress values
const validateProgress = (progress) => {
  const num = Number(progress);
  return !isNaN(num) && num >= 0 && num <= 100;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  // Return default progress if job not found
  if (!jobProgress.has(jobId)) {
    return NextResponse.json({
      progress: 0,
      status: "pending",
      message: "Job not started yet",
      updatedAt: new Date().toISOString(),
    });
  }

  const progress = jobProgress.get(jobId);
  return NextResponse.json(progress);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId, progress, status, message } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Validate progress value if provided
    if (progress !== undefined && !validateProgress(progress)) {
      return NextResponse.json(
        { error: "Progress must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Get current progress or initialize new job
    const currentProgress = jobProgress.get(jobId) || {
      progress: 0,
      status: "pending",
      message: "Job initialized",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update only the provided fields
    const updatedProgress = {
      ...currentProgress,
      progress:
        progress !== undefined ? Number(progress) : currentProgress.progress,
      status: status || currentProgress.status,
      message: message || currentProgress.message,
      updatedAt: new Date().toISOString(),
    };

    // Save to memory store
    jobProgress.set(jobId, updatedProgress);

    // Schedule cleanup for completed/failed jobs
    if (status === "completed" || status === "failed") {
      setTimeout(() => {
        jobProgress.delete(jobId);
      }, 86400000); // Clean up after 24 hours
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress.progress,
      status: updatedProgress.status,
      message: updatedProgress.message,
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Add cleanup endpoint for manual job removal
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  jobProgress.delete(jobId);
  return NextResponse.json({ success: true });
}
