# NV Video Clipper

A production-ready web application for creating professional video clips. Built with Next.js, featuring a sleek NVIDIA-inspired dark theme, server-side FFmpeg processing, and cloud storage.

![NV Video Clipper](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwind-css)

## Features

- 🎬 **Drag & Drop Upload** - Intuitive video upload with progress tracking
- ✂️ **Precise Trimming** - Select clips between 3-6 seconds with decimal precision
- 📐 **Multiple Export Sizes** - 630×354, 850×480, or 1920×1080 (Full HD)
- 🔇 **Audio Control** - Optional audio removal for smaller file sizes
- 🎨 **Modern UI** - Dark NVIDIA-themed interface with smooth animations
- ☁️ **Cloud Processing** - Server-side FFmpeg processing via workers
- 📦 **Direct Uploads** - Browser-to-R2 uploads (no server proxying)
- 📊 **Real-time Progress** - Live progress updates during export

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       │ 1. Get signed upload URL
       ├─────────────────────────► API: /api/r2/upload-url
       │
       │ 2. Upload video directly
       ├─────────────────────────► Cloudflare R2
       │
       │ 3. Create job
       ├─────────────────────────► API: /api/jobs
       │                            │
       │                            │ Queue job
       │                            ▼
       │                        Upstash Redis
       │                            │
       │                            │ Pop job
       │                            ▼
       │                        ┌─────────┐
       │                        │ Worker  │
       │                        │ FFmpeg  │
       │                        └─────────┘
       │                            │
       │                            │ Get/Put files
       │                            ▼
       │                        Cloudflare R2
       │
       │ 4. Poll status
       ├─────────────────────────► API: /api/jobs/[jobId]
       │
       │ 5. Download result
       └─────────────────────────► Cloudflare R2 (signed URL)
```

## Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7
- Tailwind CSS 3.4

**Backend:**
- Next.js API Routes
- Cloudflare R2 (S3-compatible storage)
- Upstash Redis (job queue & status)
- AWS SDK v3 (S3 client)

**Worker:**
- Node.js 20
- FFmpeg 7
- Docker
- TypeScript

## Project Structure

```
nv-video-clipper/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── r2/upload-url/route.ts  # Generate signed upload URLs
│   │   │   └── jobs/
│   │   │       ├── route.ts            # Create jobs
│   │   │       └── [jobId]/route.ts    # Get job status
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                    # Main application page
│   ├── components/
│   │   ├── UploadArea.tsx              # File upload with drag & drop
│   │   ├── VideoPreview.tsx            # HTML5 video player
│   │   ├── TrimControls.tsx            # Trim time inputs
│   │   ├── ExportControls.tsx          # Export settings
│   │   └── ExportProgress.tsx          # Job status display
│   ├── lib/
│   │   ├── r2.ts                       # R2 client & signed URLs
│   │   └── redis.ts                    # Redis job queue
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── worker/
│   ├── src/
│   │   ├── index.ts                    # Main worker loop
│   │   ├── processor.ts                # Job processing logic
│   │   ├── ffmpeg.ts                   # FFmpeg wrapper
│   │   ├── r2.ts                       # R2 download/upload
│   │   ├── redis.ts                    # Redis client
│   │   └── types.ts                    # Worker types
│   ├── Dockerfile                      # Worker container
│   └── package.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm or yarn
- Cloudflare R2 account
- Upstash Redis account
- Docker (for worker deployment)

### 1. Clone and Install Dependencies

```bash
# Main application
npm install

# Worker
cd worker
npm install
cd ..
```

### 2. Configure Cloudflare R2

1. Create a Cloudflare R2 bucket:
   - Go to Cloudflare Dashboard → R2
   - Create a new bucket (e.g., `nv-video-clipper`)

2. Generate API tokens:
   - Go to R2 → Manage R2 API Tokens
   - Create a new API token with read/write permissions
   - Copy the Access Key ID and Secret Access Key

3. (Optional) Set up public access:
   - Go to bucket settings → Public Access
   - Enable public access or configure custom domain

### 3. Configure Upstash Redis

1. Create a Redis database:
   - Go to https://console.upstash.com
   - Create a new Redis database
   - Copy the REST URL and REST Token

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=nv-video-clipper
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Do the same for the worker:

```bash
cd worker
cp .env.example .env
# Edit worker/.env with the same values
cd ..
```

### 5. Run Locally

**Terminal 1 - Next.js App:**
```bash
npm run dev
```

**Terminal 2 - Worker:**
```bash
cd worker
npm run dev
```

Open http://localhost:3000 in your browser.

## Deployment

### Deploy to Vercel (Frontend)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env`

4. Redeploy:
```bash
vercel --prod
```

### Deploy Worker to Google Cloud Run

1. Build the worker:
```bash
cd worker
npm run build
```

2. Build Docker image:
```bash
docker build -t nv-video-clipper-worker .
```

