# Cloud Services Setup Guide

Complete step-by-step guide to set up Cloudflare R2 and Upstash Redis for full video processing functionality.

---

## Part 1: Cloudflare R2 Setup (5-7 minutes)

### Step 1: Create Cloudflare Account
1. Go to: **https://dash.cloudflare.com/sign-up**
2. Sign up for free account (no credit card required for R2)
3. Verify your email

### Step 2: Enable R2
1. Log into Cloudflare Dashboard
2. In the left sidebar, find **R2 Object Storage**
3. Click **Purchase R2** (it's free to start - 10GB storage, 1M read operations/month)
4. Accept the terms

### Step 3: Create R2 Bucket
1. Click **Create bucket**
2. Enter bucket name: **`nv-video-clipper`** (must be lowercase, no spaces)
3. Choose location: **Automatic** (recommended)
4. Leave other settings default
5. Click **Create bucket**

### Step 4: Generate API Token
1. Go back to R2 overview page
2. Click **Manage R2 API Tokens** (on the right side)
3. Click **Create API Token**
4. Configure token:
   - **Token name**: `nv-video-clipper-token`
   - **Permissions**: Select **Admin Read & Write**
   - **TTL**: Leave as default (Forever)
   - **Apply to specific buckets**: Select **nv-video-clipper**
5. Click **Create API Token**

### Step 5: Save Credentials (IMPORTANT!)
You'll see a screen with credentials - **copy these immediately** (they won't be shown again):

```
Access Key ID: abcd1234567890abcdef
Secret Access Key: xyz7890abcdef1234567890xyz
Jurisdiction-specific endpoint for S3 API: https://abcd1234567890.r2.cloudflarestorage.com
```

