#!/bin/bash

# NV Video Clipper - Google Cloud Storage Setup Helper

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    NV Video Clipper - Google Cloud Storage Setup Helper       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will configure your .env files for Google Cloud Storage."
echo ""

# Check if credentials file exists
if [ ! -f "gcs-credentials.json" ]; then
    echo "⚠️  GCS credentials file not found!"
    echo ""
    echo "Please download your service account JSON key from:"
    echo "https://console.cloud.google.com → IAM & Admin → Service Accounts"
    echo ""
    echo "Then move it to this directory and name it: gcs-credentials.json"
    echo ""
    read -p "Press Enter when you have the file ready, or Ctrl+C to cancel..."
    
    if [ ! -f "gcs-credentials.json" ]; then
        echo "❌ Still can't find gcs-credentials.json. Exiting."
        exit 1
    fi
fi

echo "✓ Found gcs-credentials.json"
echo ""

# Extract project ID from credentials file
PROJECT_ID=$(grep -o '"project_id": *"[^"]*"' gcs-credentials.json | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not extract project_id from gcs-credentials.json"
    exit 1
fi

echo "✓ Detected Project ID: $PROJECT_ID"
echo ""

# Get bucket name
read -p "Enter your GCS bucket name (e.g., nv-video-clipper-yourname): " BUCKET_NAME

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Bucket name cannot be empty"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Redis Configuration (still needed for job queue)"
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
echo "  Creating .env files..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create main .env file
cat > .env << EOF
# Google Cloud Storage Configuration
GCS_PROJECT_ID=${PROJECT_ID}
GCS_BUCKET_NAME=${BUCKET_NAME}
GCS_CREDENTIALS_PATH=./gcs-credentials.json

# Redis Configuration
UPSTASH_REDIS_REST_URL=${REDIS_URL}
UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ Created: .env"

# Create worker .env file
cat > worker/.env << EOF
# Google Cloud Storage Configuration
GCS_PROJECT_ID=${PROJECT_ID}
GCS_BUCKET_NAME=${BUCKET_NAME}
GCS_CREDENTIALS_PATH=../gcs-credentials.json

# Redis Configuration
UPSTASH_REDIS_REST_URL=${REDIS_URL}
UPSTASH_REDIS_REST_TOKEN=${REDIS_TOKEN}
EOF

echo "✅ Created: worker/.env"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Google Cloud Storage Setup Complete! 🎉          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration Summary:"
echo "  • Storage: Google Cloud Storage"
echo "  • Project: $PROJECT_ID"
echo "  • Bucket: $BUCKET_NAME"
echo "  • Credentials: gcs-credentials.json"
echo ""
echo "Next steps:"
echo ""
echo "1. Install GCS dependencies:"
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
echo "Need help? See GCS_SETUP.md for detailed instructions."
echo ""
