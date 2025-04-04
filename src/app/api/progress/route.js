// File: app/api/progress/route.js
import { NextResponse } from "next/server";

// In-memory store for job progress
// In production, this should be replaced with Redis or another persistent store
const jobProgress = new Map();

// Get progress for a specific job
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  const progress = jobProgress.get(jobId) || {
    progress: 0,
    status: "pending",
    message: "Job pending",
  };

  return NextResponse.json(progress);
}

// Update progress for a specific job
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

    jobProgress.set(jobId, {
      progress: progress || 0,
      status: status || "pending",
      message: message || "Processing",
      updatedAt: new Date().toISOString(),
    });

    // For long-running jobs, we should implement a cleanup mechanism
    // to remove completed jobs after some time
    if (status === "completed" || status === "failed") {
      setTimeout(() => {
        jobProgress.delete(jobId);
      }, 3600000); // Clean up after 1 hour
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
