# Quick Start Guide

Get NV Video Clipper running in under 10 minutes!

## Prerequisites

- Node.js 20+ installed
- Cloudflare account (for R2 storage)
- Upstash account (for Redis)

## Step 1: Clone & Install (1 min)

```bash
# Navigate to project directory
cd "NV Video Clipper"

# Install dependencies
npm install

# Install worker dependencies
cd worker
npm install
cd ..
```

## Step 2: Set Up Cloudflare R2 (3 min)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
   - Name: `nv-video-clipper`
   - Location: Auto
4. Click **Manage R2 API Tokens**
5. Click **Create API Token**
   - Token name: `nv-video-clipper`
   - Permissions: **Admin Read & Write**
   - Apply to: **Specific buckets** → Select your bucket
6. Copy the **Access Key ID**, **Secret Access Key**, and **Endpoint URL**

## Step 3: Set Up Upstash Redis (2 min)

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **Create Database**
   - Name: `nv-video-clipper`
   - Type: **Regional**
   - Region: Choose closest to you
3. Click on your database
4. Copy the **REST URL** and **REST Token** (under REST API section)

## Step 4: Configure Environment (1 min)

Create `.env` in the root directory:

```env
# Cloudflare R2
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=nv-video-clipper
R2_PUBLIC_URL=https://nv-video-clipper.abc123.r2.cloudflarestorage.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `worker/.env` with the same content (excluding NEXT_PUBLIC_APP_URL).

## Step 5: Install FFmpeg (2 min)

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

Verify installation:
```bash
ffmpeg -version
```

## Step 6: Run the App (1 min)

Open two terminals:

**Terminal 1 - Next.js Frontend:**
```bash
npm run dev
```

**Terminal 2 - Worker:**
```bash
cd worker
npm run dev
```

## Step 7: Test It Out!

1. Open http://localhost:3000
2. Drag and drop a video file
3. Set trim times (3-6 seconds)
4. Choose export size
5. Click **Export Clip**
6. Watch the progress and download your clip!

## Troubleshooting

### "Upload failed"
- Check R2 credentials in `.env`
- Verify bucket name matches exactly

### "Jobs stuck in queued"
- Make sure worker is running (`cd worker && npm run dev`)
- Check worker terminal for errors

### "FFmpeg not found"
- Verify FFmpeg is installed: `ffmpeg -version`
- On Windows, ensure FFmpeg is in your PATH

### "Connection refused"
- Check Redis credentials
- Verify Redis URL and token are correct

## Next Steps

- Read the full [README.md](./README.md) for deployment instructions
- Check [worker/README.md](./worker/README.md) for FFmpeg details
- Deploy to Vercel and Cloud Run for production use

## Architecture at a Glance

```
Browser → Upload to R2 → Create Job in Redis
                              ↓
                         Worker polls Redis
                              ↓
                    Download → FFmpeg → Upload
                              ↓
                     Update job status in Redis
                              ↓
                      Browser polls → Download result
```

## Common First-Time Issues

**Q: Video uploads but nothing happens**
A: Make sure the worker is running in a separate terminal.

**Q: Worker crashes with memory error**
A: Ensure you have at least 2GB free RAM. Close other applications.

**Q: Export takes forever**
A: First encode is slow as FFmpeg initializes. Subsequent encodes are faster.

**Q: Can't access localhost:3000**
A: Check if port 3000 is already in use. Change port in package.json if needed.

## Production Checklist

Before deploying to production:

- [ ] Change all credentials (don't use dev credentials)
- [ ] Set up R2 bucket with proper CORS settings
- [ ] Configure Redis with production plan
- [ ] Deploy worker to Cloud Run or similar
- [ ] Set up monitoring and alerts
- [ ] Configure proper error logging
- [ ] Test with large video files
- [ ] Set up CDN in front of R2
- [ ] Configure rate limiting

## Support

Issues? Questions?
- Check the [README.md](./README.md)
- Review error messages in browser console and terminal
- Verify all environment variables are set correctly

Happy clipping! 🎬✂️
