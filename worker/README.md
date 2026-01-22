# NV Video Clipper Worker

FFmpeg video processing worker for NV Video Clipper. This service runs as a standalone Docker container that processes video trimming jobs from a Redis queue.

## Architecture

```
┌─────────────────┐
│  Upstash Redis  │
│   (Job Queue)   │
└────────┬────────┘
         │
         │ Pop job (RPOP)
         ▼
┌─────────────────┐
│     Worker      │
│   (This app)    │
└────────┬────────┘
         │
         │ 1. Download source
         ▼
┌─────────────────┐
│  Cloudflare R2  │
│  (Source file)  │
└─────────────────┘
         │
         │ 2. Process with FFmpeg
         ▼
┌─────────────────┐
│   /tmp/video-   │
│   processing/   │
└─────────────────┘
         │
         │ 3. Upload result
         ▼
┌─────────────────┐
│  Cloudflare R2  │
│  (Result file)  │
└─────────────────┘
         │
         │ 4. Update job status
         ▼
┌─────────────────┐
│  Upstash Redis  │
│  (Job status)   │
└─────────────────┘
```

## Features

- Polls Redis queue for new jobs
- Downloads source videos from R2
- Processes videos with FFmpeg:
  - Precise trimming (3-6 seconds)
  - Scaling to specified dimensions
  - Audio removal (optional)
  - H.264 encoding with optimized settings
- Uploads results to R2
- Updates job progress in real-time
- Automatic cleanup of temporary files
- Graceful error handling

## Requirements

- Node.js 20+
- FFmpeg 7+ (included in Docker image)
- Access to Cloudflare R2
- Access to Upstash Redis

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=nv-video-clipper

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

### 3. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### 4. Run in Development Mode

```bash
npm run dev
```

The worker will start polling for jobs every 5 seconds.

## Docker Deployment

### Build Image

```bash
npm run build
docker build -t nv-video-clipper-worker .
```

### Run Container

```bash
docker run -d \
  --name nv-video-clipper-worker \
  -e R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com" \
  -e R2_ACCESS_KEY_ID="your_access_key" \
  -e R2_SECRET_ACCESS_KEY="your_secret_key" \
  -e R2_BUCKET_NAME="nv-video-clipper" \
  -e UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io" \
  -e UPSTASH_REDIS_REST_TOKEN="your_token" \
  --restart unless-stopped \
  nv-video-clipper-worker
```

### View Logs

```bash
docker logs -f nv-video-clipper-worker
```

### Stop Container

```bash
docker stop nv-video-clipper-worker
docker rm nv-video-clipper-worker
```

## Cloud Deployment

### Google Cloud Run

```bash
# Build and push
docker build -t gcr.io/YOUR_PROJECT_ID/nv-video-clipper-worker .
docker push gcr.io/YOUR_PROJECT_ID/nv-video-clipper-worker

# Deploy
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

### AWS ECS / Fargate

1. Push image to ECR
2. Create task definition with environment variables
3. Create service with desired capacity

### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name nv-video-clipper-worker \
  --image nv-video-clipper-worker \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    R2_ENDPOINT=... \
    R2_ACCESS_KEY_ID=... \
    R2_SECRET_ACCESS_KEY=... \
    R2_BUCKET_NAME=... \
    UPSTASH_REDIS_REST_URL=... \
    UPSTASH_REDIS_REST_TOKEN=...
```

## FFmpeg Command Explained

The worker uses this FFmpeg command:

```bash
ffmpeg \
  -ss 5.5 \                # Start at 5.5 seconds
  -t 4.0 \                 # Duration of 4 seconds
  -i input.mp4 \           # Input file
  -vf scale=1920:1080 \    # Scale to 1920x1080
  -c:v libx264 \           # Use H.264 codec
  -preset medium \         # Encoding speed/quality balance
  -crf 30 \                # Constant Rate Factor (quality)
  -an \                    # Remove audio
  -movflags +faststart \   # Enable progressive streaming
  -y \                     # Overwrite output
  output.mp4
```

**Parameter Details:**

