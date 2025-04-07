// File: middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: "/api/:path*",
};

export function middleware(request) {
  // Increase timeout for large file uploads
  const response = NextResponse.next();

  // Add more time for API requests, especially uploads
  response.headers.set("Connection", "keep-alive");
  response.headers.set("Keep-Alive", "timeout=600"); // 10 minutes

  return response;
}
