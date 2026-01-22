# NV Video Clipper - Project Summary

## Overview

A production-ready web application for creating professional video clips with a sleek NVIDIA-inspired dark theme. Built with Next.js 15, featuring server-side FFmpeg processing via workers, direct browser-to-R2 uploads, and real-time progress tracking.

## Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                         │
│  • Next.js App (React 19 + TypeScript)                           │
│  • Dark NVIDIA-themed UI (Tailwind CSS)                          │
│  • Direct R2 uploads (no server proxy)                           │
└────────┬──────────────────────────────┬──────────────────────────┘
         │                               │
         │ GET signed URL                │ Poll job status
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js API Routes)                   │
│  • POST /api/r2/upload-url  → Generate signed upload URL        │
│  • POST /api/jobs           → Create job, push to queue         │
│  • GET  /api/jobs/[jobId]   → Return job status + result URL    │
└────────┬──────────────────────────────┬────────────────────────┘
         │                               │
         │ Store job                     │ Get job
         ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UPSTASH REDIS (Job Queue)                     │
│  • Queue: job:queue (LPUSH/RPOP)                                │
│  • Status: job:{id} (JSON)                                       │
│  • Progress updates from worker                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ RPOP job
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WORKER (Docker Container)                       │
│  • Node.js 20 + FFmpeg 7                                        │
│  • Poll queue every 5 seconds                                    │
│  • Download source from R2                                       │
│  • Process with FFmpeg (trim + scale + encode)                  │
│  • Upload result to R2                                           │
│  • Update progress in Redis                                      │
└────────┬────────────────────────────┬────────────────────────────┘
         │                             │
         │ Download/Upload             │
         ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE R2 (Object Storage)                │
│  • uploads/{id}.mp4    → Source videos                          │
│  • results/{id}.mp4    → Processed clips                        │
│  • Signed URLs for secure access                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3.4 (NVIDIA-inspired dark theme)
- **Language**: TypeScript 5.7
- **Fonts**: Inter (via Next.js Font Optimization)

### Backend
- **Runtime**: Next.js API Routes (Vercel Edge Functions)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Queue**: Upstash Redis (REST API)
- **SDK**: AWS SDK v3 (S3 client + request presigner)
- **Validation**: Zod

### Worker
- **Runtime**: Node.js 20
- **Video Processing**: FFmpeg 7
- **Container**: Docker (Debian Bookworm Slim)
- **Language**: TypeScript → ES2022

## Project Structure

```
nv-video-clipper/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── r2/upload-url/
│   │   │   │   └── route.ts          # Generate signed upload URL
│   │   │   └── jobs/
│   │   │       ├── route.ts          # Create job (POST)
│   │   │       └── [jobId]/
│   │   │           └── route.ts      # Get job status (GET)
│   │   ├── globals.css               # Tailwind + custom styles
│   │   ├── layout.tsx                # Root layout with header
│   │   └── page.tsx                  # Main application page
│   ├── components/
│   │   ├── UploadArea.tsx            # Drag & drop upload
│   │   ├── VideoPreview.tsx          # HTML5 video player
│   │   ├── TrimControls.tsx          # Time inputs + validation
│   │   ├── ExportControls.tsx        # Size/format/audio options
│   │   └── ExportProgress.tsx        # Job status + download
│   ├── lib/
│   │   ├── r2.ts                     # R2 client + signed URLs
│   │   └── redis.ts                  # Redis queue operations
│   └── types/
│       └── index.ts                  # Shared TypeScript types
├── worker/
│   ├── src/
│   │   ├── index.ts                  # Main worker loop
│   │   ├── processor.ts              # Job processing orchestration
│   │   ├── ffmpeg.ts                 # FFmpeg wrapper + progress
│   │   ├── r2.ts                     # R2 download/upload
│   │   ├── redis.ts                  # Redis client
│   │   └── types.ts                  # Worker types
│   ├── Dockerfile                    # Production container
│   ├── .dockerignore
│   ├── package.json
│   └── tsconfig.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── vercel.json
├── .gitignore
├── .env.example
├── README.md
├── QUICKSTART.md
└── PROJECT_SUMMARY.md (this file)
```

## Key Features

### User Experience
- ✅ Drag & drop video upload with progress bar
- ✅ Click to browse file picker fallback
- ✅ HTML5 video preview with native controls
- ✅ Precise trim controls (decimal seconds)
- ✅ 3-6 second clip duration enforcement
- ✅ Live validation with error messages
- ✅ Multiple export sizes (630×354, 850×480, 1920×1080)
- ✅ Optional audio removal toggle
- ✅ Real-time export progress (0-100%)
- ✅ Download button on completion
- ✅ Error handling with user-friendly messages

