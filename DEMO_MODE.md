# Demo Mode - Testing Locally

Your app is now running in **Demo Mode**, which lets you test the UI and basic functionality without setting up cloud services!

## ✅ What Works in Demo Mode

1. **Upload Videos** 
   - Drag & drop or click to upload
   - Files are stored locally in browser memory
   - Progress bar animation works

2. **Video Preview**
   - HTML5 video player with controls
   - Play, pause, seek, volume control

3. **Trim Controls**
   - Set start time (seconds)
   - Set duration (3-6 seconds)
   - Live validation
   - Clip range calculation

4. **UI Testing**
   - Full NVIDIA dark theme
   - All animations and transitions
   - Hover effects and focus states
   - Responsive layout

## ⚠️ What Doesn't Work (Requires Cloud Setup)

1. **Video Export**
   - Clicking "Export Clip" shows a demo mode alert
   - Actual FFmpeg processing requires:
     - Cloudflare R2 (storage)
     - Upstash Redis (job queue)
     - Worker with FFmpeg running

## 🎬 Try It Now!

### Step 1: Open the App
- URL: **http://localhost:3000**
- You'll see a yellow "Demo Mode Active" banner at the top

### Step 2: Upload a Video
1. Drag a video file onto the upload area, OR
2. Click the upload area and browse for a file
3. Watch the simulated upload progress (0-100%)

### Step 3: Preview & Trim
1. Once uploaded, the video appears
2. Play the video to find a good clip
3. Set **Start Time** (e.g., 5.5 seconds)
4. Set **Duration** (e.g., 4.0 seconds)
5. Watch the validation update in real-time

### Step 4: Configure Export
1. Choose export size (630×354, 850×480, or 1920×1080)
2. Toggle "Remove Audio" on/off
3. Click "Export Clip" to see the demo mode message

## 🚀 Ready for Full Functionality?

To enable actual video processing, you need to set up:

### 1. Cloudflare R2 (5 minutes)
```bash
# Go to: https://dash.cloudflare.com
# 1. Navigate to R2 Object Storage
# 2. Create bucket: nv-video-clipper
# 3. Create API token with Admin Read & Write
# 4. Copy: Access Key ID, Secret Access Key, Endpoint URL
```

### 2. Upstash Redis (3 minutes)
```bash
# Go to: https://console.upstash.com
# 1. Create a new Redis database
# 2. Copy: REST URL and REST Token
```

### 3. Update Environment Variables
Edit `.env` in the root directory:

```env
# Replace placeholder values with real credentials
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_real_access_key
R2_SECRET_ACCESS_KEY=your_real_secret_key
R2_BUCKET_NAME=nv-video-clipper
R2_PUBLIC_URL=https://your-bucket.r2.dev

UPSTASH_REDIS_REST_URL=https://your-real-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_real_token
```

Also update `worker/.env` with the same values.

### 4. Restart the App
```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### 5. Start the Worker
```bash
# In a new terminal:
cd worker
npm run dev
```

Now uploads will go to R2, and exports will be processed by FFmpeg!

## 📸 Demo Mode Screenshots

When you open http://localhost:3000, you should see:

1. **Yellow Banner** at the top: "Demo Mode Active"
2. **Dark Theme**: Black/near-black background
3. **Green Accent**: NVIDIA green (#76B900) on buttons
4. **Upload Area**: Drag & drop zone with icon
5. **Smooth Animations**: Hover effects everywhere

## 🐛 Troubleshooting Demo Mode

### Upload shows error
- Refresh the page (Ctrl+R or Cmd+R)
- Check browser console (F12) for errors
- Make sure you're using a video file (MP4, MOV, WebM)

### Video doesn't play
- Try a different video file
- Check that it's a standard web-compatible format (MP4 with H.264)

### Changes not showing
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Check terminal - Next.js should say "✓ Compiled in XXms"

### Demo banner not showing
- The banner only shows when R2_ENDPOINT is missing or contains "placeholder"
- Check your .env file

## 💡 Tips

1. **Test with short videos** (under 1 minute) for faster loading
2. **Use MP4 format** for best browser compatibility
3. **Open browser DevTools** (F12) to see demo mode logs
4. **Try different trim ranges** to test validation
5. **Resize browser window** to test responsive design

## Next Steps

Once you're happy with the UI and flow in demo mode:

1. Set up R2 and Redis (15 minutes total)
2. Update environment variables
3. Restart the app
4. Start the worker
5. Export real video clips!

See [README.md](./README.md) for full setup instructions.

---

**Enjoying the demo?** The full version with FFmpeg processing is just a few env vars away! 🎥✂️
