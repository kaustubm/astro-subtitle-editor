// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: "standalone",
//   experimental: {
//     serverComponentsExternalPackages: ["@deepgram/sdk"],
//   },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@deepgram/sdk"],
  },
  api: {
    bodyParser: {
      sizeLimit: "3gb", // Increase this limit based on your needs
    },
    responseLimit: "3gb", // Match the response size limit as well
  },
};

export default nextConfig;
