#!/bin/bash

# Environmental Cache Backend Setup Script for Supabase
# This script helps you set up the backend quickly

echo "🚀 Environmental Cache Backend Setup for Supabase"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Google Cloud API Configuration
GOOGLE_CLOUD_API_KEY=AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y

# Server Configuration
PORT=3000
NODE_ENV=development
EOF
    echo "✅ Created .env file"
    echo "⚠️  Please update the .env file with your Supabase credentials"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create a Supabase project at https://supabase.com"
echo "2. Run the SQL schema from backend/database/supabase-schema.sql in your Supabase SQL Editor"
echo "3. Get your Supabase credentials from Settings > API"
echo "4. Update the .env file with your credentials"
echo "5. Start the server with: npm start"
echo ""
echo "🔗 Useful URLs:"
echo "- Health check: http://localhost:3000/api/health"
echo "- Statistics: http://localhost:3000/api/stats"
echo "- Cleanup: http://localhost:3000/api/cleanup"
echo ""
echo "📚 For more information, see backend/README.md"
