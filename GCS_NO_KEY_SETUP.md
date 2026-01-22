# GCS Setup Without Service Account Keys

**Can't download service account keys?** This is common with organization accounts!

Use **Application Default Credentials** instead - it works perfectly for local development.

---

## 🎯 **What You'll Do**

Instead of downloading a JSON key file, you'll:
1. Authenticate with your own Google account
2. Grant yourself Storage Admin permissions
3. Let the app use your credentials automatically

---

## ⚡ **Quick Setup (5 minutes)**

### **Option A: Automated Script** (Easiest)

```bash
cd "/Users/mpechardo/Desktop/NVIDIA/NV Video Clipper"
./setup-gcs-adc.sh
```

The script will:
- ✅ Guide you through authentication
- ✅ Set up your project
- ✅ Grant necessary permissions
- ✅ Create .env files automatically

---

### **Option B: Manual Setup**

#### **Step 1: Install Google Cloud CLI**

```bash
# Check if installed
gcloud --version

# If not, install:
brew install google-cloud-sdk
```

#### **Step 2: Authenticate**

```bash
gcloud auth application-default login
```

This opens your browser - sign in with your Google account that has access to the GCS project.

#### **Step 3: Set Your Project**

```bash
gcloud config set project YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your project (e.g., `nv-video-clipper-michal`)

#### **Step 4: Grant Yourself Permissions**

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="user:YOUR_EMAIL@gmail.com" \
    --role="roles/storage.objectAdmin"
```

Replace:
- `YOUR_PROJECT_ID` with your actual project ID
- `YOUR_EMAIL@gmail.com` with your Google account email

#### **Step 5: Create .env Files**

Create `.env` in project root:

```env
# Google Cloud Storage (Application Default Credentials)
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=nv-video-clipper-yourname
# No GCS_CREDENTIALS_PATH needed!

# Redis (get from https://console.upstash.com)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `worker/.env`:

```env
# Google Cloud Storage (Application Default Credentials)
GCS_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=nv-video-clipper-yourname
# No GCS_CREDENTIALS_PATH needed!

# Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

#### **Step 6: Install Dependencies**

```bash
npm install
cd worker && npm install && cd ..
```

#### **Step 7: Start Services**

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
cd worker && npm run dev
```

---

## ✅ **How to Verify It's Working**

When the worker starts, you should see:

```
✓ Using Google Cloud Storage with Application Default Credentials
Worker started. Waiting for jobs...
```

When you upload a video:
- ✅ No "Demo Mode" banner
- ✅ Upload progress shows
- ✅ Video appears in player
- ✅ Export works!

---

## 🆚 **Comparison**

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Service Account Key** | Production, team projects | Portable, can share | Requires key download permission |
| **Application Default Credentials** | Local development, org restrictions | No key needed, simple setup | Uses your personal account |

---

## 🔒 **Security Notes**

**Application Default Credentials:**
- ✅ Uses your personal Google account
- ✅ Credentials stored securely by Google Cloud SDK
- ✅ Perfect for local development
- ⚠️ For production deployment, use service account keys or Workload Identity

**Where are credentials stored?**
- macOS: `~/.config/gcloud/application_default_credentials.json`
- These are automatically rotated by Google
- Never commit this file to git

---

## 🐛 **Troubleshooting**

### "Could not load Application Default Credentials"

**Fix:**
```bash
gcloud auth application-default login
```

### "Permission denied" when uploading

**Fix:** Make sure you granted yourself the role:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="user:YOUR_EMAIL@gmail.com" \
    --role="roles/storage.objectAdmin"
```

### "Project not found"

**Fix:** Set the correct project:
```bash
gcloud config set project YOUR_PROJECT_ID
```

### Worker can't access storage

**Fix:** The worker runs in the same environment, so it uses the same credentials automatically. Just make sure both `.env` files have the correct `GCS_PROJECT_ID` and `GCS_BUCKET_NAME`.

---

## 🚀 **Next Steps**

1. Still need **Redis** for job queue:
   - Use **Upstash Redis** (free tier): https://console.upstash.com
   - Or ask if you want local SQLite instead

2. Still need **CORS** configuration:
   - Use the `cors.json` file I created
   - Run: `gsutil cors set cors.json gs://YOUR_BUCKET_NAME`

3. **Test everything**:
   - Upload video
   - Trim it
   - Export clip
   - Download result

---

## 💡 **Why This Works**

The Google Cloud Storage library checks for credentials in this order:

1. ~~Explicit key file (GCS_CREDENTIALS_PATH)~~ ← You can't get this
2. **Application Default Credentials** ← This is what we're using! ✅
3. Workload Identity (for GKE/Cloud Run)

By authenticating with `gcloud auth application-default login`, we set up option #2.

---

**Ready to start?** Run the setup script:

```bash
./setup-gcs-adc.sh
```

Or follow the manual steps above! 🎬
