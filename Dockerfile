# FROM node:18-alpine AS base

# # Install FFmpeg
# RUN apk add --no-cache ffmpeg

# # Install dependencies only when needed
# FROM base AS deps
# WORKDIR /app

# # Copy package files
# COPY package.json package-lock.json* ./
# RUN npm ci

# # Build the app
# FROM base AS builder
# WORKDIR /app
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# RUN npm run build

# # Production image
# FROM base AS runner
# WORKDIR /app

# ENV NODE_ENV production

# # Create a non-root user
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs

# # Copy built app
# COPY --from=builder /app/public ./public
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# # Set proper permissions for the temp directory
# RUN mkdir -p /tmp/astro-subtitle-editor && chown nextjs:nodejs /tmp/astro-subtitle-editor

# USER nextjs

# EXPOSE 3000

# ENV PORT 3000
# ENV HOSTNAME "0.0.0.0"

# CMD ["node", "server.js"]



FROM node:18-alpine AS base

# Install FFmpeg and AWS CLI (for troubleshooting if needed)
RUN apk add --no-cache ffmpeg curl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install AWS SDK dependencies
RUN npm ci
RUN npm install @aws-sdk/client-s3 --save

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set proper permissions for the temp directory
RUN mkdir -p /tmp/astro-subtitle-editor && chown nextjs:nodejs /tmp/astro-subtitle-editor

# Configure environment variables
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV AWS_REGION "ap-southeast-1"
ENV S3_BUCKET "deepgram-transcription"
ENV NODE_OPTIONS "--max-old-space-size=4096"

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]