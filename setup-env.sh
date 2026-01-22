#!/bin/bash

# NV Video Clipper - Environment Setup Helper
# This script helps you configure your .env files with cloud credentials

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         NV Video Clipper - Cloud Setup Helper                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will help you configure your environment variables."
echo "Have your Cloudflare R2 and Upstash Redis credentials ready!"
echo ""

# Function to read input with default value
read_input() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists."
    read -p "Do you want to overwrite it? (y/n): " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Aborted. Your existing .env file was not modified."
        exit 0
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PART 1: Cloudflare R2 Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Get these from: https://dash.cloudflare.com → R2 → Manage API Tokens"
echo ""

R2_ACCOUNT_ID=$(read_input "R2 Account ID (32 chars)" "")
R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID=$(read_input "R2 Access Key ID" "")
R2_SECRET_ACCESS_KEY=$(read_input "R2 Secret Access Key" "")
R2_BUCKET_NAME=$(read_input "R2 Bucket Name" "nv-video-clipper")
R2_PUBLIC_URL="https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PART 2: Upstash Redis Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Get these from: https://console.upstash.com → Your Database → REST API"
echo ""

UPSTASH_REDIS_REST_URL=$(read_input "Upstash Redis REST URL (https://...upstash.io)" "")
UPSTASH_REDIS_REST_TOKEN=$(read_input "Upstash Redis REST Token" "")

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PART 3: Next.js Configuration"
echo "═══════════════════════════════════════════════════════════════"
echo ""

NEXT_PUBLIC_APP_URL=$(read_input "App URL" "http://localhost:3000")

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Creating .env files..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create main .env file
cat > .env << EOF
# Cloudflare R2 Configuration
R2_ENDPOINT=${R2_ENDPOINT}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET_NAME=${R2_BUCKET_NAME}
R2_PUBLIC_URL=${R2_PUBLIC_URL}

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}

# Next.js
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
EOF

echo "✅ Created: .env"

# Create worker .env file
cat > worker/.env << EOF
# Cloudflare R2 Configuration
R2_ENDPOINT=${R2_ENDPOINT}
R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
R2_BUCKET_NAME=${R2_BUCKET_NAME}

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
EOF

echo "✅ Created: worker/.env"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     Setup Complete! 🎉                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Restart the Next.js server:"
echo "   → Stop current server (Ctrl+C)"
echo "   → Run: npm run dev"
echo ""
echo "2. Start the worker (in a new terminal):"
echo "   → cd worker"
echo "   → npm run dev"
echo ""
echo "3. Open: http://localhost:3000"
echo "   → Yellow 'Demo Mode' banner should be GONE"
echo "   → Upload and export should work!"
echo ""
echo "Need help? See CLOUD_SETUP.md for detailed instructions."
echo ""