3. Tag for Google Container Registry:
```bash
docker tag nv-video-clipper-worker gcr.io/YOUR_PROJECT_ID/nv-video-clipper-worker
```

4. Push to GCR:
```bash
docker push gcr.io/YOUR_PROJECT_ID/nv-video-clipper-worker
```

5. Deploy to Cloud Run:
```bash
gcloud run deploy nv-video-clipper-worker \
  --image gcr.io/YOUR_PROJECT_ID/nv-video-clipper-worker \
  --platform managed \
  --region us-central1 \
  --set-env-vars "R2_ENDPOINT=...,R2_ACCESS_KEY_ID=...,R2_SECRET_ACCESS_KEY=...,R2_BUCKET_NAME=...,UPSTASH_REDIS_REST_URL=...,UPSTASH_REDIS_REST_TOKEN=..." \
  --cpu 2 \
  --memory 4Gi \
  --timeout 3600 \
  --no-cpu-throttling \
  --min-instances 1
```

**Alternative: Deploy to any Docker host**

```bash
docker run -d \
  --name nv-video-clipper-worker \
  -e R2_ENDPOINT="..." \
  -e R2_ACCESS_KEY_ID="..." \
  -e R2_SECRET_ACCESS_KEY="..." \
  -e R2_BUCKET_NAME="..." \
  -e UPSTASH_REDIS_REST_URL="..." \
  -e UPSTASH_REDIS_REST_TOKEN="..." \
  --restart unless-stopped \
  nv-video-clipper-worker
```

## FFmpeg Configuration

The worker uses the following FFmpeg command:

```bash
ffmpeg \
  -ss {startTime} \        # Start time (seeking before input for speed)
  -t {duration} \          # Clip duration (3-6 seconds)
  -i {input} \             # Input file
  -vf scale={W}:{H} \      # Scale to exact dimensions
  -c:v libx264 \           # H.264 codec
  -preset medium \         # Balance speed/compression
  -crf 30 \                # Quality (30 = smaller files, good quality)
  -an \                    # Remove audio (if enabled)
  -movflags +faststart \   # Enable streaming (metadata at start)
  -y \                     # Overwrite output
  {output}
```

**Key settings:**
- **CRF 30**: Good quality with smaller file size (range: 18-28 = great, 28-32 = good)
- **Preset medium**: Balanced encoding speed
- **faststart**: Enables progressive streaming
- **-ss before -i**: Fast seeking (doesn't decode unnecessary frames)

## API Reference

### POST /api/r2/upload-url

Generate a signed URL for direct browser-to-R2 upload.

**Response:**
```json
{
  "uploadUrl": "https://...",
  "key": "uploads/abc123.mp4"
}
```

### POST /api/jobs

Create a new video processing job.

**Request:**
```json
{
  "sourceKey": "uploads/abc123.mp4",
  "startTime": 5.5,
  "duration": 4.0,
  "size": "1920x1080",
  "removeAudio": true
}
```

**Response:**
```json
{
  "jobId": "xyz789"
}
```

### GET /api/jobs/[jobId]

Get job status and result.

**Response:**
```json
{
  "id": "xyz789",
  "status": "completed",
  "progress": 100,
  "resultUrl": "https://...",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

## Troubleshooting

### Upload fails
- Check R2 credentials and bucket name
- Verify CORS settings on R2 bucket
- Check browser console for errors

### Jobs stuck in "queued"
- Ensure worker is running
- Check worker logs
- Verify Redis connection

### FFmpeg errors
- Check video file format (should be standard MP4/MOV/WebM)
- Ensure start time + duration doesn't exceed video length
- Check worker logs for detailed FFmpeg output

### Worker crashes
- Ensure sufficient memory (4GB+ recommended)
- Check `/tmp` has enough space for video files
- Verify FFmpeg is installed in Docker container

## Performance Tips

1. **Use appropriate export size:**
   - 630×354 for small social media posts
   - 850×480 for medium quality
   - 1920×1080 for high quality

2. **Remove audio when possible:**
   - Significantly reduces file size
   - Faster encoding

3. **Scale workers:**
   - Run multiple worker instances for parallel processing
   - Each worker processes one job at a time

4. **Optimize R2 access:**
   - Use CDN in front of R2 for faster downloads
   - Configure appropriate cache headers

## Future Improvements

- [ ] Add visual timeline with thumbnail scrubbing
- [ ] Support batch processing (multiple clips)
- [ ] Add video filters (brightness, contrast, etc.)
- [ ] Implement webhook notifications for job completion
- [ ] Add video format conversion (WebM, GIF, etc.)
- [ ] Support longer clips (user-configurable max duration)
- [ ] Add video preview with trim markers
- [ ] Implement user accounts and history
- [ ] Add collaborative features (share clips)
- [ ] Support subtitle/caption overlay

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