Copy:
- ✅ Access Key ID
- ✅ Secret Access Key  
- ✅ Endpoint URL (the full https://... URL)

**Save these in a text file temporarily!**

### Step 6: Get Your Account ID
1. Go back to R2 overview page
2. Look at the top - you'll see your Account ID
3. Copy it (format: `abcd1234567890abcdef1234567890ab`)

Your R2 endpoint will be: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### Step 7: Configure CORS (Optional but Recommended)
For direct browser uploads:

1. Click on your **nv-video-clipper** bucket
2. Go to **Settings** tab
3. Scroll to **CORS Policy**
4. Click **Edit CORS Policy**
5. Add this configuration:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

6. Click **Save**

---

## Part 2: Upstash Redis Setup (3-5 minutes)

### Step 1: Create Upstash Account
1. Go to: **https://console.upstash.com/login**
2. Sign up with GitHub, Google, or email (free tier available)
3. Verify your account

### Step 2: Create Redis Database
1. Click **Create Database**
2. Configure database:
   - **Name**: `nv-video-clipper`
   - **Type**: Select **Regional** (faster for single region)
   - **Region**: Choose closest to you (e.g., `us-east-1`)
   - **TLS**: Leave enabled ✓
   - **Eviction**: Leave as default
3. Click **Create**

### Step 3: Get Credentials
After creation, you'll see your database dashboard:

1. Look for the **REST API** section
2. Copy these two values:
   - **UPSTASH_REDIS_REST_URL**: `https://your-db-name-12345.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN**: `AaBbCc...` (long token string)

**Save these in your text file!**

---

## Part 3: Update Environment Variables

Now let's update your `.env` files with the real credentials.

### Step 1: Update Main App `.env`

Open: `/Users/mpechardo/Desktop/NVIDIA/NV Video Clipper/.env`

Replace with your actual values:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_actual_access_key_here
R2_SECRET_ACCESS_KEY=your_actual_secret_key_here
R2_BUCKET_NAME=nv-video-clipper
R2_PUBLIC_URL=https://nv-video-clipper.YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-actual-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_actual_token_here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Update Worker `.env`

Open: `/Users/mpechardo/Desktop/NVIDIA/NV Video Clipper/worker/.env`

Use the **same values**:

```env
# Cloudflare R2 Configuration
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_actual_access_key_here
R2_SECRET_ACCESS_KEY=your_actual_secret_key_here
R2_BUCKET_NAME=nv-video-clipper

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-actual-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_actual_token_here
```

---

## Part 4: Restart Services

### Step 1: Stop the Current Server
In the terminal running `npm run dev`:
- Press **Ctrl+C** (or **Cmd+C** on Mac)

### Step 2: Restart Next.js App
```bash
cd "/Users/mpechardo/Desktop/NVIDIA/NV Video Clipper"
npm run dev
```

Wait for: `✓ Ready in XXXXms`

### Step 3: Start the Worker (NEW TERMINAL)
Open a **new terminal window/tab**:

```bash
cd "/Users/mpechardo/Desktop/NVIDIA/NV Video Clipper/worker"
npm run dev
```

You should see:
```
Worker started. Waiting for jobs...
```

---

## Part 5: Test Everything! 🎉

### Test 1: Verify Demo Mode is OFF
1. Open: **http://localhost:3000**
2. **Yellow banner should be GONE** (no more "Demo Mode Active")
3. If banner still shows, check your .env file has real credentials

### Test 2: Upload a Video
1. Drag & drop a short video file (MP4 recommended)
2. Watch the upload progress bar
3. Video should appear in the player
4. **Check browser DevTools console** (F12) - should NOT say "Demo Mode"

### Test 3: Trim the Video
1. Play the video to find a good section
2. Set **Start Time**: e.g., `5.5` (seconds)
3. Set **Duration**: e.g., `4.0` (3-6 seconds required)
4. Verify the clip range shows correctly

### Test 4: Export & Process
1. Choose **Export Size**: 1920x1080 (or any size)
2. Toggle **Remove Audio**: ON (recommended for smaller files)
3. Click **Export Clip** button
4. Watch the progress:
   - Status: Queued → Processing → Completed
   - Progress bar: 0% → 100%
5. **Download** button appears when done
6. Click download and play the clip!

### Test 5: Check Worker Logs
In the worker terminal, you should see:
```
Received job: abc123
Processing job abc123
Downloading uploads/xyz.mp4...
Processing video...
Uploading result...
Job abc123 completed successfully
```

---

## Troubleshooting

### "Upload failed" Error
- **Check**: R2 credentials in `.env` are correct
- **Check**: Bucket name matches exactly: `nv-video-clipper`
- **Try**: Restart the Next.js server (Ctrl+C, then `npm run dev`)

### Jobs Stuck in "Queued"
- **Check**: Worker is running (`cd worker && npm run dev`)
- **Check**: Worker terminal shows "Worker started. Waiting for jobs..."
- **Check**: Redis credentials are correct

### Worker Shows Errors
- **Check**: FFmpeg is installed (`ffmpeg -version`)
- **Check**: Worker `.env` file has all credentials
- **Check**: R2 endpoint doesn't have trailing slash

### "Job not found" Error
- **Check**: Redis URL and token are correct
- **Test Redis**: Go to Upstash console → Data Browser → should see jobs

### Video Processing Fails
- **Check**: Video format is standard (MP4 with H.264)
- **Check**: Start time + duration doesn't exceed video length
- **Check**: Worker terminal for FFmpeg error messages

### CORS Errors in Browser
- **Check**: CORS policy is set in R2 bucket settings
- **Add**: Your localhost URL to CORS AllowedOrigins

---

## Verify Setup Checklist

Before testing, verify:

- [ ] Cloudflare R2 bucket created: `nv-video-clipper`
- [ ] R2 API token generated with Admin Read & Write
- [ ] Upstash Redis database created
- [ ] Main app `.env` updated with real credentials
- [ ] Worker `.env` updated with real credentials
- [ ] Next.js server restarted
- [ ] Worker started in separate terminal
- [ ] FFmpeg installed and working
- [ ] Both terminals showing no errors

---

## Cost Estimate

**Cloudflare R2** (Free Tier):
- Storage: First 10 GB free
- Operations: 1M reads, 1M writes per month free
- Bandwidth: Free egress (outbound data)

**Upstash Redis** (Free Tier):
- Max 10,000 commands per day
- 256 MB storage
- Perfect for testing

**Typical usage for development**: $0/month

**Production estimate** (1000 clips/month):
- R2: ~$0.50/month (storage + operations)
- Redis: ~$2/month (beyond free tier)

---

## Next Steps

Once everything works locally:

1. **Deploy Frontend**: Push to Vercel
2. **Deploy Worker**: Build Docker image → Deploy to Cloud Run
3. **Update CORS**: Add your Vercel domain to R2 CORS
4. **Monitor**: Check R2 and Redis dashboards for usage

See [README.md](./README.md) for deployment instructions.

---

**Need Help?**
- Check terminal outputs for errors
- Review browser console (F12) for client-side errors
- Verify credentials are copy-pasted correctly (no extra spaces!)
- Make sure both services (app + worker) are running

Good luck! 🚀
