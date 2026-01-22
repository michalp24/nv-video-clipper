#!/bin/bash

# NV Video Clipper - Local Storage Setup (No Cloud Required!)

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    Setting up Local Storage Mode (No Cloud Accounts!)         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Create main .env file
echo "Creating .env file..."
cat > .env << 'EOF'
STORAGE_MODE=local
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo "✅ Created .env"

# Create worker .env file
echo "Creating worker/.env file..."
cat > worker/.env << 'EOF'
STORAGE_MODE=local
EOF

echo "✅ Created worker/.env"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Local Storage Mode Configured! 🎉                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  • Storage: Local filesystem (project/storage/ folder)"
echo "  • Queue: SQLite (project/storage/queue.db)"
echo "  • No cloud accounts needed!"
echo ""
echo "Next steps:"
echo ""
echo "1. Restart Next.js (in current terminal if running):"
echo "   → Press Ctrl+C to stop"
echo "   → Run: npm run dev"
echo ""
echo "2. Start worker (in NEW terminal):"
echo "   → cd worker"
echo "   → npm run dev"
echo ""
echo "3. Open: http://localhost:3000"
echo "   → Upload video → Trim → Export → Download!"
echo ""
echo "Files will be stored in: storage/ folder"
echo ""