### Developer Experience
- ✅ Full TypeScript with strict mode
- ✅ Zod validation for API inputs
- ✅ Shared types between frontend and worker
- ✅ Environment variable validation
- ✅ Comprehensive error logging
- ✅ Docker-based worker deployment
- ✅ Hot reload in development
- ✅ Production-ready build pipeline

### Performance
- ✅ Direct browser-to-R2 uploads (no server proxy)
- ✅ Signed URLs for secure access
- ✅ Redis-based job queue (horizontal scaling)
- ✅ Optimized FFmpeg settings (CRF 30, medium preset)
- ✅ Fast seeking (-ss before -i)
- ✅ Streaming-enabled output (-movflags +faststart)
- ✅ Automatic cleanup of temp files

### Security
- ✅ Signed URLs with 1-hour expiration
- ✅ Environment variable-based secrets
- ✅ No file storage on Vercel filesystem
- ✅ Input validation on all endpoints
- ✅ CORS-safe architecture

## FFmpeg Configuration

### Command Structure

```bash
ffmpeg \
  -ss {startTime} \        # Start time (e.g., 5.5)
  -t {duration} \          # Duration (e.g., 4.0)
  -i {input} \             # Input file
  -vf scale={W}:{H} \      # Scale to exact size
  -c:v libx264 \           # H.264 codec
  -preset medium \         # Encoding speed
  -crf 30 \                # Quality setting
  -an \                    # Remove audio (optional)
  -movflags +faststart \   # Enable streaming
  -y \                     # Overwrite
  {output}
```

### Parameter Breakdown

