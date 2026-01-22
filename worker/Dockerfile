# Use Node 20 LTS with FFmpeg
FROM node:20-bookworm-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built worker code
COPY dist ./dist

# Create temp directory for processing
RUN mkdir -p /tmp/video-processing

# Run the worker
CMD ["node", "dist/index.js"]
