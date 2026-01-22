#!/bin/bash

# NV Video Clipper - GCS Setup with Application Default Credentials
# Use this when you CAN'T download service account keys (organization restrictions)

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   GCS Setup - Application Default Credentials Method          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This method uses YOUR Google account instead of service account keys."
echo "Perfect for organization accounts with key creation restrictions!"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI (gcloud) is not installed"
    echo ""
    echo "Install it now with:"
    echo "  brew install google-cloud-sdk"
    echo ""
    exit 1
fi

echo "✓ Google Cloud CLI found"
echo ""

# Get project ID
read -p "Enter your GCS Project ID (e.g., nv-video-clipper-michal): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID cannot be empty"
    exit 1
fi

# Get bucket name
read -p "Enter your GCS Bucket Name (e.g., nv-video-clipper-michal): " BUCKET_NAME

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Bucket name cannot be empty"
    exit 1
fi

# Get user email
read -p "Enter your Google account email (e.g., you@gmail.com): " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
    echo "❌ Email cannot be empty"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Step 1: Authenticating with Google Cloud..."
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "This will open your browser for authentication."
read -p "Press Enter to continue..."

gcloud auth application-default login

echo ""
echo "✓ Authentication complete"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 2: Setting default project..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

gcloud config set project "$PROJECT_ID"

echo ""
echo "✓ Project set to: $PROJECT_ID"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 3: Granting Storage Admin permissions..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="user:$USER_EMAIL" \
    --role="roles/storage.objectAdmin" \
    --quiet

echo ""
echo "✓ Permissions granted"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  Step 4: Redis Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Options:"
echo "1) Use Upstash Redis (free tier, recommended)"
echo "2) Skip for now (demo mode)"
echo ""
read -p "Choose option (1 or 2): " redis_option

if [ "$redis_option" = "1" ]; then
    echo ""
    echo "Go to: https://console.upstash.com"
    echo "Create a database and copy the credentials"
    echo ""
    read -p "Upstash Redis REST URL: " REDIS_URL
    read -p "Upstash Redis REST Token: " REDIS_TOKEN
else
    REDIS_URL="https://placeholder.upstash.io"
    REDIS_TOKEN="placeholder_token"
    echo "⚠️  Using placeholder Redis values (demo mode)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Step 5: Creating .env files..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create main .env file (NO credentials path)
cat > .env << EOF
# Google Cloud Storage Configuration (using Application Default Credentials)
GCS_PROJECT_ID=${PROJECT_ID}
GCS_BUCKET_NAME=${BUCKET_NAME}
# GCS_CREDENTIALS_PATH is NOT set - will use Application Default Credentials

# Redis Configuration
UPSTASH_REDIS_REST_URL=${REDIS_URL}
UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ Created: .env"

# Create worker .env file
cat > worker/.env << EOF
# Google Cloud Storage Configuration (using Application Default Credentials)
GCS_PROJECT_ID=${PROJECT_ID}
GCS_BUCKET_NAME=${BUCKET_NAME}
# GCS_CREDENTIALS_PATH is NOT set - will use Application Default Credentials

# Redis Configuration
UPSTASH_REDIS_REST_URL=${REDIS_URL}
UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}
EOF

echo "✅ Created: worker/.env"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Setup Complete! 🎉                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration Summary:"
echo "  • Storage: Google Cloud Storage (Application Default Credentials)"
echo "  • Project: $PROJECT_ID"
echo "  • Bucket: $BUCKET_NAME"
echo "  • Auth Method: Your Google account ($USER_EMAIL)"
echo ""
echo "Next steps:"
echo ""
echo "1. Install/update dependencies:"
echo "   → npm install"
echo "   → cd worker && npm install && cd .."
echo ""
echo "2. Restart the Next.js server:"
echo "   → Stop current server (Ctrl+C)"
echo "   → Run: npm run dev"
echo ""
echo "3. Start the worker (in a new terminal):"
echo "   → cd worker"
echo "   → npm run dev"
echo ""
echo "4. Open: http://localhost:3000"
echo "   → Yellow 'Demo Mode' banner should be GONE"
echo "   → Upload and export should work with GCS!"
echo ""
echo "Note: This method uses your personal Google credentials."
echo "For production, use service account keys instead."
echo ""