| Parameter | Value | Explanation |
|-----------|-------|-------------|
| `-ss` | Before `-i` | Fast seeking (doesn't decode unnecessary frames) |
| `-t` | 3-6 seconds | Clip duration |
| `-vf scale` | Exact dimensions | Force exact output size |
| `-c:v libx264` | H.264 | Wide compatibility |
| `-preset medium` | Balanced | Speed vs compression |
| `-crf 30` | Quality | Lower = better quality (18-28 excellent, 28-32 good) |
| `-an` | Strip audio | ~30-50% size reduction |
| `-movflags +faststart` | Metadata first | Enable progressive streaming |

### Output Specifications

| Size | Dimensions | Use Case | Approx. Size (4s, CRF 30) |
|------|------------|----------|---------------------------|
| Small | 630×354 | Social media posts | ~200KB |
| Medium | 850×480 | Standard quality | ~400KB |
| Full HD | 1920×1080 | High quality | ~1MB |

## API Endpoints

### POST /api/r2/upload-url

Generate a signed upload URL for direct browser-to-R2 upload.

**Request**: None

**Response**:
```json
{
  "uploadUrl": "https://abc.r2.cloudflarestorage.com/...",
  "key": "uploads/xyz123.mp4"
}
```

### POST /api/jobs

Create a video processing job.

**Request**:
```json
{
  "sourceKey": "uploads/xyz123.mp4",
  "startTime": 5.5,
  "duration": 4.0,
  "size": "1920x1080",
  "removeAudio": true
}
```

**Validation**:
- `startTime`: ≥ 0
- `duration`: 3-6 seconds
- `size`: Must be one of: "630x354", "850x480", "1920x1080"
- `removeAudio`: boolean

**Response**:
```json
{
  "jobId": "abc789"
}
```

### GET /api/jobs/[jobId]

Get job status and result.

**Response**:
```json
{
  "id": "abc789",
  "status": "completed",
  "progress": 100,
  "sourceKey": "uploads/xyz123.mp4",
  "startTime": 5.5,
  "duration": 4.0,
  "size": "1920x1080",
  "removeAudio": true,
  "resultKey": "results/abc789.mp4",
  "resultUrl": "https://abc.r2.cloudflarestorage.com/...",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**Status values**:
- `queued`: Job created, waiting for worker
- `processing`: Worker is encoding video
- `completed`: Job done, result available
- `failed`: Error occurred, check `error` field

## Environment Variables

### Required (both app and worker)

```env
# Cloudflare R2
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=nv-video-clipper
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### App-only

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

### Frontend (Vercel)

```bash
# Deploy
vercel

# Add environment variables in dashboard
# Then deploy to production
vercel --prod
```

### Worker (Google Cloud Run)

```bash
cd worker
npm run build
docker build -t gcr.io/PROJECT_ID/nv-video-clipper-worker .
docker push gcr.io/PROJECT_ID/nv-video-clipper-worker

gcloud run deploy nv-video-clipper-worker \
  --image gcr.io/PROJECT_ID/nv-video-clipper-worker \
  --region us-central1 \
  --cpu 2 --memory 4Gi \
  --min-instances 1 \
  --set-env-vars "..."
```

## Scaling Strategy

### Horizontal Scaling (Recommended)

Run multiple worker instances. Each pops from the same Redis queue:

```bash
# Cloud Run
gcloud run services update nv-video-clipper-worker --min-instances 3

# Docker
docker run -d --name worker-1 ...
docker run -d --name worker-2 ...
docker run -d --name worker-3 ...
```

### Auto-scaling

Monitor queue depth and scale:

```bash
# Get queue size
QUEUE_SIZE=$(redis-cli LLEN job:queue)

# Scale workers based on queue
if [ $QUEUE_SIZE -gt 10 ]; then
  # Scale up
fi
```

### Performance Metrics

- **Single worker**: ~1-2 jobs/minute (depends on video complexity)
- **Upload speed**: Direct to R2 (no bottleneck)
- **Processing time**: 5-15 seconds per 4-second clip
- **Download speed**: R2 signed URL (CDN-cacheable)

## UI Design

### Color Palette

```css
--nvidia-green: #76B900         /* Primary action color */
--nvidia-green-hover: #88CC00   /* Hover state */
--nvidia-dark: #0A0A0A          /* Card background */
--nvidia-darker: #050505        /* Page background */
--nvidia-gray: #1A1A1A          /* Input background */
--nvidia-gray-light: #2A2A2A    /* Hover background */
--nvidia-border: #333333        /* Border color */
```

### Design Principles

1. **High Contrast**: White text on near-black background
2. **Subtle Accents**: NVIDIA green used sparingly for CTAs
3. **Soft Glows**: Box shadows with green/20% opacity
4. **Rounded Corners**: 8-12px border radius throughout
5. **Generous Spacing**: 24-32px gaps between sections
6. **Clear Hierarchy**: Bold headings, medium labels, light descriptions
7. **Focus States**: Visible ring with green accent
8. **Hover Feedback**: Border color transitions (200ms)

## Testing Checklist

### Manual Testing

- [ ] Upload video (drag & drop)
- [ ] Upload video (click to browse)
- [ ] Play video preview
- [ ] Adjust start time
- [ ] Adjust duration
- [ ] Validate duration constraints (3-6s)
- [ ] Export at each size (630×354, 850×480, 1920×1080)
- [ ] Export with audio
- [ ] Export without audio
- [ ] Monitor progress updates
- [ ] Download completed clip
- [ ] Play downloaded clip
- [ ] Test with different video formats (MP4, MOV, WebM)
- [ ] Test with large files (>100MB)
- [ ] Test error cases (invalid times, network failure)

### Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Common Issues & Solutions

### Upload fails
- **Cause**: R2 credentials incorrect
- **Fix**: Verify `.env` variables, check bucket name

### Jobs stuck in "queued"
- **Cause**: Worker not running
- **Fix**: Start worker (`cd worker && npm run dev`)

### FFmpeg errors
- **Cause**: Invalid video or times
- **Fix**: Check video format, verify start + duration ≤ video length

### Worker crashes
- **Cause**: Out of memory
- **Fix**: Increase Docker memory limit, ensure 4GB+ available

## Future Enhancements

### High Priority
- [ ] Visual timeline with thumbnail scrubbing
- [ ] Batch processing (multiple clips)
- [ ] Video preview with trim markers overlaid

### Medium Priority
- [ ] Video filters (brightness, contrast, saturation)
- [ ] Webhook notifications on completion
- [ ] Format conversion (WebM, GIF)
- [ ] Longer clip support (user-configurable max)

### Low Priority
- [ ] User accounts and history
- [ ] Collaborative features (share clips)
- [ ] Subtitle/caption overlay
- [ ] Custom watermarks

## Resources

- **Main README**: [README.md](./README.md)
- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md)
- **Worker Docs**: [worker/README.md](./worker/README.md)
- **Vercel Docs**: https://vercel.com/docs
- **Cloudflare R2**: https://developers.cloudflare.com/r2
- **Upstash Redis**: https://docs.upstash.com/redis
- **FFmpeg Docs**: https://ffmpeg.org/documentation.html

## License

MIT

---

**Built with ❤️ using Next.js, React, TypeScript, Tailwind CSS, and FFmpeg**
