/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@deepgram/sdk"],
  },
  api: {
    bodyParser: {
      sizeLimit: "3gb", // Increased to handle very large files
    },
    responseLimit: "3gb", // Match the response size limit
  },
  // Set longer timeouts for API routes handling large files
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
  },
};

export default nextConfig;
