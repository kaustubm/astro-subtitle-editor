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
    bodyParser: false,
    responseLimit: false,
  },
};

module.exports = nextConfig;