- **-ss before -i**: Fast seeking (doesn't decode unnecessary frames)
- **-t**: Duration to encode
- **-vf scale**: Resize video to exact dimensions
- **-c:v libx264**: H.264 codec for wide compatibility
- **-preset medium**: Balance between speed and compression (fast/medium/slow)
- **-crf 30**: Quality setting (lower = better quality, larger file)
  - 18-28: Excellent quality
  - 28-32: Good quality, smaller files
  - 32-40: Lower quality
- **-an**: Strip audio track (reduces file size significantly)
- **-movflags +faststart**: Move metadata to beginning for streaming

## Progress Tracking

The worker parses FFmpeg output to track progress:

```
FFmpeg output: "time=00:00:03.45"
                     HH  MM  SS.FF

Parsed as: 3.45 seconds encoded
Progress: (3.45 / 4.0) * 100 = 86%
```

Progress is mapped to overall job progress:
- 0-10%: Downloading source
- 10-90%: FFmpeg processing (linear interpolation)
- 90-100%: Uploading result

## Resource Requirements

**Minimum:**
- CPU: 1 core
- Memory: 2GB
- Disk: 5GB (for temporary files)

**Recommended:**
- CPU: 2 cores
- Memory: 4GB
- Disk: 10GB

**For high throughput:**
- Run multiple worker instances
- Each processes one job at a time
- Scale horizontally based on queue depth

## Monitoring

### Health Checks

The worker runs continuously. Monitor it by:

1. **Docker health:**
```bash
docker inspect --format='{{.State.Health.Status}}' nv-video-clipper-worker
```

2. **Process logs:**
```bash
docker logs -f nv-video-clipper-worker
```

3. **Redis queue depth:**
```bash
# Using redis-cli or Upstash console
LLEN job:queue
```

### Common Log Messages

- `Worker started. Waiting for jobs...` - Worker is running
- `Received job: xyz789` - Job picked up
- `Processing job xyz789` - Job started
- `Downloading ...` - Downloading source from R2
- `Processing video...` - FFmpeg encoding in progress
- `Uploading result...` - Uploading result to R2
- `Job xyz789 completed successfully` - Job finished
- `Job xyz789 failed: ...` - Job failed with error

## Troubleshooting

### Worker not processing jobs

1. Check Redis connection:
```bash
# Test Redis connection
curl -X POST $UPSTASH_REDIS_REST_URL/get/test \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

2. Check queue:
```bash
# Check if jobs are queued
LLEN job:queue
```

3. Check worker logs:
```bash
docker logs -f nv-video-clipper-worker
```

### FFmpeg errors

1. **"Invalid data found when processing input"**
   - Source file is corrupted or invalid format
   - Re-upload the video

2. **"Conversion failed"**
   - Check start time and duration are valid
   - Ensure start + duration <= video length

3. **"Cannot allocate memory"**
   - Increase container memory limit
   - Reduce concurrent jobs

### R2 connection errors

1. Check credentials:
```bash
# Test R2 connection
aws s3 ls s3://$R2_BUCKET_NAME \
  --endpoint-url $R2_ENDPOINT
```

2. Verify bucket name and endpoint

3. Check network connectivity from worker

### Out of disk space

1. Check `/tmp` usage:
```bash
docker exec nv-video-clipper-worker df -h /tmp
```

2. Increase container disk allocation

3. Verify cleanup is working (old files should be deleted)

## Performance Tuning

### FFmpeg Preset

Change in `src/ffmpeg.ts`:

```typescript
// Faster encoding, larger files
"-preset", "fast"

// Balanced (default)
"-preset", "medium"

// Slower encoding, smaller files
"-preset", "slow"
```

### CRF (Quality)

Lower CRF = better quality, larger files:

```typescript
// High quality, larger files
"-crf", "23"

// Balanced (default)
"-crf", "30"

// Lower quality, smaller files
"-crf", "35"
```

### Polling Interval

Change in `src/index.ts`:

```typescript
// More frequent (higher CPU, faster response)
const POLL_INTERVAL = 1000; // 1 second

// Less frequent (lower CPU, slower response)
const POLL_INTERVAL = 10000; // 10 seconds
```

## Scaling

### Horizontal Scaling

Run multiple worker instances:

```bash
# Run 3 workers
for i in {1..3}; do
  docker run -d \
    --name nv-video-clipper-worker-$i \
    -e ... \
    nv-video-clipper-worker
done
```

Workers will automatically coordinate via Redis queue (RPOP is atomic).

### Auto-scaling

Monitor queue depth and scale workers:

```bash
# Get queue size
QUEUE_SIZE=$(redis-cli -u $REDIS_URL LLEN job:queue)

# Scale workers based on queue
if [ $QUEUE_SIZE -gt 10 ]; then
  # Scale up
fi
```

## Development

### Project Structure

```
worker/
├── src/
│   ├── index.ts          # Main worker loop
│   ├── processor.ts      # Job processing orchestration
│   ├── ffmpeg.ts         # FFmpeg wrapper and command builder
│   ├── r2.ts            # R2 upload/download
│   ├── redis.ts         # Redis queue operations
│   └── types.ts         # TypeScript types
├── Dockerfile           # Production container
├── package.json
├── tsconfig.json
└── README.md
```

### Add New Features

1. **Custom encoding preset:**
   - Edit `src/ffmpeg.ts`
   - Add parameter to job type
   - Update API validation

2. **Video filters:**
   - Add to `-vf` flag in `src/ffmpeg.ts`
   - Example: `-vf "scale=1920:1080,hue=s=1.5"`

3. **Webhook notifications:**
   - Add HTTP POST in `src/processor.ts` after job completion
   - Include job ID and result URL

## License

MIT
